import "server-only";
import { NO_REVENUE_GROWTH, revenueGrowth, type RevenueGrowth, type UsGaap } from "./revenue";

// SEC asks automated clients to identify themselves; no key is needed.
const USER_AGENT = "finpilot-personal-research (non-commercial)";

// Companies that re-registered under a new CIK (the new one has no history).
const CIK_OVERRIDES: Record<string, number> = {
  XOM: 34088,
};

export const cikFor = (symbol: string, cik: number) => CIK_OVERRIDES[symbol] ?? cik;

/** Null-filled on any failure: missing revenue history must never fail a stock's sync. */
export async function fetchRevenueGrowth(symbol: string, cik: number): Promise<RevenueGrowth> {
  const id = String(cikFor(symbol, cik)).padStart(10, "0");
  try {
    const res = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${id}.json`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`EDGAR companyfacts ${res.status} for ${symbol}`);
      return NO_REVENUE_GROWTH;
    }
    const body = (await res.json()) as { facts?: { "us-gaap"?: UsGaap } };
    return revenueGrowth(body.facts?.["us-gaap"] ?? {});
  } catch (err) {
    console.error(`EDGAR fetch failed for ${symbol}:`, err);
    return NO_REVENUE_GROWTH;
  }
}
