import "server-only";
import { normalizeFundamentals, type RawFundamentals } from "./normalize";
import type { Fundamentals } from "./types";

// All FMP access lives here so swapping providers touches one file.
const BASE = "https://financialmodelingprep.com/stable";

export class ProviderLimitError extends Error {}

export function isProviderConfigured(): boolean {
  return Boolean(process.env.FMP_API_KEY);
}

async function get(path: string, symbol: string, extra = ""): Promise<Record<string, unknown> | undefined> {
  const key = process.env.FMP_API_KEY;
  if (!key) throw new Error("FMP_API_KEY must be set in .env.local");

  const res = await fetch(`${BASE}/${path}?symbol=${encodeURIComponent(symbol)}${extra}&apikey=${key}`, {
    cache: "no-store",
  });
  // 429 = daily/minute quota. 402 = endpoint or symbol locked to a paid plan.
  if (res.status === 429) throw new ProviderLimitError("FMP daily call limit reached");
  if (res.status === 402) return undefined;
  if (!res.ok) throw new Error(`FMP ${path} failed for ${symbol}: ${res.status}`);

  const body: unknown = await res.json();
  return Array.isArray(body) ? (body[0] as Record<string, unknown> | undefined) : undefined;
}

/** Four calls per stock. */
export async function fetchFundamentals(symbol: string): Promise<Fundamentals> {
  const [profile, ratios, metrics, growth] = await Promise.all([
    get("profile", symbol),
    get("ratios-ttm", symbol),
    get("key-metrics-ttm", symbol),
    get("financial-growth", symbol, "&limit=1"),
  ]);
  const raw: RawFundamentals = { profile, ratios, metrics, growth };
  return normalizeFundamentals(symbol, raw);
}
