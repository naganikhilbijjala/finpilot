import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchFundamentals, ProviderLimitError, RESTRICTED } from "./provider";
import { fetchRevenueGrowth } from "./edgar";
import { SP500, type Constituent } from "./sp500";

// Each stock costs one Finnhub call (60/minute free) and one SEC EDGAR call.
export const DEFAULT_BATCH = 40;
const CONCURRENCY = 4;

export interface SyncSummary {
  synced: number;
  /** Locked on the current data plan; stored as markers, not retried until stale. */
  restricted: number;
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
  const queue: Constituent[] = [...SP500]
    .sort((a, b) =>
      (fetchedAt.get(a.symbol) ?? "").localeCompare(fetchedAt.get(b.symbol) ?? "")
    )
    .slice(0, limit);

  let synced = 0;
  let restricted = 0;
  let hitLimit = false;
  const failed: string[] = [];

  for (let i = 0; i < queue.length && !hitLimit; i += CONCURRENCY) {
    await Promise.all(
      queue.slice(i, i + CONCURRENCY).map(async (constituent) => {
        const { symbol } = constituent;
        try {
          const result = await fetchFundamentals(constituent);
          // Revenue history is a second, best-effort source; it never fails the row.
          const data =
            result === RESTRICTED
              ? { symbol, restricted: true }
              : { ...result, ...(await fetchRevenueGrowth(symbol, constituent.cik)) };
          const { error: upsertError } = await db
            .from("stock_fundamentals")
            .upsert({ symbol, data, fetched_at: new Date().toISOString() });
          if (upsertError) throw upsertError;
          if (result === RESTRICTED) restricted++;
          else synced++;
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

  const remaining = SP500.filter((c) => !fetchedAt.has(c.symbol)).length - synced - restricted;
  return { synced, restricted, failed, hitLimit, remaining: Math.max(0, remaining) };
}
