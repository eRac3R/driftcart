import { lineTotal } from '@/domain/money';
import type { CartLine, Catalog, Paise } from '@/domain/types';

export type DriftReason = 'price_up' | 'price_down' | 'qty_capped' | 'sold_out' | 'delisted';

export type LineDiff = {
  productId: string;
  name: string;
  unit: string;
  before: { qty: number; pricePaise: Paise };
  after: { qty: number; pricePaise: Paise };
  reasons: DriftReason[];
};

export type Reconciliation = {
  diffs: LineDiff[];
  /** The cart rebuilt against the fresh catalog: drops dead lines, caps qty, adopts new prices. */
  lines: CartLine[];
  totalBefore: Paise;
  totalAfter: Paise;
  hasDrift: boolean;
};

/**
 * Compares what the shopper saw (possibly hours ago, offline) with the current catalog.
 * Pure and deterministic: the review screen and the tests both run on this.
 */
export function reconcile(cart: CartLine[], catalog: Catalog): Reconciliation {
  const diffs: LineDiff[] = [];
  const lines: CartLine[] = [];
  let totalBefore = 0;
  let totalAfter = 0;

  for (const line of cart) {
    const before = { qty: line.qty, pricePaise: line.pricePaiseSeen };
    totalBefore += lineTotal(before.qty, before.pricePaise);

    const product = catalog[line.productId];
    const reasons: DriftReason[] = [];
    let after: LineDiff['after'];

    if (!product) {
      reasons.push('delisted');
      after = { qty: 0, pricePaise: line.pricePaiseSeen };
    } else if (product.stock <= 0) {
      reasons.push('sold_out');
      after = { qty: 0, pricePaise: product.pricePaise };
    } else {
      if (product.pricePaise > line.pricePaiseSeen) reasons.push('price_up');
      if (product.pricePaise < line.pricePaiseSeen) reasons.push('price_down');
      const qty = Math.min(line.qty, product.stock);
      if (qty < line.qty) reasons.push('qty_capped');
      after = { qty, pricePaise: product.pricePaise };
    }

    diffs.push({
      productId: line.productId,
      name: product?.name ?? line.name,
      unit: product?.unit ?? line.unit,
      before,
      after,
      reasons,
    });

    if (after.qty > 0) {
      lines.push({ ...line, name: product!.name, unit: product!.unit, qty: after.qty, pricePaiseSeen: after.pricePaise });
      totalAfter += lineTotal(after.qty, after.pricePaise);
    }
  }

  return {
    diffs,
    lines,
    totalBefore,
    totalAfter,
    hasDrift: diffs.some((d) => d.reasons.length > 0),
  };
}
