import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNetworkState } from 'expo-network';
import { useEffect, useSyncExternalStore } from 'react';
import { useStore } from 'zustand';

import { seedCatalog } from '@/domain/seed-catalog';
import { MockShopServer } from '@/server/mock-server';

import { createCartStore, type CartStore } from './cart-store';

// One in-process "backend" per app session. The Lab tab drives its chaos knobs.
export const server = new MockShopServer(seedCatalog);

export const cartStore = createCartStore({ api: server, storage: AsyncStorage });

export function useCart<T>(selector: (s: CartStore) => T): T {
  return useStore(cartStore, selector);
}

export function useServer() {
  return useSyncExternalStore(server.subscribe, server.getSnapshot, server.getSnapshot);
}

/** Feeds the real device connectivity into the store, and does the first catalog sync. */
export function useConnectivitySync() {
  const network = useNetworkState();
  const online = network.isConnected !== false && network.isInternetReachable !== false;

  useEffect(() => {
    cartStore.getState().setDeviceOnline(online);
  }, [online]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await cartStore.persist.rehydrate();
      if (cancelled) return;
      const s = cartStore.getState();
      if (s.phase === 'queued') await s.checkout();
      else await s.refreshCatalog();
    })();
    return () => {
      cancelled = true;
    };
  }, []);
}
