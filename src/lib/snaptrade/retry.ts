import { httpStatusOf } from "./errors";

// Pause before retrying a call that was rate limited or hit a server error.
export const RETRY_DELAY_MS = 800;

const retryable = (err: unknown) => {
  const status = httpStatusOf(err);
  return status === 429 || (status !== null && status >= 500);
};

/** Runs a SnapTrade call, retrying once on 429 or 5xx. */
export async function withRetry<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (err) {
    if (!retryable(err)) throw err;
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    return call();
  }
}
