import { lineTotal } from './money';
import type { Paise } from './types';

export const FREE_DELIVERY_ABOVE: Paise = 19900;
export const DELIVERY_FEE: Paise = 2500;
export const HANDLING_FEE: Paise = 400;

export type Bill = {
  itemTotal: Paise;
  deliveryFee: Paise;
  handlingFee: Paise;
  toPay: Paise;
};

/** One bill function for the cart screen and the server, so the number shown is the number charged. */
export function billFor(lines: { qty: number; pricePaise: Paise }[]): Bill {
  const itemTotal = lines.reduce((n, l) => n + lineTotal(l.qty, l.pricePaise), 0);
  const deliveryFee = itemTotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
  const handlingFee = HANDLING_FEE;
  return { itemTotal, deliveryFee, handlingFee, toPay: itemTotal + deliveryFee + handlingFee };
}
