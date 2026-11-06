import type { ShopApi } from '@/domain/types';

import { OfflineError } from './errors';

/** Fails fast with OfflineError instead of letting requests hang when we know there's no network. */
export function gatedApi(api: ShopApi, isOnline: () => boolean): ShopApi {
  return {
    getCatalog: () => (isOnline() ? api.getCatalog() : Promise.reject(new OfflineError())),
    placeOrder: (req) => (isOnline() ? api.placeOrder(req) : Promise.reject(new OfflineError())),
  };
}
