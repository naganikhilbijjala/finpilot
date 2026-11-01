import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_EMERGENCY_TARGET,
  type AccountAssignment,
  type EmergencyTarget,
  type GroupKind,
} from "./groups";

export interface GroupSettings {
  assignments: AccountAssignment[];
  target: EmergencyTarget;
  /** False when the account_groups migration hasn't been applied yet. */
  available: boolean;
}

const KINDS: GroupKind[] = ["investments", "emergency", "managed"];

/** Never throws: a missing table or outage means "nothing grouped yet". */
export async function getGroupSettings(): Promise<GroupSettings> {
  const fallback = { assignments: [], target: DEFAULT_EMERGENCY_TARGET, available: false };
  try {
    const supabase = await createClient();
    const [groups, settings] = await Promise.all([
      supabase.from("account_groups").select("account_id, kind, managed_for"),
      supabase
        .from("portfolio_settings")
        .select("emergency_monthly_expenses, emergency_months")
        .maybeSingle(),
    ]);
    if (groups.error) throw groups.error;
    if (settings.error) throw settings.error;

    const assignments = (groups.data ?? []).flatMap((r): AccountAssignment[] =>
      KINDS.includes(r.kind as GroupKind)
        ? [
            {
              accountId: r.account_id as string,
              kind: r.kind as GroupKind,
              managedFor: r.kind === "managed" ? ((r.managed_for as string | null)?.trim() ?? null) : null,
            },
          ]
        : []
    );
    const monthly = Number(settings.data?.emergency_monthly_expenses);
    const months = Number(settings.data?.emergency_months);
    return {
      assignments,
      target: {
        monthlyExpenses: Number.isFinite(monthly) && settings.data ? monthly : DEFAULT_EMERGENCY_TARGET.monthlyExpenses,
        months: Number.isFinite(months) && months > 0 ? months : DEFAULT_EMERGENCY_TARGET.months,
      },
      available: true,
    };
  } catch (err) {
    console.error("Loading account groups failed:", err);
    return fallback;
  }
}
