import "server-only";
import { unstable_cache } from "next/cache";
import { memo } from "@/lib/cache/memo";
import { parseYahooChart, type PriceHistory } from "./parse";

const TTL_S = 6 * 60 * 60;

/** Yahoo uses a dash for share classes (BRK.B -> BRK-B). */
const toYahoo = (ticker: string) => ticker.replace(/\./g, "-");

// Public market data, so it goes in Next's persistent cache: it survives
// serverless cold starts instead of being refetched for every new instance.
const fetchFromYahoo = unstable_cache(
  async (ticker: string, fromDate: string): Promise<PriceHistory> => {
    const period1 = Math.floor(new Date(`${fromDate}T00:00:00Z`).getTime() / 1000) - 14 * 86400;
    const period2 = Math.floor(Date.now() / 1000) + 86400;
    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(toYahoo(ticker))}` +
      `?period1=${period1}&period2=${period2}&interval=1d&events=div,splits`;

    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" });
    if (!res.ok) throw new Error(`Price history request for ${ticker} failed (HTTP ${res.status})`);
    return parseYahooChart(await res.json(), ticker);
  },
  ["yahoo-price-history-v1"],
  { revalidate: TTL_S }
);

// In-memory layer on top: shares concurrent requests within an instance.
const cache = memo<PriceHistory>(TTL_S * 1000);

/** Daily prices and splits from `fromDate` (YYYY-MM-DD) to today. */
export function fetchPriceHistory(ticker: string, fromDate: string): Promise<PriceHistory> {
  return cache.get(`${ticker}|${fromDate}`, () => fetchFromYahoo(ticker, fromDate));
}

/** Fetches several tickers with limited concurrency; failures are returned, not thrown. */
export async function fetchPriceHistories(
  tickers: string[],
  fromDate: string,
  concurrency = 4
): Promise<{ histories: Map<string, PriceHistory>; failed: string[] }> {
  const histories = new Map<string, PriceHistory>();
  const failed: string[] = [];
  const queue = [...new Set(tickers)];

  await Promise.all(
    Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      for (let t = queue.shift(); t !== undefined; t = queue.shift()) {
        try {
          histories.set(t, await fetchPriceHistory(t, fromDate));
        } catch {
          failed.push(t);
        }
      }
    })
  );
  return { histories, failed };
}
