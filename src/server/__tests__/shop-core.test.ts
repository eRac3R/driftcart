import { seedCatalog } from '@/domain/seed-catalog';
import type { OrderRequest } from '@/domain/types';
import { initialServerState, placeOrder } from '@/server/shop-core';

const order = (key: string, lines: OrderRequest['lines']): OrderRequest => ({
  idempotencyKey: key,
  lines,
});

describe('placeOrder', () => {
  it('commits an order, decrements stock and totals in paise', () => {
    const s0 = initialServerState(seedCatalog());
    const { state, result } = placeOrder(
      s0,
      order('k1', [
        { productId: 'milk', qty: 2, pricePaise: 2800 },
        { productId: 'eggs', qty: 1, pricePaise: 5400 },
      ]),
    );
    expect(result).toEqual({ ok: true, orderId: 'DC-1001', totalPaise: 11000 + 2500 + 400 });
    expect(state.products.milk.stock).toBe(38);
    expect(s0.products.milk.stock).toBe(40);
  });

  it('replays the same result for a repeated idempotency key without touching stock', () => {
    const req = order('k1', [{ productId: 'cheese', qty: 3, pricePaise: 9000 }]);
    const first = placeOrder(initialServerState(seedCatalog()), req);
    const second = placeOrder(first.state, req);
    expect(second.replayed).toBe(true);
    expect(second.result).toEqual(first.result);
    expect(second.state.products.cheese.stock).toBe(5);
    expect(second.state.nextOrderNo).toBe(1002);
  });

  it('rejects any price the shopper did not see, up or down', () => {
    const { result, state } = placeOrder(
      initialServerState(seedCatalog()),
      order('k1', [
        { productId: 'milk', qty: 1, pricePaise: 2500 },
        { productId: 'bread', qty: 1, pricePaise: 4500 },
      ]),
    );
    expect(result).toEqual({ ok: false, conflicts: [{ productId: 'milk', reason: 'price_changed' }] });
    expect(state.products.bread.stock).toBe(18);
  });

  it('rejects insufficient stock and delisted products', () => {
    const s0 = initialServerState(seedCatalog());
    delete s0.products.chips;
    const { result } = placeOrder(
      s0,
      order('k1', [
        { productId: 'coffee', qty: 7, pricePaise: 32000 },
        { productId: 'chips', qty: 1, pricePaise: 2000 },
      ]),
    );
    expect(result).toEqual({
      ok: false,
      conflicts: [
        { productId: 'coffee', reason: 'insufficient_stock' },
        { productId: 'chips', reason: 'delisted' },
      ],
    });
  });

  it('does not cache conflicts, so a fixed cart can succeed later', () => {
    const s0 = initialServerState(seedCatalog());
    const bad = placeOrder(s0, order('k1', [{ productId: 'milk', qty: 1, pricePaise: 1 }]));
    expect(bad.state.orders).toEqual({});
  });

  it('refuses malformed quantities', () => {
    const s0 = initialServerState(seedCatalog());
    expect(() => placeOrder(s0, order('k', [{ productId: 'milk', qty: 0, pricePaise: 2800 }]))).toThrow();
    expect(() => placeOrder(s0, order('k', []))).toThrow();
  });
});
