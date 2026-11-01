"use client";

import { useActionState, useState } from "react";
import { saveAccountGroups, type SaveState } from "@/app/(dashboard)/settings/accounts/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { AccountAssignment, EmergencyTarget, GroupKind } from "@/lib/groups/groups";
import { formatMoney } from "@/lib/utils/format";

export interface AccountRow {
  id: string;
  name: string;
  detail: string;
  value: number | null;
  currency: string | null;
}

const KIND_OPTIONS: { value: GroupKind; label: string; hint: string }[] = [
  { value: "investments", label: "My investments", hint: "Counted in your net worth, allocation and performance" },
  { value: "emergency", label: "Emergency fund", hint: "Counted in net worth, kept out of allocation and performance" },
  { value: "managed", label: "Managed for someone", hint: "Not your money: shown only in that person's view" },
];

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40";

export function AccountGroupsForm({
  accounts,
  assignments,
  target,
}: {
  accounts: AccountRow[];
  assignments: AccountAssignment[];
  target: EmergencyTarget;
}) {
  const [state, action, pending] = useActionState<SaveState | null, FormData>(saveAccountGroups, null);
  const [kinds, setKinds] = useState<Record<string, GroupKind>>(() =>
    Object.fromEntries(
      accounts.map((a) => [a.id, assignments.find((x) => x.accountId === a.id)?.kind ?? "investments"])
    )
  );
  const [monthly, setMonthly] = useState(String(target.monthlyExpenses));
  const [months, setMonths] = useState(String(target.months));
  const people = [...new Set(assignments.flatMap((a) => (a.managedFor ? [a.managedFor] : [])))];
  const goal = Number(monthly) * Number(months);

  return (
    <form action={action} className="space-y-6">
      <Card title="Accounts" subtitle="Choose what each account is for. New accounts start as My investments.">
        <ul className="divide-y divide-gray-100">
          {accounts.map((a) => {
            const kind = kinds[a.id];
            const current = assignments.find((x) => x.accountId === a.id);
            return (
              <li key={a.id} className="grid gap-3 py-4 md:grid-cols-[1fr_15rem_14rem] md:items-start">
                <input type="hidden" name="accountId" value={a.id} />
                <div className="min-w-0">
                  <div className="truncate font-medium text-gray-900">{a.name}</div>
                  <div className="text-xs text-gray-500">
                    {a.detail}
                    {a.value !== null && <span className="num"> · {formatMoney(a.value, a.currency)}</span>}
                  </div>
                </div>
                <div>
                  <label className="sr-only" htmlFor={`kind-${a.id}`}>
                    Group for {a.name}
                  </label>
                  <select
                    id={`kind-${a.id}`}
                    name={`kind:${a.id}`}
                    value={kind}
                    onChange={(e) => setKinds((k) => ({ ...k, [a.id]: e.target.value as GroupKind }))}
                    className={inputClass}
                  >
                    {KIND_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">{KIND_OPTIONS.find((o) => o.value === kind)?.hint}</p>
                </div>
                <div>
                  {kind === "managed" && (
                    <>
                      <label className="sr-only" htmlFor={`who-${a.id}`}>
                        Managed for
                      </label>
                      <input
                        id={`who-${a.id}`}
                        name={`managedFor:${a.id}`}
                        defaultValue={current?.managedFor ?? ""}
                        placeholder="Whose account? e.g. Ravi"
                        list="managed-people"
                        maxLength={60}
                        required
                        className={inputClass}
                      />
                    </>
                  )}
                </div>
              </li>
            );
          })}
          {accounts.length === 0 && <li className="py-4 text-sm text-gray-500">No brokerage accounts found.</li>}
        </ul>
        <datalist id="managed-people">
          {people.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </Card>

      <Card title="Emergency fund target" subtitle="Used for the progress bar on your dashboard">
        <div className="grid gap-4 sm:grid-cols-3 sm:items-end">
          <label className="block text-sm font-medium text-gray-700">
            Monthly expenses
            <div className="relative mt-1">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">$</span>
              <input
                name="monthlyExpenses"
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={monthly}
                onChange={(e) => setMonthly(e.target.value)}
                className={`${inputClass} pl-7`}
                required
              />
            </div>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Months to cover
            <input
              name="months"
              type="number"
              min={1}
              max={36}
              step={1}
              value={months}
              onChange={(e) => setMonths(e.target.value)}
              className={`${inputClass} mt-1`}
              required
            />
          </label>
          <div className="rounded-xl bg-gray-50 px-4 py-2.5 text-sm text-gray-600">
            Target{" "}
            <span className="num font-semibold text-gray-900">
              {Number.isFinite(goal) ? formatMoney(goal, "USD").replace(/\.00$/, "") : "—"}
            </span>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" loading={pending}>
          Save groups
        </Button>
        {state && (
          <p role="status" className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-600"}`}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
