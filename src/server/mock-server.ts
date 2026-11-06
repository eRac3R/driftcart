import type { Catalog, OrderRequest, OrderResult, Paise, ShopApi } from '@/domain/types';
import { NetworkError } from '@/sync/errors';

import { initialServerState, placeOrder, type ServerState } from './shop-core';

export type Chaos = {
  latencyMs: number;
  /** Chance a request dies before the server sees it. */
  failRate: number;
  /** Chance the server commits the order but the reply is lost. The nasty case idempotency exists for. */
  lostReplyRate: number;
};

export type ServerSnapshot = {
  state: ServerState;
  chaos: Chaos;
  stats: { requests: number; dropped: number; lostReplies: number; replays: number };
};

type Options = {
  random?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

// structuredClone isn't guaranteed on every Hermes build; the data is plain JSON anyway.
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const calm: Chaos = { latencyMs: 250, failRate: 0, lostReplyRate: 0 };

/** An in-process stand-in for the shop backend, with knobs for breaking it on purpose. */
export class MockShopServer implements ShopApi {
  private snapshot: ServerSnapshot;
  private listeners = new Set<() => void>();
  private random: () => number;
  private sleep: (ms: number) => Promise<void>;

  constructor(
    private readonly seed: () => Catalog,
    opts: Options = {},
  ) {
    this.random = opts.random ?? Math.random;
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.snapshot = this.fresh(calm);
  }

  private fresh(chaos: Chaos): ServerSnapshot {
    return {
      state: initialServerState(this.seed()),
      chaos,
      stats: { requests: 0, dropped: 0, lostReplies: 0, replays: 0 },
    };
  }

  // useSyncExternalStore plumbing, so the Lab screen re-renders on server changes.
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  getSnapshot = () => this.snapshot;

  private update(fn: (s: ServerSnapshot) => ServerSnapshot) {
    this.snapshot = fn(this.snapshot);
    this.listeners.forEach((l) => l());
  }

  private updateStats(key: keyof ServerSnapshot['stats']) {
    this.update((s) => ({ ...s, stats: { ...s.stats, [key]: s.stats[key] + 1 } }));
  }

  private async enter() {
    this.updateStats('requests');
    await this.sleep(this.snapshot.chaos.latencyMs);
    if (this.random() < this.snapshot.chaos.failRate) {
      this.updateStats('dropped');
      throw new NetworkError('Request timed out');
    }
  }

  async getCatalog(): Promise<Catalog> {
    await this.enter();
    return clone(this.snapshot.state.products);
  }

  async placeOrder(req: OrderRequest): Promise<OrderResult> {
    await this.enter();
    const { state, result, replayed } = placeOrder(this.snapshot.state, req);
    this.update((s) => ({ ...s, state }));
    if (replayed) this.updateStats('replays');
    if (result.ok && !replayed && this.random() < this.snapshot.chaos.lostReplyRate) {
      this.updateStats('lostReplies');
      throw new NetworkError('Connection reset after send');
    }
    return clone(replayed && result.ok ? { ...result, replayed } : result);
  }

  // Admin knobs used by the Lab screen and the tests.
  setChaos(chaos: Partial<Chaos>) {
    this.update((s) => ({ ...s, chaos: { ...s.chaos, ...chaos } }));
  }

  private patchProduct(id: string, patch: { pricePaise?: Paise; stock?: number }) {
    this.update((s) => {
      const p = s.state.products[id];
      if (!p) return s;
      const products = { ...s.state.products, [id]: { ...p, ...patch } };
      return { ...s, state: { ...s.state, products } };
    });
  }

  setPrice(id: string, pricePaise: Paise) {
    this.patchProduct(id, { pricePaise: Math.max(100, Math.round(pricePaise)) });
  }

  setStock(id: string, stock: number) {
    this.patchProduct(id, { stock: Math.max(0, Math.floor(stock)) });
  }

  delist(id: string) {
    this.update((s) => {
      const { [id]: _removed, ...products } = s.state.products;
      return { ...s, state: { ...s.state, products } };
    });
  }

  /** Simulates the hour you spent in a lift: prices move, things sell out. */
  drift(ids: string[]) {
    const [first, second, third, fourth] = ids;
    const p = this.snapshot.state.products;
    if (first && p[first]) this.setPrice(first, p[first].pricePaise * 1.2);
    if (second && p[second]) this.setStock(second, 0);
    if (third && p[third]) this.setStock(third, 1);
    if (fourth && p[fourth]) this.setPrice(fourth, p[fourth].pricePaise * 0.85);
  }

  reset() {
    this.update((s) => this.fresh(s.chaos));
  }
}
