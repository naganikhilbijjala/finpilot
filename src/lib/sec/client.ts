import "server-only";
import { userAgent } from "@/lib/screener/edgar";

// The SEC allows 10 requests a second per client. Capping how many run at once
// keeps a cold page (dozens of company lookups) comfortably under that.
const MAX_IN_FLIGHT = 5;
let inFlight = 0;
const waiting: (() => void)[] = [];

async function slot<T>(run: () => Promise<T>): Promise<T> {
  if (inFlight >= MAX_IN_FLIGHT) await new Promise<void>((resolve) => waiting.push(resolve));
  inFlight++;
  try {
    return await run();
  } finally {
    inFlight--;
    waiting.shift()?.();
  }
}

/** Fetches from sec.gov with the contact header the SEC requires; throws on any non-2xx. */
export function secFetch(url: string): Promise<Response> {
  return slot(async () => {
    const res = await fetch(url, {
      headers: { "User-Agent": userAgent(), Accept: "application/json, application/xml, text/xml" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`SEC ${res.status} for ${new URL(url).pathname}`);
    return res;
  });
}

export const hasSecAgent = () => Boolean(process.env.SEC_USER_AGENT?.trim());
