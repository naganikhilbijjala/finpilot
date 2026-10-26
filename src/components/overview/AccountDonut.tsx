"use client";

import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from "recharts";
import { categoryColor } from "@/components/charts/theme";
import { formatMoney } from "@/lib/utils/format";
import type { AccountAgg } from "@/lib/snaptrade/aggregate";

// Recharts passes the full sector geometry to the active shape.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderActive = (props: any) => (
  <Sector {...props} outerRadius={props.outerRadius + 6} cornerRadius={6} />
);

export function AccountDonut({
  accounts,
  currency,
}: {
  accounts: AccountAgg[];
  currency: string | null;
}) {
  const [active, setActive] = useState<number | undefined>(undefined);
  const data = accounts
    .filter((a) => a.totalValue > 0)
    .map((a) => ({ name: a.name, value: a.totalValue, pct: a.shareOfNetWorth }));

  if (data.length === 0) {
    return <p className="text-sm text-gray-500">No account balances to chart.</p>;
  }

  const total = data.reduce((s, d) => s + d.value, 0);
  const focus = active !== undefined ? data[active] : undefined;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative h-56 w-56 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="66%"
              outerRadius="92%"
              paddingAngle={2}
              cornerRadius={6}
              stroke="none"
              activeIndex={active}
              activeShape={renderActive}
              onMouseEnter={(_, i) => setActive(i)}
              onMouseLeave={() => setActive(undefined)}
              animationDuration={700}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={categoryColor(i)} />
              ))}
            </Pie>
            <Tooltip content={() => null} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-medium text-gray-500">
            {focus ? focus.name : "Net worth"}
          </span>
          <span className="num mt-0.5 max-w-[8rem] truncate text-lg font-semibold tracking-tight text-gray-900">
            {formatMoney(focus ? focus.value : total, currency)}
          </span>
          {focus && (
            <span className="num text-xs text-gray-500">{focus.pct.toFixed(1)}%</span>
          )}
        </div>
      </div>

      <ul className="w-full min-w-0 flex-1 space-y-1 text-sm text-gray-900">
        {data.map((d, i) => (
          <li
            key={d.name}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(undefined)}
            className={`flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors ${
              active === i ? "bg-gray-50" : ""
            }`}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: categoryColor(i) }}
              />
              <span className="truncate">{d.name}</span>
            </span>
            <span className="num shrink-0 whitespace-nowrap">
              <span className="font-medium">{d.pct.toFixed(1)}%</span>
              <span className="ml-2 hidden text-gray-500 sm:inline">
                {formatMoney(d.value, currency)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
