import "server-only";
import { NO_REVENUE_GROWTH, revenueGrowth, type RevenueGrowth, type UsGaap } from "./revenue";
import { extractStatements, type Statements } from "./statements";

// SEC asks automated clients to identify themselves; no key is needed.
const USER_AGENT = "finpilot-personal-research (non-commercial)";

// Companies that re-registered under a new CIK (the new one has no history).
const CIK_OVERRIDES: Record<string, number> = {
  XOM: 34088,
};

export const cikFor = (symbol: string, cik: number) => CIK_OVERRIDES[symbol] ?? cik;

/** Throws on any failure so callers (and caches) never mistake an outage for "no data". */
async function fetchUsGaap(symbol: string, cik: number): Promise<UsGaap> {
  const id = String(cikFor(symbol, cik)).padStart(10, "0");
  const res = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${id}.json`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`EDGAR companyfacts ${res.status} for ${symbol}`);
  const body = (await res.json()) as { facts?: { "us-gaap"?: UsGaap } };
  return body.facts?.["us-gaap"] ?? {};
}

/** Null-filled on any failure: missing revenue history must never fail a stock's sync. */
export async function fetchRevenueGrowth(symbol: string, cik: number): Promise<RevenueGrowth> {
  try {
    return revenueGrowth(await fetchUsGaap(symbol, cik));
  } catch (err) {
    console.error(`EDGAR revenue growth failed for ${symbol}:`, err);
    return NO_REVENUE_GROWTH;
  }
}

export async function fetchStatements(symbol: string, cik: number): Promise<Statements> {
  return extractStatements(await fetchUsGaap(symbol, cik));
}
