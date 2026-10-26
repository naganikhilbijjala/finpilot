"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatMoney } from "@/lib/utils/format";
import type { AccountAgg } from "@/lib/snaptrade/aggregate";

// Fixed order so an account keeps its color on every page load.
const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#9333ea", "#0891b2", "#dc2626", "#64748b"];

export function AccountDonut({
  accounts,
  currency,
}: {
  accounts: AccountAgg[];
  currency: string | null;
}) {
  const data = accounts
    .filter((a) => a.totalValue > 0)
    .map((a) => ({ name: a.name, value: a.totalValue, pct: a.shareOfNetWorth }));

  if (data.length === 0) {
    return <p className="text-sm text-gray-500">No account balances to chart.</p>;
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-52 h-52 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="60%"
              outerRadius="100%"
              paddingAngle={1}
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => formatMoney(v, currency)} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full space-y-2 text-sm text-gray-900">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 min-w-0">
              <span
                className="h-3 w-3 rounded-sm shrink-0"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              <span className="truncate">{d.name}</span>
            </span>
            <span className="whitespace-nowrap shrink-0">
              {formatMoney(d.value, currency)}{" "}
              <span className="text-gray-500">({d.pct.toFixed(1)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
