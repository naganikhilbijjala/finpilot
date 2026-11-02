import "server-only";
import { memo } from "@/lib/cache/memo";
import { getSnaptrade } from "./client";
import { normalizeActivity } from "./normalize";
import { withRetry } from "./retry";
import type { ActivityView } from "./types";

const PAGE = 1000;
const TTL_MS = 10 * 60 * 1000;

// Normalized activities only, held in memory (never written to disk or DB).
// Concurrent requests for the same account share one fetch.
const cache = memo<ActivityView[]>(TTL_MS);

/** Read-only: all activities for one account, oldest-first, paginated. */
export function fetchActivities(accountId: string): Promise<ActivityView[]> {
  return cache.get(accountId, () => fetchActivitiesUncached(accountId));
}

async function fetchActivitiesUncached(accountId: string): Promise<ActivityView[]> {
  const snaptrade = getSnaptrade();
  const rows: ActivityView[] = [];

  for (let offset = 0; ; offset += PAGE) {
    const { data } = await withRetry(() =>
      snaptrade.accountInformation.getAccountActivities({ accountId, offset, limit: PAGE })
    );
    const page = data.data ?? [];
    for (const a of page) {
      const view = normalizeActivity(a);
      if (view) rows.push(view);
    }
    if (page.length < PAGE) break;
  }

  rows.sort((a, b) => a.date.localeCompare(b.date));
  return rows;
}
