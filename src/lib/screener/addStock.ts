import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchRevenueGrowth, lookupCik } from "./edgar";
import { fetchFundamentals, fetchProfile, ProviderLimitError, RESTRICTED } from "./provider";
import { toSector } from "./sectors";
import type { Constituent } from "./sp500";
import { findConstituent, looksLikeTicker, normalizeSymbol } from "./symbols";
import { MAX_CUSTOM, PRESET_UNIVERSE } from "./universe";

export type AddResult =
  | { ok: true; stock: Constituent; alreadyHad: boolean }
  | { ok: false; status: number; message: string };

const fail = (status: number, message: string): AddResult => ({ ok: false, status, message });

/** Validates a ticker against Finnhub, fetches its data, and adds it to the universe. */
export async function addStock(rawSymbol: string, universe: Constituent[]): Promise<AddResult> {
  const symbol = normalizeSymbol(rawSymbol);
  if (!looksLikeTicker(symbol)) return fail(400, `"${rawSymbol.trim()}" doesn't look like a stock ticker.`);

  const existing = findConstituent(symbol, universe);
  if (existing) return { ok: true, stock: existing, alreadyHad: true };

  if (universe.length - PRESET_UNIVERSE.length >= MAX_CUSTOM) {
    return fail(409, `Your list is full. The most you can add by hand is ${MAX_CUSTOM} stocks.`);
  }

  try {
    const profile = await fetchProfile(symbol);
    if (!profile) {
      return fail(404, `Couldn't find ${symbol} as a US-listed stock. Funds and ETFs aren't supported.`);
    }

    const cik = await lookupCik(symbol);
    const stock: Constituent = { symbol, name: profile.name, sector: toSector(profile.industry), cik };

    const fundamentals = await fetchFundamentals(stock);
    if (fundamentals === RESTRICTED) {
      return fail(422, `${symbol} has no fundamentals from the data provider, so it can't be screened.`);
    }
    const data = { ...fundamentals, ...(await fetchRevenueGrowth(symbol, cik)) };

    const db = createAdminClient();
    const { error: customError } = await db
      .from("custom_stocks")
      .upsert({ symbol, name: stock.name, sector: stock.sector, cik });
    if (customError) throw customError;
    const { error: dataError } = await db
      .from("stock_fundamentals")
      .upsert({ symbol, data, fetched_at: new Date().toISOString() });
    if (dataError) throw dataError;

    return { ok: true, stock, alreadyHad: false };
  } catch (err) {
    if (err instanceof ProviderLimitError) {
      return fail(429, "The data provider's rate limit is reached. Wait a minute and try again.");
    }
    console.error(`Adding ${symbol} failed:`, err);
    return fail(500, `Couldn't add ${symbol} right now.`);
  }
}
