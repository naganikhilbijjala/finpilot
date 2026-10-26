"use client";

import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from "recharts";
import { categoryColor } from "@/components/charts/theme";
import type { PortfolioHolding } from "@/lib/types";

interface PortfolioPieChartProps {
  holdings: PortfolioHolding[];
}

const money = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderActive = (props: any) => (
  <Sector {...props} outerRadius={props.outerRadius + 6} cornerRadius={6} />
);

export function PortfolioPieChart({ holdings }: PortfolioPieChartProps) {
  const [active, setActive] = useState<number | undefined>(undefined);

  if (holdings.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const total = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const data = [...holdings]
    .sort((a, b) => b.currentValue - a.currentValue)
    .map((h) => ({
      name: h.ticker,
      value: h.currentValue,
      pct: total > 0 ? (h.currentValue / total) * 100 : 0,
    }));
  const focus = active !== undefined ? data[active] : undefined;

  return (
    <div className="flex flex-col items-center gap-6 md:flex-row">
      <div className="relative h-60 w-60 shrink-0">
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
          <span className="text-xs font-medium text-gray-500">{focus ? focus.name : "Total value"}</span>
          <span className="num mt-0.5 text-lg font-semibold tracking-tight text-gray-900">
            {money(focus ? focus.value : total)}
          </span>
          {focus && <span className="num text-xs text-gray-500">{focus.pct.toFixed(1)}%</span>}
        </div>
      </div>

      <ul className="grid w-full flex-1 grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
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
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: categoryColor(i) }} />
              <span className="truncate font-medium text-gray-900">{d.name}</span>
            </span>
            <span className="num shrink-0 text-gray-600">{d.pct.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
