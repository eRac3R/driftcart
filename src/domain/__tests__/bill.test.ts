import { billFor, DELIVERY_FEE, FREE_DELIVERY_ABOVE, HANDLING_FEE } from '@/domain/bill';

describe('billFor', () => {
  it('charges delivery and handling below the free-delivery threshold', () => {
    expect(billFor([{ qty: 2, pricePaise: 2800 }])).toEqual({
      itemTotal: 5600,
      deliveryFee: DELIVERY_FEE,
      handlingFee: HANDLING_FEE,
      toPay: 5600 + DELIVERY_FEE + HANDLING_FEE,
    });
  });

  it('makes delivery free at exactly the threshold', () => {
    const bill = billFor([{ qty: 1, pricePaise: FREE_DELIVERY_ABOVE }]);
    expect(bill.deliveryFee).toBe(0);
    expect(bill.toPay).toBe(FREE_DELIVERY_ABOVE + HANDLING_FEE);
  });
});
