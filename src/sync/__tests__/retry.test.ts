import { NetworkError, OfflineError } from '@/sync/errors';
import { backoffDelay, retry, type RetryOptions } from '@/sync/retry';

const opts = (over: Partial<RetryOptions> = {}): RetryOptions => ({
  maxAttempts: 4,
  baseDelayMs: 100,
  maxDelayMs: 1000,
  random: () => 1,
  sleep: async () => {},
  ...over,
});

describe('retry', () => {
  it('backs off exponentially up to the cap', () => {
    const o = opts();
    expect([1, 2, 3, 4, 5].map((a) => backoffDelay(a, o))).toEqual([100, 200, 400, 800, 1000]);
  });

  it('applies full jitter', () => {
    expect(backoffDelay(3, opts({ random: () => 0.5 }))).toBe(200);
  });

  it('retries network errors and returns the first success', async () => {
    const delays: number[] = [];
    let calls = 0;
    const result = await retry(
      async () => {
        if (++calls < 3) throw new NetworkError();
        return 'ok';
      },
      opts({ onRetry: (_a, d) => delays.push(d) }),
    );
    expect(result).toBe('ok');
    expect(calls).toBe(3);
    expect(delays).toEqual([100, 200]);
  });

  it('gives up after maxAttempts', async () => {
    let calls = 0;
    await expect(
      retry(async () => {
        calls++;
        throw new NetworkError();
      }, opts()),
    ).rejects.toBeInstanceOf(NetworkError);
    expect(calls).toBe(4);
  });

  it('never retries when offline or on non-network errors', async () => {
    for (const error of [new OfflineError(), new Error('bug')]) {
      let calls = 0;
      await expect(
        retry(async () => {
          calls++;
          throw error;
        }, opts()),
      ).rejects.toBe(error);
      expect(calls).toBe(1);
    }
  });
});
