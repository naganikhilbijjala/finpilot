import "server-only";
import { parseTickerMap } from "./cikmap";
import { NO_REVENUE_GROWTH, revenueGrowth, type RevenueGrowth, type UsGaap } from "./revenue";
import { extractStatements, type Statements } from "./statements";

// The SEC asks automated clients to identify themselves with a contact. Set
// SEC_USER_AGENT (e.g. "finpilot you@example.com") in the environment; the
// plain name below is accepted by data.sec.gov but not by www.sec.gov.
const userAgent = () =>
  process.env.SEC_USER_AGENT?.trim() || "finpilot-personal-research (non-commercial)";

// Companies that re-registered under a new CIK (the new one has no history).
const CIK_OVERRIDES: Record<string, number> = {
  XOM: 34088,
};

export const cikFor = (symbol: string, cik: number) => CIK_OVERRIDES[symbol] ?? cik;

export class NoCikError extends Error {}

const TICKER_MAP_TTL = 24 * 60 * 60 * 1000;
const FAILURE_TTL = 10 * 60 * 1000;
let tickerMap: { at: number; map: Map<string, number> } | null = null;

/**
 * Ticker -> CIK from the SEC's ticker file. Needs SEC_USER_AGENT: without a
 * contact the www.sec.gov host refuses us, so we don't ask.
 */
export async function lookupCik(symbol: string): Promise<number | null> {
  if (!process.env.SEC_USER_AGENT?.trim()) return null;

  const now = Date.now();
  if (!tickerMap || now - tickerMap.at > (tickerMap.map.size ? TICKER_MAP_TTL : FAILURE_TTL)) {
    let map = new Map<string, number>();
    try {
      const res = await fetch("https://www.sec.gov/files/company_tickers.json", {
        headers: { "User-Agent": userAgent(), Accept: "application/json" },
        cache: "no-store",
      });
      if (res.ok) map = parseTickerMap(await res.json());
      else console.error(`SEC ticker file ${res.status}`);
    } catch (err) {
      console.error("SEC ticker file failed:", err);
    }
    tickerMap = { at: now, map };
  }
  return tickerMap.map.get(symbol) ?? null;
}

async function resolveCik(symbol: string, cik: number | null): Promise<number | null> {
  const known = cik ?? (await lookupCik(symbol));
  return known === null ? null : cikFor(symbol, known);
}

/** Throws on any failure so callers (and caches) never mistake an outage for "no data". */
async function fetchUsGaap(symbol: string, cik: number): Promise<UsGaap> {
  const id = String(cik).padStart(10, "0");
  const res = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${id}.json`, {
    headers: { "User-Agent": userAgent(), Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`EDGAR companyfacts ${res.status} for ${symbol}`);
  const body = (await res.json()) as { facts?: { "us-gaap"?: UsGaap } };
  return body.facts?.["us-gaap"] ?? {};
}

/** Null-filled on any failure: missing revenue history must never fail a stock's sync. */
export async function fetchRevenueGrowth(symbol: string, cik: number | null): Promise<RevenueGrowth> {
  try {
    const id = await resolveCik(symbol, cik);
    return id === null ? NO_REVENUE_GROWTH : revenueGrowth(await fetchUsGaap(symbol, id));
  } catch (err) {
    console.error(`EDGAR revenue growth failed for ${symbol}:`, err);
    return NO_REVENUE_GROWTH;
  }
}

/** Throws NoCikError when the company's SEC number can't be found (and so isn't cached as "empty"). */
export async function fetchStatements(symbol: string, cik: number | null): Promise<Statements> {
  const id = await resolveCik(symbol, cik);
  if (id === null) throw new NoCikError(symbol);
  return extractStatements(await fetchUsGaap(symbol, id));
}
