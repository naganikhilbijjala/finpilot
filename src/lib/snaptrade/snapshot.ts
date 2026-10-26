import "server-only";
import { getSnaptrade } from "./client";
import { describeError } from "./errors";
import { normalizeAccount, normalizePositions } from "./normalize";
import type { AccountSnapshot, SnapshotFailure, SnapshotResult } from "./types";

/**
 * Read-only: list accounts, then fetch each account's holdings independently
 * so one failing account does not hide the others. Throws only if the account
 * list itself cannot be fetched.
 */
const TTL_MS = 60 * 1000;
let cached: { at: number; value: SnapshotResult } | null = null;

export function clearSnapshotCache() {
  cached = null;
}

export async function fetchSnapshot(): Promise<SnapshotResult> {
  // A minute of caching keeps page-to-page navigation under SnapTrade's rate limit.
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;
  const value = await fetchSnapshotUncached();
  cached = { at: Date.now(), value };
  return value;
}

async function fetchSnapshotUncached(): Promise<SnapshotResult> {
  const snaptrade = getSnaptrade();
  const { data: accounts } =
    await snaptrade.accountInformation.listUserAccounts();

  const settled = await Promise.all(
    accounts.map(async (account) => {
      const accountId = account.id;
      const [positions, balances] = await Promise.allSettled([
        snaptrade.accountInformation.getAllAccountPositions({ accountId }),
        snaptrade.accountInformation.getUserAccountBalance({ accountId }),
      ]);
      return { account, positions, balances };
    })
  );

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
