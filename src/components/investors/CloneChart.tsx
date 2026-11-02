"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART, formatAxisDate, formatChartDate } from "@/components/charts/theme";
import type { ClonePoint } from "@/lib/investors/clone";

/** Growth of $100: the copied portfolio against the S&P 500. */
export function CloneChart({ series, name }: { series: ClonePoint[]; name: string }) {
  const span = series.length > 1 ? (Date.parse(series[series.length - 1].date) - Date.parse(series[0].date)) / 864e5 : 0;
  return (
    <div className="h-72 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: CHART.axis }}
            tickLine={false}
            axisLine={false}
            minTickGap={40}
            tickFormatter={(d: string) => formatAxisDate(d, span)}
          />
          <YAxis
            tick={{ fontSize: 12, fill: CHART.axis }}
            tickLine={false}
            axisLine={false}
            width={48}
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => `$${Math.round(v)}`}
          />
          <Tooltip
            labelFormatter={(d) => formatChartDate(String(d), true)}
            formatter={(v: number) => `$${v.toFixed(0)}`}
            contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0", fontSize: 13 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="clone" name={`Copying ${name}`} stroke={CHART.primary} strokeWidth={2} dot={false} />
          <Line
            type="monotone"
            dataKey="bench"
            name="S&P 500 (SPY)"
            stroke={CHART.benchmark}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
