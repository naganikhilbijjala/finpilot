import "server-only";
import { getSnaptrade } from "./client";
import { memo } from "@/lib/cache/memo";
import { describeError } from "./errors";
import { withRetry } from "./retry";
import { normalizeAccount, normalizePositions } from "./normalize";
import type { AccountSnapshot, SnapshotFailure, SnapshotResult } from "./types";

/**
 * Read-only: list accounts, then fetch each account's holdings independently
 * so one failing account does not hide the others. Throws only if the account
 * list itself cannot be fetched.
 */
// A minute of caching keeps page-to-page navigation under SnapTrade's rate
// limit. A result with failed accounts is kept only briefly so they recover.
const FULL_TTL_MS = 60 * 1000;
const PARTIAL_TTL_MS = 10 * 1000;
const cache = memo<SnapshotResult>((v) => (v.failures.length ? PARTIAL_TTL_MS : FULL_TTL_MS));

// Accounts fetched at once (two calls each), so a page never bursts past
// SnapTrade's rate limit.
const ACCOUNT_CONCURRENCY = 3;

export function clearSnapshotCache() {
  cache.clear();
}

/** Concurrent callers (several sections of one page) share a single fetch. */
export function fetchSnapshot(): Promise<SnapshotResult> {
  return cache.get("snapshot", fetchSnapshotUncached);
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (let i = next++; i < items.length; i = next++) out[i] = await fn(items[i]);
    })
  );
  return out;
}

async function fetchSnapshotUncached(): Promise<SnapshotResult> {
  const snaptrade = getSnaptrade();
  const { data: accounts } =
    await snaptrade.accountInformation.listUserAccounts();

  const settled = await mapLimit(accounts, ACCOUNT_CONCURRENCY, async (account) => {
    const accountId = account.id;
    const [positions, balances] = await Promise.allSettled([
      withRetry(() => snaptrade.accountInformation.getAllAccountPositions({ accountId })),
      withRetry(() => snaptrade.accountInformation.getUserAccountBalance({ accountId })),
    ]);
    return { account, positions, balances };
  });

  const snapshots: AccountSnapshot[] = [];
  const failures: SnapshotFailure[] = [];

  for (const { account, positions, balances } of settled) {
    if (positions.status === "rejected") {
      failures.push({
        accountId: account.id,
        accountName: account.name?.trim() || account.institution_name,
        message: describeError(positions.reason),
      });
      continue;
    }
    // Cash is secondary: if only the balance call failed, still show positions.
    snapshots.push({
      account: normalizeAccount(
        account,
        balances.status === "fulfilled" ? balances.value.data : null
      ),
      positions: normalizePositions(positions.value.data.results),
    });
  }

  return { fetchedAt: new Date().toISOString(), accounts: snapshots, failures };
}
