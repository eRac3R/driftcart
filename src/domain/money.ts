import type { Paise } from './types';

export function formatPaise(paise: Paise): string {
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(paise);
  const rupees = Math.floor(abs / 100);
  const rest = abs % 100;
  return `${sign}₹${rupees}${rest ? `.${String(rest).padStart(2, '0')}` : ''}`;
}

export function lineTotal(qty: number, pricePaise: Paise): Paise {
  return qty * pricePaise;
}
