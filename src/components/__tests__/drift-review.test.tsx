import { fireEvent, render, screen } from '@testing-library/react-native';

import { DriftReview } from '@/components/drift-review';
import { seedCatalog } from '@/domain/seed-catalog';
import { reconcile } from '@/sync/reconcile';

function drifted() {
  const catalog = seedCatalog();
  catalog.milk.pricePaise = 3360;
  catalog.coffee.stock = 0;
  return reconcile(
    [
      { productId: 'milk', name: 'Toned Milk 500 ml', unit: '1 pc', qty: 1, pricePaiseSeen: 2800 },
      { productId: 'coffee', name: 'Filter Coffee 200 g', unit: '1 pc', qty: 1, pricePaiseSeen: 32000 },
      { productId: 'eggs', name: 'Eggs, pack of 6', unit: '1 pc', qty: 1, pricePaiseSeen: 5400 },
    ],
    catalog,
  );
}

describe('<DriftReview />', () => {
  it('explains each change and splits price drift from lost items', async () => {
    await render(<DriftReview review={drifted()} onAccept={() => {}} onEdit={() => {}} />);

    expect(screen.getByText('2 of 3 items changed', { exact: false })).toBeOnTheScreen();
    expect(screen.getByText('Price ↑ ₹5.60')).toBeOnTheScreen();
    expect(screen.getByText('Sold out')).toBeOnTheScreen();
    expect(screen.getByText('No change')).toBeOnTheScreen();
    expect(screen.getByText('+₹5.60')).toBeOnTheScreen();
    expect(screen.getByText('−₹320')).toBeOnTheScreen();
    expect(screen.getByText('₹87.60')).toBeOnTheScreen();
  });

  it('places the order at the new total, or lets the shopper edit', async () => {
    const onAccept = jest.fn();
    const onEdit = jest.fn();
    await render(<DriftReview review={drifted()} onAccept={onAccept} onEdit={onEdit} />);

    await fireEvent.press(screen.getByText('Place order · ₹116.60'));
    await fireEvent.press(screen.getByText('Edit cart instead'));
    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('does not offer to place an order when everything is gone', async () => {
    const catalog = seedCatalog();
    catalog.coffee.stock = 0;
    const review = reconcile(
      [{ productId: 'coffee', name: 'Filter Coffee 200 g', unit: '1 pc', qty: 2, pricePaiseSeen: 32000 }],
      catalog,
    );
    await render(<DriftReview review={review} onAccept={() => {}} onEdit={() => {}} />);
    expect(screen.queryByTestId('accept-review')).toBeNull();
    expect(screen.getByText('Everything in your cart is gone. Sorry!')).toBeOnTheScreen();
  });
});
