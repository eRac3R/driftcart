// All money is integer paise: floats and currency don't mix.
export type Paise = number;

export type CategoryId = 'fruits-veg' | 'dairy' | 'snacks' | 'beverages' | 'staples';

export type Product = {
  id: string;
  name: string;
  category: CategoryId;
  /** Pack size shown under the name, e.g. "500 g". */
  unit: string;
  pricePaise: Paise;
  /** Printed price; pricePaise below this shows as a discount. */
  mrpPaise: Paise;
  stock: number;
};

export type Catalog = Record<string, Product>;

/** A cart line remembers the price the shopper actually saw when they added it. */
export type CartLine = {
  productId: string;
  name: string;
  unit: string;
  qty: number;
  pricePaiseSeen: Paise;
};

export type OrderLine = { productId: string; qty: number; pricePaise: Paise };

export type OrderRequest = {
  /** Same key for every retry of one checkout intent, so a lost reply can't create two orders. */
  idempotencyKey: string;
  lines: OrderLine[];
};

export type ConflictReason = 'price_changed' | 'insufficient_stock' | 'delisted';

export type OrderConflict = { productId: string; reason: ConflictReason };

export type OrderResult =
  | { ok: true; orderId: string; totalPaise: Paise; /** Server already had this key. */ replayed?: boolean }
  | { ok: false; conflicts: OrderConflict[] };

export interface ShopApi {
  getCatalog(): Promise<Catalog>;
  placeOrder(req: OrderRequest): Promise<OrderResult>;
}
