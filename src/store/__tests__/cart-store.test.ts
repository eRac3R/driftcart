import { seedCatalog } from '@/domain/seed-catalog';
import { MockShopServer } from '@/server/mock-server';
import { createCartStore } from '@/store/cart-store';

function setup(random: () => number = () => 0.99) {
  const server = new MockShopServer(seedCatalog, { random, sleep: async () => {} });
  let n = 0;
  const store = createCartStore({
    api: server,
    newKey: () => `key-${++n}`,
    retry: { sleep: async () => {}, random: () => 0 },
  });
  return { server, store, s: () => store.getState() };
}

async function ready() {
  const ctx = setup();
  await ctx.s().refreshCatalog();
  return ctx;
}

describe('cart store', () => {
  it('places an order online and clears the cart', async () => {
    const { s, server } = await ready();
    s().add('milk');
    s().add('milk');
    await s().checkout();
    expect(s().phase).toBe('placed');
    expect(s().lastOrder).toEqual({ orderId: 'DC-1001', totalPaise: 5600 + 2900 });
    expect(s().lines).toEqual([]);
    expect(server.getSnapshot().state.products.milk.stock).toBe(38);
  });

  it('queues checkout while offline and places it on reconnect', async () => {
    const { s, server } = await ready();
    s().add('eggs');
    s().setSimulatedOffline(true);
    await s().checkout();
    expect(s().phase).toBe('queued');
    expect(s().pendingKey).toBe('key-1');
    expect(server.getSnapshot().stats.requests).toBe(1); // only the initial catalog fetch

    s().setSimulatedOffline(false);
    await new Promise((r) => setTimeout(r, 0));
    expect(s().phase).toBe('placed');
    expect(server.getSnapshot().state.orders['key-1']).toBeDefined();
  });

  it('shows a review when the catalog drifted while offline', async () => {
    const { s, server } = await ready();
    s().add('milk');
    s().add('coffee');
    s().add('paneer');
    s().add('paneer');
    s().setSimulatedOffline(true);
    await s().checkout();

    server.drift(['milk', 'coffee', 'paneer']);
    s().setSimulatedOffline(false);
    await new Promise((r) => setTimeout(r, 0));

    expect(s().phase).toBe('review');
    const review = s().review!;
    expect(review.diffs.map((d) => d.reasons)).toEqual([['price_up'], ['sold_out'], ['qty_capped']]);
    expect(review.totalAfter).toBe(3360 + 9000);

    await s().acceptReview();
    expect(s().phase).toBe('placed');
    expect(s().lastOrder?.totalPaise).toBe(12360 + 2900);
    expect(s().pendingKey).toBeNull();
  });

  it('retries a lost reply with the same key and gets the original order back', async () => {
    const { s, server } = await ready();
    s().add('bread');
    // The first placeOrder commits, then its reply is "lost"; the retry must not double-order.
    const original = server.placeOrder.bind(server);
    let calls = 0;
    jest.spyOn(server, 'placeOrder').mockImplementation((req) => {
      server.setChaos({ lostReplyRate: ++calls === 1 ? 1 : 0 });
      return original(req);
    });
    await s().checkout();

    const snap = server.getSnapshot();
    expect(Object.keys(snap.state.orders)).toEqual(['key-1']);
    expect(snap.stats.lostReplies).toBe(1);
    expect(snap.stats.replays).toBe(1);
    expect(snap.state.products.bread.stock).toBe(17);
    expect(s().phase).toBe('placed');
    expect(s().log.some((e) => e.message.includes('no duplicate'))).toBe(true);
  });

  it('queues with the same key after retries are exhausted, and locks the cart', async () => {
    const { s, server } = await ready();
    s().add('juice');
    server.setChaos({ failRate: 1 });
    await s().checkout();
    expect(s().phase).toBe('queued');
    expect(s().pendingKey).toBe('key-1');
    expect(s().isLocked()).toBe(true);

    s().add('juice');
    expect(s().lines[0].qty).toBe(1);

    server.setChaos({ failRate: 0 });
    await s().checkout();
    expect(s().phase).toBe('placed');
    expect(Object.keys(server.getSnapshot().state.orders)).toEqual(['key-1']);
  });

  it('will not add more than the known stock', async () => {
    const { s } = await ready();
    for (let i = 0; i < 10; i++) s().add('coffee');
    expect(s().lines[0].qty).toBe(6);
  });
});
