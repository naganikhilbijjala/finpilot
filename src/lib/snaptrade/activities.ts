import "server-only";
import { getSnaptrade } from "./client";
import { normalizeActivity } from "./normalize";
import type { ActivityView } from "./types";

const PAGE = 1000;
const TTL_MS = 10 * 60 * 1000;

// Normalized activities only, held in memory (never written to disk or DB).
const cache = new Map<string, { at: number; rows: ActivityView[] }>();

/** Read-only: all activities for one account, oldest-first, paginated. */
export async function fetchActivities(accountId: string): Promise<ActivityView[]> {
  const hit = cache.get(accountId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.rows;

  const snaptrade = getSnaptrade();
  const rows: ActivityView[] = [];

  for (let offset = 0; ; offset += PAGE) {
    const { data } = await snaptrade.accountInformation.getAccountActivities({
      accountId,
      offset,
      limit: PAGE,
    });
    const page = data.data ?? [];
    for (const a of page) {
      const view = normalizeActivity(a);
      if (view) rows.push(view);
    }
    if (page.length < PAGE) break;
  }

  rows.sort((a, b) => a.date.localeCompare(b.date));
  cache.set(accountId, { at: Date.now(), rows });
  return rows;
}
