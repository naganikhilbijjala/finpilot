"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HistoryPoint } from "@/lib/screener/statements";

const year = (end: string) => end.slice(0, 4);
const billions = (v: number | null) => (v === null ? null : Math.round(v / 1e7) / 100);
const margin = (num: number | null, den: number) =>
  num === null || den <= 0 ? null : Math.round((num / den) * 1000) / 10;

const axis = { fontSize: 12, fill: "#6b7280" };

export function HistoryCharts({ history }: { history: HistoryPoint[] }) {
  const money = history.map((h) => ({
    year: year(h.end),
    Revenue: billions(h.revenue),
    "Operating income": billions(h.operatingIncome),
    "Net income": billions(h.netIncome),
  }));
  const margins = history.map((h) => ({
    year: year(h.end),
    Gross: margin(h.grossProfit, h.revenue),
    Operating: margin(h.operatingIncome, h.revenue),
    Net: margin(h.netIncome, h.revenue),
  }));
  const hasGross = margins.some((m) => m.Gross !== null);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <h4 className="mb-2 text-sm font-medium text-gray-700">Revenue and profit ($B)</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={money} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="year" tick={axis} tickLine={false} />
              <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} />
              <Tooltip formatter={(v: number) => `$${v}B`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Revenue" fill="#94a3b8" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Operating income" fill="#34d399" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Net income" fill="#059669" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div>
        <h4 className="mb-2 text-sm font-medium text-gray-700">Margins (% of revenue)</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={margins} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="year" tick={axis} tickLine={false} />
              <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {hasGross && <Line dataKey="Gross" stroke="#64748b" dot={false} strokeWidth={2} connectNulls />}
              <Line dataKey="Operating" stroke="#34d399" dot={false} strokeWidth={2} connectNulls />
              <Line dataKey="Net" stroke="#059669" dot={false} strokeWidth={2} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
