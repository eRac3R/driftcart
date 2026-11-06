import { billFor } from '@/domain/bill';
import type { Catalog, OrderConflict, OrderRequest, OrderResult } from '@/domain/types';

export type ServerState = {
  products: Catalog;
  /** Successful results by idempotency key. Conflicts are not cached: the client retries with a new key. */
  orders: Record<string, Extract<OrderResult, { ok: true }>>;
  nextOrderNo: number;
};

export function initialServerState(products: Catalog): ServerState {
  return { products, orders: {}, nextOrderNo: 1001 };
}

function findConflicts(products: Catalog, req: OrderRequest): OrderConflict[] {
  const conflicts: OrderConflict[] = [];
  for (const line of req.lines) {
    const p = products[line.productId];
    if (!p) conflicts.push({ productId: line.productId, reason: 'delisted' });
    else if (p.pricePaise !== line.pricePaise)
      conflicts.push({ productId: line.productId, reason: 'price_changed' });
    else if (p.stock < line.qty)
      conflicts.push({ productId: line.productId, reason: 'insufficient_stock' });
  }
  return conflicts;
}

/**
 * Server-authoritative checkout. The client sends the prices it showed the shopper; any mismatch
 * is a conflict rather than a silent re-price, so nobody is charged a number they never saw.
 */
export function placeOrder(
  state: ServerState,
  req: OrderRequest,
): { state: ServerState; result: OrderResult; replayed: boolean } {
  const previous = state.orders[req.idempotencyKey];
  if (previous) return { state, result: previous, replayed: true };

  if (req.lines.length === 0 || req.lines.some((l) => !Number.isInteger(l.qty) || l.qty <= 0)) {
    throw new Error('Invalid order: lines must have positive integer quantities');
  }

  const conflicts = findConflicts(state.products, req);
  if (conflicts.length > 0) return { state, result: { ok: false, conflicts }, replayed: false };

  const products = { ...state.products };
  for (const line of req.lines) {
    const p = products[line.productId];
    products[line.productId] = { ...p, stock: p.stock - line.qty };
  }
  const totalPaise = billFor(req.lines).toPay;

  const result = { ok: true as const, orderId: `DC-${state.nextOrderNo}`, totalPaise };
  return {
    state: {
      products,
      orders: { ...state.orders, [req.idempotencyKey]: result },
      nextOrderNo: state.nextOrderNo + 1,
    },
    result,
    replayed: false,
  };
}
