import "server-only";
import { userAgent } from "@/lib/screener/edgar";

// The SEC allows 10 requests a second per client and blocks for several
// minutes past that. Requests are paced by start time (not just capped in
// flight: small files return in ~100 ms, so a concurrency cap alone still
// bursts far past 10/s), leaving headroom for a second server instance.
const MIN_INTERVAL_MS = 160; // ~6 requests a second
const MAX_IN_FLIGHT = 4;
const RETRIES = 2;
const DEFAULT_BACKOFF_MS = [2_000, 6_000];

let nextStart = 0;
let inFlight = 0;
const waiting: (() => void)[] = [];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The SEC refused because we asked too often; worth retrying after a pause. */
export class SecRateLimitError extends Error {
  constructor(
    path: string,
    readonly retryAfterSeconds: number
  ) {
    super(`The SEC is rate limiting requests (${path}); try again in a minute`);
  }
}

async function paced<T>(run: () => Promise<T>): Promise<T> {
  if (inFlight >= MAX_IN_FLIGHT) await new Promise<void>((resolve) => waiting.push(resolve));
  inFlight++;
  try {
    const now = Date.now();
    const start = Math.max(now, nextStart);
    nextStart = start + MIN_INTERVAL_MS;
    if (start > now) await sleep(start - now);
    return await run();
  } finally {
    inFlight--;
    waiting.shift()?.();
  }
}

const retryAfterMs = (res: Response, attempt: number) => {
  const header = Number(res.headers.get("retry-after"));
  return Number.isFinite(header) && header > 0 ? Math.min(header, 30) * 1000 : DEFAULT_BACKOFF_MS[attempt];
};

/** Fetches from sec.gov with the contact header the SEC requires; throws on any non-2xx. */
export async function secFetch(url: string): Promise<Response> {
  const path = new URL(url).pathname;
  for (let attempt = 0; ; attempt++) {
    const res = await paced(() =>
      fetch(url, {
        headers: { "User-Agent": userAgent(), Accept: "application/json, application/xml, text/xml" },
        cache: "no-store",
      })
    );
    if (res.ok) return res;
    if (res.status === 429 || res.status === 503) {
      const wait = retryAfterMs(res, attempt);
      if (attempt < RETRIES) {
        // Everyone on this instance waits too, so the pause actually lets the limit reset.
        nextStart = Math.max(nextStart, Date.now() + wait);
        await sleep(wait);
        continue;
      }
      throw new SecRateLimitError(path, 60);
    }
    throw new Error(`SEC ${res.status} for ${path}`);
  }
}

export const hasSecAgent = () => Boolean(process.env.SEC_USER_AGENT?.trim());
