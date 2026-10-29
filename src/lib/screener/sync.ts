import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchFundamentals, ProviderLimitError } from "./provider";
import { SP500 } from "./sp500";

// FMP's free plan allows 250 calls/day and each stock costs 4.
export const DEFAULT_BATCH = 50;
const CONCURRENCY = 4;

export interface SyncSummary {
  synced: number;
  failed: string[];
  hitLimit: boolean;
  /** Stocks never fetched yet. */
  remaining: number;
}

/** Refreshes never-fetched symbols first, then the stalest ones. */
export async function syncBatch(limit = DEFAULT_BATCH): Promise<SyncSummary> {
  const db = createAdminClient();
  const { data: existing, error } = await db
    .from("stock_fundamentals")
    .select("symbol, fetched_at");
  if (error) throw error;

  const fetchedAt = new Map(existing.map((r) => [r.symbol as string, r.fetched_at as string]));
  const queue = SP500.map((c) => c.symbol)
    .sort((a, b) => (fetchedAt.get(a) ?? "").localeCompare(fetchedAt.get(b) ?? ""))
    .slice(0, limit);

  let synced = 0;
  let hitLimit = false;
  const failed: string[] = [];

  for (let i = 0; i < queue.length && !hitLimit; i += CONCURRENCY) {
    await Promise.all(
      queue.slice(i, i + CONCURRENCY).map(async (symbol) => {
        try {
          const data = await fetchFundamentals(symbol);
          const { error: upsertError } = await db
            .from("stock_fundamentals")
            .upsert({ symbol, data, fetched_at: new Date().toISOString() });
          if (upsertError) throw upsertError;
          synced++;
        } catch (err) {
          if (err instanceof ProviderLimitError) hitLimit = true;
          else {
            console.error(`Fundamentals sync failed for ${symbol}:`, err);
            failed.push(symbol);
          }
        }
      })
    );
  }

  const remaining = SP500.filter((c) => !fetchedAt.has(c.symbol)).length - synced;
  return { synced, failed, hitLimit, remaining: Math.max(0, remaining) };
}
