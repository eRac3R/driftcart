import type { Catalog, CategoryId, Product } from './types';

export const categories: { id: CategoryId; name: string }[] = [
  { id: 'fruits-veg', name: 'Fruits & Vegetables' },
  { id: 'dairy', name: 'Dairy, Bread & Eggs' },
  { id: 'snacks', name: 'Snacks & Sweets' },
  { id: 'beverages', name: 'Tea, Coffee & Drinks' },
  { id: 'staples', name: 'Atta, Rice & Dal' },
];

const rupees = (r: number) => Math.round(r * 100);

// Bengaluru-ish 2026 prices. Generic names on purpose: no real brands.
const products: Product[] = [
  { id: 'banana', name: 'Robusta Banana', category: 'fruits-veg', unit: '1 dozen', pricePaise: rupees(60), mrpPaise: rupees(72), stock: 12 },
  { id: 'tomato', name: 'Hybrid Tomato', category: 'fruits-veg', unit: '500 g', pricePaise: rupees(24), mrpPaise: rupees(30), stock: 30 },
  { id: 'onion', name: 'Onion', category: 'fruits-veg', unit: '1 kg', pricePaise: rupees(42), mrpPaise: rupees(50), stock: 30 },
  { id: 'potato', name: 'Potato', category: 'fruits-veg', unit: '1 kg', pricePaise: rupees(38), mrpPaise: rupees(45), stock: 30 },
  { id: 'apple', name: 'Shimla Apple', category: 'fruits-veg', unit: '4 pcs', pricePaise: rupees(129), mrpPaise: rupees(160), stock: 10 },
  { id: 'carrot', name: 'Ooty Carrot', category: 'fruits-veg', unit: '500 g', pricePaise: rupees(35), mrpPaise: rupees(42), stock: 20 },
  { id: 'spinach', name: 'Palak (Spinach)', category: 'fruits-veg', unit: '250 g', pricePaise: rupees(19), mrpPaise: rupees(25), stock: 15 },
  { id: 'lemon', name: 'Lemon', category: 'fruits-veg', unit: '4 pcs', pricePaise: rupees(20), mrpPaise: rupees(25), stock: 25 },

  { id: 'milk', name: 'Toned Milk', category: 'dairy', unit: '500 ml', pricePaise: rupees(28), mrpPaise: rupees(28), stock: 40 },
  { id: 'bread', name: 'Brown Bread', category: 'dairy', unit: '400 g', pricePaise: rupees(45), mrpPaise: rupees(50), stock: 18 },
  { id: 'eggs', name: 'Farm Fresh Eggs', category: 'dairy', unit: '6 pcs', pricePaise: rupees(54), mrpPaise: rupees(60), stock: 25 },
  { id: 'paneer', name: 'Malai Paneer', category: 'dairy', unit: '200 g', pricePaise: rupees(90), mrpPaise: rupees(99), stock: 8 },
  { id: 'curd', name: 'Fresh Curd', category: 'dairy', unit: '400 g', pricePaise: rupees(40), mrpPaise: rupees(45), stock: 20 },
  { id: 'butter', name: 'Salted Butter', category: 'dairy', unit: '100 g', pricePaise: rupees(58), mrpPaise: rupees(60), stock: 14 },

  { id: 'chips', name: 'Classic Salted Chips', category: 'snacks', unit: '90 g', pricePaise: rupees(20), mrpPaise: rupees(20), stock: 50 },
  { id: 'cookies', name: 'Choco Chip Cookies', category: 'snacks', unit: '150 g', pricePaise: rupees(45), mrpPaise: rupees(55), stock: 22 },
  { id: 'chocolate', name: 'Dark Chocolate 55%', category: 'snacks', unit: '100 g', pricePaise: rupees(110), mrpPaise: rupees(140), stock: 5 },
  { id: 'icecream', name: 'Strawberry Cone', category: 'snacks', unit: '1 pc', pricePaise: rupees(40), mrpPaise: rupees(45), stock: 10 },
  { id: 'noodles', name: 'Masala Instant Noodles', category: 'snacks', unit: '4 × 70 g', pricePaise: rupees(56), mrpPaise: rupees(60), stock: 60 },

  { id: 'tea', name: 'Masala Chai Tea', category: 'beverages', unit: '250 g', pricePaise: rupees(145), mrpPaise: rupees(170), stock: 16 },
  { id: 'coffee', name: 'Filter Coffee Beans', category: 'beverages', unit: '200 g', pricePaise: rupees(320), mrpPaise: rupees(380), stock: 6 },
  { id: 'juice', name: 'Orange Juice', category: 'beverages', unit: '1 L', pricePaise: rupees(110), mrpPaise: rupees(130), stock: 24 },

  { id: 'atta', name: 'Whole Wheat Atta', category: 'staples', unit: '5 kg', pricePaise: rupees(249), mrpPaise: rupees(290), stock: 15 },
  { id: 'rice', name: 'Basmati Rice', category: 'staples', unit: '1 kg', pricePaise: rupees(129), mrpPaise: rupees(165), stock: 20 },
  { id: 'dal', name: 'Masoor Dal', category: 'staples', unit: '1 kg', pricePaise: rupees(119), mrpPaise: rupees(140), stock: 20 },
];

export function seedCatalog(): Catalog {
  return Object.fromEntries(products.map((p) => [p.id, { ...p }]));
}
