// Account groups: whose money an account is and what it's for. Pages show one
// "view" at a time (a group, or a combination) so a friend's account never
// inflates your net worth and the emergency fund doesn't skew your allocation.

import type { SnapshotResult } from "@/lib/snaptrade/types";

export type GroupKind = "investments" | "emergency" | "managed";

export interface AccountAssignment {
  accountId: string;
  kind: GroupKind;
  /** Who the account is managed for; set only when kind is "managed". */
  managedFor: string | null;
}

export interface EmergencyTarget {
  monthlyExpenses: number;
  months: number;
}

export const DEFAULT_EMERGENCY_TARGET: EmergencyTarget = { monthlyExpenses: 1000, months: 3 };

export const GROUP_LABEL: Record<GroupKind, string> = {
  investments: "My investments",
  emergency: "Emergency fund",
  managed: "Managed for others",
};

/** "mine" = your investments + emergency fund; "all" includes managed accounts. */
export type ViewKey = string;

export interface View {
  key: ViewKey;
  label: string;
  kind: "mine" | "all" | GroupKind;
  managedFor?: string;
}

const slug = (name: string) =>
  name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "someone";

export const managedKey = (name: string) => `managed:${slug(name)}`;

/** Unassigned accounts count as your own investments. */
export function assignmentOf(accountId: string, assignments: AccountAssignment[]): AccountAssignment {
  return (
    assignments.find((a) => a.accountId === accountId) ?? {
      accountId,
      kind: "investments",
      managedFor: null,
    }
  );
}

/** The views worth offering for these accounts; never two that show the same thing. */
export function listViews(accountIds: string[], assignments: AccountAssignment[]): View[] {
  const mine = accountIds.map((id) => assignmentOf(id, assignments));
  const hasEmergency = mine.some((a) => a.kind === "emergency");
  const managed = new Map<string, string>();
  for (const a of mine) {
    if (a.kind === "managed" && a.managedFor) {
      const key = managedKey(a.managedFor);
      if (!managed.has(key)) managed.set(key, a.managedFor.trim());
    }
  }

  const views: View[] = [];
  if (hasEmergency) views.push({ key: "mine", label: "My money", kind: "mine" });
  views.push({ key: "investments", label: GROUP_LABEL.investments, kind: "investments" });
  if (hasEmergency) views.push({ key: "emergency", label: GROUP_LABEL.emergency, kind: "emergency" });
  for (const [key, name] of managed) {
    views.push({ key, label: name, kind: "managed", managedFor: name });
  }
  if (managed.size > 0) views.push({ key: "all", label: "Everything", kind: "all" });
  return views;
}

/**
 * Picks the requested view if it exists, else the page's default. "mine"
 * falls back to "investments" when there's no emergency fund (they're equal).
 */
export function resolveView(views: View[], requested: string | undefined, fallback: ViewKey): View {
  const find = (key: string | undefined) => views.find((v) => v.key === key);
  return find(requested) ?? find(fallback) ?? find("investments") ?? views[0];
}

export function inView(view: View, assignment: AccountAssignment): boolean {
  switch (view.kind) {
    case "all":
      return true;
    case "mine":
      return assignment.kind !== "managed";
    case "managed":
      return (
        assignment.kind === "managed" &&
        assignment.managedFor !== null &&
        managedKey(assignment.managedFor) === view.key
      );
    default:
      return assignment.kind === view.kind;
  }
}

export const viewPredicate = (view: View, assignments: AccountAssignment[]) => (accountId: string) =>
  inView(view, assignmentOf(accountId, assignments));

/** Keeps only the accounts (and load failures) a view includes. */
export function filterSnapshot(
  snapshot: SnapshotResult,
  include: (accountId: string) => boolean
): SnapshotResult {
  return {
    ...snapshot,
    accounts: snapshot.accounts.filter((s) => include(s.account.id)),
    failures: snapshot.failures.filter((f) => include(f.accountId)),
  };
}
