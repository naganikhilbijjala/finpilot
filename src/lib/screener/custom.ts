import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Constituent } from "./sp500";
import { PRESET_UNIVERSE } from "./universe";

/** Stocks added by hand. Empty (not an error) if the table hasn't been created yet. */
export async function getCustomStocks(): Promise<Constituent[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("custom_stocks")
      .select("symbol, name, sector, cik")
      .order("added_at");
    if (error) throw error;
    return (data ?? []).map((r) => ({
      symbol: r.symbol as string,
      name: r.name as string,
      sector: r.sector as string,
      cik: r.cik === null ? null : Number(r.cik),
    }));
  } catch (err) {
    console.error("Loading custom stocks failed:", err);
    return [];
  }
}

export async function getUniverse(): Promise<Constituent[]> {
  return [...PRESET_UNIVERSE, ...(await getCustomStocks())];
}
