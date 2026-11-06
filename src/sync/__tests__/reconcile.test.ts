import { seedCatalog } from '@/domain/seed-catalog';
import type { CartLine, Catalog } from '@/domain/types';
import { reconcile } from '@/sync/reconcile';

const line = (productId: string, qty: number, pricePaiseSeen: number): CartLine => ({
  productId,
  name: productId,
  unit: '1 pc',
  qty,
  pricePaiseSeen,
});

describe('reconcile', () => {
  let catalog: Catalog;
  beforeEach(() => {
    catalog = seedCatalog();
  });

  it('reports no drift when nothing changed', () => {
    const r = reconcile([line('milk', 2, 2800)], catalog);
    expect(r.hasDrift).toBe(false);
    expect(r.totalBefore).toBe(5600);
    expect(r.totalAfter).toBe(5600);
    expect(r.diffs[0].reasons).toEqual([]);
  });

  it('flags price increases and decreases and adopts the new price', () => {
    catalog.milk.pricePaise = 3000;
    catalog.bread.pricePaise = 4000;
    const r = reconcile([line('milk', 1, 2800), line('bread', 1, 4500)], catalog);
    expect(r.diffs.map((d) => d.reasons)).toEqual([['price_up'], ['price_down']]);
    expect(r.lines.map((l) => l.pricePaiseSeen)).toEqual([3000, 4000]);
    expect(r.totalAfter).toBe(7000);
  });

  it('caps quantity to what is left in stock', () => {
    catalog.paneer.stock = 1;
    const r = reconcile([line('paneer', 3, 9000)], catalog);
    expect(r.diffs[0].reasons).toEqual(['qty_capped']);
    expect(r.lines[0].qty).toBe(1);
  });

  it('drops sold-out and delisted lines from the rebuilt cart', () => {
    catalog.coffee.stock = 0;
    delete catalog.chips;
    const r = reconcile([line('coffee', 1, 32000), line('chips', 2, 2000), line('eggs', 1, 5400)], catalog);
    expect(r.diffs.map((d) => d.reasons)).toEqual([['sold_out'], ['delisted'], []]);
    expect(r.lines.map((l) => l.productId)).toEqual(['eggs']);
    expect(r.totalBefore).toBe(32000 + 4000 + 5400);
    expect(r.totalAfter).toBe(5400);
  });

  it('can report a price change and a stock cap on the same line', () => {
    catalog.banana.pricePaise = 7000;
    catalog.banana.stock = 2;
    const r = reconcile([line('banana', 5, 6000)], catalog);
    expect(r.diffs[0].reasons).toEqual(['price_up', 'qty_capped']);
    expect(r.diffs[0].after).toEqual({ qty: 2, pricePaise: 7000 });
  });

  it('does not mutate its inputs', () => {
    const cart = [line('milk', 2, 2000)];
    const snapshot = JSON.stringify({ cart, catalog });
    reconcile(cart, catalog);
    expect(JSON.stringify({ cart, catalog })).toBe(snapshot);
  });
});
