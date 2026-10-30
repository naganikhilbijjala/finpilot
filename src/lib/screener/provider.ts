import "server-only";
import { hasMetrics, normalizeFundamentals, type FinnhubMetric } from "./normalize";
import type { Constituent } from "./sp500";
import type { Fundamentals } from "./types";

// All Finnhub access lives here so swapping providers touches one file.
const BASE = "https://finnhub.io/api/v1";

export class ProviderLimitError extends Error {}

/** The data plan has no fundamentals for this symbol. */
export const RESTRICTED = Symbol("restricted");

export function isProviderConfigured(): boolean {
  return Boolean(process.env.FINNHUB_API_KEY);
}

export interface StockProfile {
  name: string;
  industry: string | null;
}

/** Null for symbols Finnhub doesn't know as a stock (ETFs and funds come back empty). */
export async function fetchProfile(symbol: string): Promise<StockProfile | null> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) throw new Error("FINNHUB_API_KEY must be set in .env.local");

  const res = await fetch(`${BASE}/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${key}`, {
    cache: "no-store",
  });
  if (res.status === 429) throw new ProviderLimitError("Finnhub rate limit reached");
  if (!res.ok) throw new Error(`Finnhub profile failed for ${symbol}: ${res.status}`);

  const body = (await res.json()) as { name?: unknown; finnhubIndustry?: unknown };
  if (typeof body.name !== "string" || !body.name.trim()) return null;
  const industry = typeof body.finnhubIndustry === "string" ? body.finnhubIndustry : null;
  return { name: body.name.trim(), industry };
}

/** One call per stock. The free plan allows 60/minute. */
export async function fetchFundamentals(
  constituent: Constituent
): Promise<Fundamentals | typeof RESTRICTED> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) throw new Error("FINNHUB_API_KEY must be set in .env.local");

  const url = `${BASE}/stock/metric?symbol=${encodeURIComponent(constituent.symbol)}&metric=all&token=${key}`;
  const res = await fetch(url, { cache: "no-store" });

  if (res.status === 429) throw new ProviderLimitError("Finnhub rate limit reached");
  if (res.status === 403) return RESTRICTED;
  if (!res.ok) throw new Error(`Finnhub metric failed for ${constituent.symbol}: ${res.status}`);

  const body = (await res.json()) as { metric?: FinnhubMetric };
  if (!hasMetrics(body.metric)) return RESTRICTED;
  return normalizeFundamentals(constituent, body.metric);
}
