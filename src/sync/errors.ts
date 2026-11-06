/** A request that may or may not have reached the server. Safe to retry with the same idempotency key. */
export class NetworkError extends Error {
  constructor(message = 'Network request failed') {
    super(message);
    this.name = 'NetworkError';
  }
}

/** We know we're offline, so we never sent anything. Queue instead of retrying. */
export class OfflineError extends NetworkError {
  constructor() {
    super('Device is offline');
    this.name = 'OfflineError';
  }
}
