import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

import { formatPaise } from '@/domain/money';
import type { CartLine, Catalog, OrderRequest, ShopApi } from '@/domain/types';
import { NetworkError, OfflineError } from '@/sync/errors';
import { gatedApi } from '@/sync/gated-api';
import { reconcile, type Reconciliation } from '@/sync/reconcile';
import { retry, type RetryOptions } from '@/sync/retry';

export type Phase = 'idle' | 'submitting' | 'queued' | 'review' | 'placed';

export type SyncEvent = {
  id: number;
  at: number;
  tone: 'info' | 'ok' | 'warn' | 'error';
  message: string;
};

export type CartState = {
  catalog: Catalog;
  catalogFetchedAt: number | null;
  lines: CartLine[];
  deviceOnline: boolean;
  simulatedOffline: boolean;
  phase: Phase;
  /** Idempotency key for the current checkout intent. Survives retries, app restarts and offline queues. */
  pendingKey: string | null;
  /** True once any request with pendingKey may have reached the server. Locks the cart. */
  orderSent: boolean;
  review: Reconciliation | null;
  lastOrder: { orderId: string; totalPaise: number } | null;
  log: SyncEvent[];
};

export type CartActions = {
  isOnline: () => boolean;
  isLocked: () => boolean;
  add: (productId: string) => void;
  remove: (productId: string) => void;
  setDeviceOnline: (online: boolean) => void;
  setSimulatedOffline: (offline: boolean) => void;
  refreshCatalog: () => Promise<void>;
  checkout: () => Promise<void>;
  acceptReview: () => Promise<void>;
  editCart: () => void;
};

export type CartStore = CartState & CartActions;

export type CartDeps = {
  api: ShopApi;
  storage?: StateStorage;
  newKey?: () => string;
  now?: () => number;
  retry?: Partial<RetryOptions>;
};

const MAX_LOG = 60;

const defaultKey = () =>
  `ck_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

function memoryStorage(): StateStorage {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

export function createCartStore(deps: CartDeps) {
  const newKey = deps.newKey ?? defaultKey;
  const now = deps.now ?? Date.now;
  const retryOpts: RetryOptions = {
    maxAttempts: 4,
    baseDelayMs: 400,
    maxDelayMs: 4000,
    ...deps.retry,
  };
  let eventId = 0;

  return createStore<CartStore>()(
    persist(
      (set, get) => {
        const api = gatedApi(deps.api, () => get().isOnline());

        const log = (tone: SyncEvent['tone'], message: string) =>
          set((s) => ({
            log: [{ id: ++eventId, at: now(), tone, message }, ...s.log].slice(0, MAX_LOG),
          }));

        const withRetry = <T>(label: string, fn: () => Promise<T>) =>
          retry(fn, {
            ...retryOpts,
            onRetry: (attempt, delay, error) =>
              log('warn', `${label}: ${error.message}. Retry ${attempt} in ${delay} ms`),
          });

        const connectivityChanged = (wasOnline: boolean) => {
          const online = get().isOnline();
          if (online === wasOnline) return;
          if (!online) {
            log('warn', 'Offline. You can keep shopping; checkout will be queued.');
            return;
          }
          log('info', 'Back online. Syncing…');
          if (get().phase === 'queued') void get().checkout();
          else void get().refreshCatalog();
        };

        return {
          catalog: {},
          catalogFetchedAt: null,
          lines: [],
          deviceOnline: true,
          simulatedOffline: false,
          phase: 'idle',
          pendingKey: null,
          orderSent: false,
          review: null,
          lastOrder: null,
          log: [],

          isOnline: () => get().deviceOnline && !get().simulatedOffline,
          isLocked: () => get().phase === 'submitting' || get().orderSent,

          add: (productId) => {
            const { catalog, lines, phase } = get();
            const product = catalog[productId];
            if (!product || get().isLocked()) return;
            const existing = lines.find((l) => l.productId === productId);
            if ((existing?.qty ?? 0) >= product.stock) {
              log('warn', `Only ${product.stock} ${product.name} left`);
              return;
            }
            set({
              phase: phase === 'placed' ? 'idle' : phase,
              lines: existing
                ? lines.map((l) => (l === existing ? { ...l, qty: l.qty + 1 } : l))
                : [
                    ...lines,
                    {
                      productId,
                      name: product.name,
                      unit: product.unit,
                      qty: 1,
                      pricePaiseSeen: product.pricePaise,
                    },
                  ],
            });
          },

          remove: (productId) => {
            if (get().isLocked()) return;
            set((s) => ({
              lines: s.lines
                .map((l) => (l.productId === productId ? { ...l, qty: l.qty - 1 } : l))
                .filter((l) => l.qty > 0),
            }));
          },

          setDeviceOnline: (online) => {
            const wasOnline = get().isOnline();
            set({ deviceOnline: online });
            connectivityChanged(wasOnline);
          },

          setSimulatedOffline: (offline) => {
            const wasOnline = get().isOnline();
            set({ simulatedOffline: offline });
            connectivityChanged(wasOnline);
          },

          refreshCatalog: async () => {
            if (!get().isOnline()) return;
            try {
              const catalog = await withRetry('Catalog', () => api.getCatalog());
              set({ catalog, catalogFetchedAt: now() });
            } catch (error) {
              if (!(error instanceof OfflineError))
                log('error', `Couldn't refresh catalog: ${(error as Error).message}`);
            }
          },

          checkout: async () => {
            const start = get();
            if (start.phase === 'submitting' || start.lines.length === 0) return;
            const key = start.pendingKey ?? newKey();
            set({ pendingKey: key });

            if (!start.isOnline()) {
              set({ phase: 'queued' });
              log('warn', `Offline. Order queued with key ${key.slice(-6)}; it goes out when you reconnect.`);
              return;
            }

            set({ phase: 'submitting' });
            const req: OrderRequest = {
              idempotencyKey: key,
              lines: get().lines.map((l) => ({
                productId: l.productId,
                qty: l.qty,
                pricePaise: l.pricePaiseSeen,
              })),
            };

            try {
              const result = await withRetry('Checkout', () => {
                set({ orderSent: true });
                return api.placeOrder(req);
              });

              if (result.ok) {
                set({
                  phase: 'placed',
                  lines: [],
                  pendingKey: null,
                  orderSent: false,
                  lastOrder: { orderId: result.orderId, totalPaise: result.totalPaise },
                });
                if (result.replayed)
                  log('info', `Server already had key ${key.slice(-6)}: returned the original order, no duplicate.`);
                log('ok', `Order ${result.orderId} placed for ${formatPaise(result.totalPaise)}`);
                void get().refreshCatalog();
                return;
              }

              log('warn', `Server rejected the order: ${result.conflicts.length} item(s) changed while you were away`);
              const catalog = await withRetry('Catalog', () => api.getCatalog());
              set({
                catalog,
                catalogFetchedAt: now(),
                review: reconcile(get().lines, catalog),
                phase: 'review',
                pendingKey: null,
                orderSent: false,
              });
            } catch (error) {
              if (error instanceof NetworkError) {
                set({ phase: 'queued' });
                log(
                  'error',
                  error instanceof OfflineError
                    ? 'Lost connection. Order queued.'
                    : `Gave up after ${retryOpts.maxAttempts} tries. Order queued; the retry reuses key ${key.slice(-6)}.`,
                );
                return;
              }
              set({ phase: 'idle', orderSent: false });
              log('error', (error as Error).message);
            }
          },

          acceptReview: async () => {
            const review = get().review;
            if (!review) return;
            set({ lines: review.lines, review: null, phase: 'idle' });
            log('info', `Accepted changes. New item total ${formatPaise(review.totalAfter)}`);
            if (review.lines.length > 0) await get().checkout();
          },

          editCart: () => {
            const review = get().review;
            if (!review) return;
            set({ lines: review.lines, review: null, phase: 'idle' });
          },
        };
      },
      {
        name: 'driftcart',
        // The app calls persist.rehydrate() explicitly before its first sync, so ordering is deterministic.
        skipHydration: true,
        storage: createJSONStorage(() => deps.storage ?? memoryStorage()),
        partialize: (s) => ({
          catalog: s.catalog,
          catalogFetchedAt: s.catalogFetchedAt,
          lines: s.lines,
          simulatedOffline: s.simulatedOffline,
          phase: s.phase,
          pendingKey: s.pendingKey,
          orderSent: s.orderSent,
          review: s.review,
          lastOrder: s.lastOrder,
        }),
        // An app killed mid-request comes back with an order of unknown fate: queue it, same key.
        merge: (persisted, current) => {
          const p = persisted as Partial<CartState>;
          return { ...current, ...p, phase: p.phase === 'submitting' ? 'queued' : (p.phase ?? current.phase) };
        },
      },
    ),
  );
}
