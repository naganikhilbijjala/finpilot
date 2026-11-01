"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkOwner } from "@/lib/snaptrade/owner";
import { createClient } from "@/lib/supabase/server";

export interface SaveState {
  ok: boolean;
  message: string;
}

const Assignment = z
  .object({
    accountId: z.string().min(1).max(200),
    kind: z.enum(["investments", "emergency", "managed"]),
    managedFor: z.string().trim().max(60).nullable(),
  })
  .refine((a) => a.kind !== "managed" || (a.managedFor && a.managedFor.length > 0), {
    message: "Enter who each managed account belongs to",
  });

const Payload = z.object({
  assignments: z.array(Assignment).max(200),
  monthlyExpenses: z.coerce.number().min(0).max(10_000_000),
  months: z.coerce.number().int().min(1).max(36),
});

export async function saveAccountGroups(_prev: SaveState | null, formData: FormData): Promise<SaveState> {
  const owner = await checkOwner();
  if (!owner.ok) return { ok: false, message: owner.message };

  const ids = formData.getAll("accountId").map(String);
  const parsed = Payload.safeParse({
    assignments: ids.map((id) => {
      const kind = String(formData.get(`kind:${id}`) ?? "investments");
      const name = String(formData.get(`managedFor:${id}`) ?? "").trim();
      return { accountId: id, kind, managedFor: kind === "managed" ? name : null };
    }),
    monthlyExpenses: formData.get("monthlyExpenses"),
    months: formData.get("months"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form and try again" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You must be logged in" };

  const now = new Date().toISOString();
  const [groups, settings] = await Promise.all([
    parsed.data.assignments.length
      ? supabase.from("account_groups").upsert(
          parsed.data.assignments.map((a) => ({
            user_id: user.id,
            account_id: a.accountId,
            kind: a.kind,
            managed_for: a.managedFor,
            updated_at: now,
          }))
        )
      : Promise.resolve({ error: null }),
    supabase.from("portfolio_settings").upsert({
      user_id: user.id,
      emergency_monthly_expenses: parsed.data.monthlyExpenses,
      emergency_months: parsed.data.months,
      updated_at: now,
    }),
  ]);
  const error = groups.error ?? settings.error;
  if (error) {
    console.error("Saving account groups failed:", error);
    return {
      ok: false,
      message: /relation .* does not exist|schema cache/i.test(error.message)
        ? "The account_groups table doesn't exist yet. Run supabase/migrations/004_account_groups.sql in Supabase."
        : `Couldn't save: ${error.message}`,
    };
  }

  // Every brokerage page reads the groups.
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved. Every page now uses these groups." };
}
