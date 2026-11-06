import { NetworkError, OfflineError } from './errors';

export type RetryOptions = {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  random?: () => number;
  sleep?: (ms: number) => Promise<void>;
  onRetry?: (attempt: number, delayMs: number, error: NetworkError) => void;
};

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Exponential backoff with full jitter. Only NetworkErrors are retried, and never OfflineError. */
export function backoffDelay(attempt: number, opts: RetryOptions): number {
  const cap = Math.min(opts.maxDelayMs, opts.baseDelayMs * 2 ** (attempt - 1));
  return Math.round((opts.random ?? Math.random)() * cap);
}

export async function retry<T>(fn: (attempt: number) => Promise<T>, opts: RetryOptions): Promise<T> {
  const sleep = opts.sleep ?? defaultSleep;
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      const retryable = error instanceof NetworkError && !(error instanceof OfflineError);
      if (!retryable || attempt >= opts.maxAttempts) throw error;
      const delay = backoffDelay(attempt, opts);
      opts.onRetry?.(attempt, delay, error);
      await sleep(delay);
    }
  }
}
