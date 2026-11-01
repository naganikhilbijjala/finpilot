"use client";

import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from "recharts";
import { formatMoney } from "@/lib/utils/format";

export interface Slice {
  key: string;
  label: string;
  value: number;
  pct: number;
  color: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderActive = (props: any) => (
  <Sector {...props} outerRadius={props.outerRadius + 6} cornerRadius={4} />
);

export function ExposureDonut({ slices, currency }: { slices: Slice[]; currency: string | null }) {
  const [active, setActive] = useState<number | undefined>(undefined);
  const focus = active !== undefined ? slices[active] : undefined;
  const total = slices.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex flex-col items-center gap-6 md:flex-row md:items-center">
      <div className="relative h-64 w-64 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="label"
              innerRadius="64%"
              outerRadius="92%"
              paddingAngle={1.5}
              cornerRadius={4}
              stroke="none"
              activeIndex={active}
              activeShape={renderActive}
              onMouseEnter={(_, i) => setActive(i)}
              onMouseLeave={() => setActive(undefined)}
              animationDuration={700}
            >
              {slices.map((s) => (
                <Cell key={s.key} fill={s.color} />
              ))}
            </Pie>
            <Tooltip content={() => null} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
          <span className="max-w-full truncate text-xs font-medium text-gray-500">
            {focus ? focus.label : "Invested"}
          </span>
          <span className="num mt-0.5 text-xl font-semibold tracking-tight text-gray-900">
            {focus ? `${focus.pct.toFixed(1)}%` : formatMoney(total, currency).replace(/\.\d+$/, "")}
          </span>
          {focus && (
            <span className="num text-xs text-gray-500">
              {formatMoney(focus.value, currency).replace(/\.\d+$/, "")}
            </span>
          )}
        </div>
      </div>

      <ul className="grid w-full flex-1 grid-cols-1 gap-x-6 gap-y-0.5 text-sm sm:grid-cols-2">
        {slices.map((s, i) => (
          <li
            key={s.key}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(undefined)}
            className={`flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors ${
              active === i ? "bg-gray-50" : ""
            }`}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="truncate text-gray-900">{s.label}</span>
            </span>
            <span className="num shrink-0 font-medium text-gray-700">{s.pct.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
