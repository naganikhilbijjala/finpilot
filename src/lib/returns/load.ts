import "server-only";
import { describeError } from "@/lib/snaptrade/errors";
import { fetchActivities } from "@/lib/snaptrade/activities";
import { filterSnapshot } from "@/lib/groups/groups";
import { fetchSnapshot } from "@/lib/snaptrade/snapshot";
import type { SnapshotFailure } from "@/lib/snaptrade/types";
import { computeReturns, type AccountInput, type ReturnsResult } from "./compute";

export interface LoadedReturns {
  result: ReturnsResult;
  /** Accounts left out of every figure because some data couldn't be loaded. */
  failures: SnapshotFailure[];
}

/** Read-only: positions + full activity history per account (optionally only some accounts). */
export async function loadInputs(include?: (accountId: string) => boolean): Promise<{
  inputs: AccountInput[];
  failures: SnapshotFailure[];
}> {
  const all = await fetchSnapshot();
  const snapshot = include ? filterSnapshot(all, include) : all;
  const failures: SnapshotFailure[] = [...snapshot.failures];

  const histories = await Promise.allSettled(
    snapshot.accounts.map((s) => fetchActivities(s.account.id))
  );

  const inputs: AccountInput[] = [];
  histories.forEach((h, i) => {
    const { account, positions } = snapshot.accounts[i];
    if (h.status === "rejected") {
      failures.push({
        accountId: account.id,
        accountName: account.name,
        message: `Couldn't load history: ${describeError(h.reason)}`,
      });
      return;
    }
    inputs.push({
      id: account.id,
      name: account.name,
      totalValue: account.totalValue,
      positions,
      activities: h.value,
    });
  });
  return { inputs, failures };
}

export async function loadReturns(
  include?: (accountId: string) => boolean,
  totalName?: string
): Promise<LoadedReturns> {
  const { inputs, failures } = await loadInputs(include);
  return { result: computeReturns(inputs, new Date(), totalName), failures };
}
