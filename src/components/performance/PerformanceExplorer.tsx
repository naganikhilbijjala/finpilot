"use client";

import { useId, useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { CHART, formatAxisDate, formatChartDate } from "@/components/charts/theme";
import { Card } from "@/components/ui/Card";
import { ArrowDownIcon, ArrowUpIcon } from "@/components/ui/Icons";
import {
  chartSeries,
  PERIODS,
  periodStats,
  type ChartPoint,
  type PeriodKey,
} from "@/lib/returns/perf";
import { formatMoney, formatPercent } from "@/lib/utils/format";
import type { PerformanceData } from "@/lib/returns/loadPerformance";

const RANGES: PeriodKey[] = ["1M", "3M", "6M", "YTD", "1Y", "ALL"];
const RANGE_LABEL: Record<PeriodKey, string> = {
  "1M": "1M",
  "3M": "3M",
  "6M": "6M",
  YTD: "YTD",
  "1Y": "1Y",
  ALL: "All",
};

const signClass = (v: number) => (v >= 0 ? "text-emerald-600" : "text-rose-600");
const pts = (diff: number) => `${diff >= 0 ? "+" : ""}${(diff * 100).toFixed(2)} pts`;

const selectClass =
  "rounded-xl border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm font-medium text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40";

function Tile({
  label,
  value,
  sub,
  valueClass = "text-gray-900",
  dot,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
  dot?: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
        {dot && <span className="h-2 w-2 rounded-full" style={{ background: dot }} />}
        <span className="truncate">{label}</span>
      </div>
      <div className={`num mt-1 text-xl font-semibold tracking-tight ${valueClass}`}>{value}</div>
      {sub && <div className="mt-0.5 truncate text-xs text-gray-500">{sub}</div>}
    </div>
  );
}

function PerfTooltip({
  active,
  payload,
  label,
  accountName,
  benchName,
}: TooltipProps<number, string> & { accountName: string; benchName: string }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as ChartPoint;
  const diff = point.account - point.benchmark;
  return (
    <div className="min-w-[190px] rounded-xl border border-gray-200 bg-white/95 p-3 text-sm shadow-elevated backdrop-blur">
      <div className="mb-2 text-xs font-medium text-gray-500">{formatChartDate(String(label), true)}</div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-gray-700">
            <span className="h-2 w-2 rounded-full" style={{ background: CHART.primary }} />
            <span className="max-w-[110px] truncate">{accountName}</span>
          </span>
          <span className={`num font-semibold ${signClass(point.account)}`}>
            {formatPercent(point.account)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-gray-700">
            <span className="h-2 w-2 rounded-full" style={{ background: CHART.benchmark }} />
            <span className="max-w-[110px] truncate">{benchName}</span>
          </span>
          <span className={`num font-semibold ${signClass(point.benchmark)}`}>
            {formatPercent(point.benchmark)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-1.5 text-xs text-gray-500">
          <span>Difference</span>
          <span className={`num font-medium ${signClass(diff)}`}>
            {diff >= 0 ? "+" : ""}
            {diff.toFixed(2)} pts
          </span>
        </div>
      </div>
    </div>
  );
}

export function PerformanceExplorer({
  data,
  compact = false,
}: {
  data: PerformanceData;
  /** Chart and headline tiles only; used as a preview on the dashboard. */
  compact?: boolean;
}) {
  const gradientId = useId().replace(/:/g, "");
  const funded = data.accounts.filter((a) => a.firstIdx !== null);
  const [accountId, setAccountId] = useState(funded[0]?.id ?? "");
  const [benchKey, setBenchKey] = useState(data.benchmarks[0]?.key ?? "");
  const [range, setRange] = useState<PeriodKey>("1Y");

  const account = funded.find((a) => a.id === accountId) ?? funded[0];
  const bench = data.benchmarks.find((b) => b.key === benchKey) ?? data.benchmarks[0];

  const chart = useMemo(
    () => (account && bench ? chartSeries(data.dates, account, bench.b, range) : []),
    [data.dates, account, bench, range]
  );
  const rows = useMemo(
    () =>
      account && bench
        ? PERIODS.map((p) => ({ ...p, stats: periodStats(data.dates, account, bench.b, p.key) }))
        : [],
    [data.dates, account, bench]
  );

  if (!account || !bench) {
    return (
      <Card>
        <p className="py-8 text-center text-sm text-gray-500">Not enough history to chart yet.</p>
      </Card>
    );
  }

  const first = chart[0];
  const last = chart[chart.length - 1];
  const diff = last ? last.account - last.benchmark : 0;
  const spanDays = first && last ? (Date.parse(last.date) - Date.parse(first.date)) / 86_400_000 : 0;
  const rangeStats = rows.find((r) => r.key === range)?.stats;

  const quality =
    account.diffPct !== null && Math.abs(account.diffPct) > 0.5
      ? `The rebuilt value is ${account.diffPct.toFixed(1)}% off today's real balance (usually a few fractional shares missing from the activity history), so this curve is approximate.`
      : null;

  return (
    <div className="space-y-6 text-gray-900">
      <Card
        title="Return vs benchmark"
        subtitle={
          first
            ? `Both lines start at 0% on ${formatChartDate(first.date, true)}`
            : "This account has no history in this range."
        }
        action={
          <div
            role="group"
            aria-label="Time range"
            className="flex rounded-xl bg-gray-100 p-1"
          >
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                aria-pressed={r === range}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all sm:px-3 ${
                  r === range
                    ? "bg-white text-primary-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {RANGE_LABEL[r]}
              </button>
            ))}
          </div>
        }
      >
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <select
            aria-label="Account"
            className={selectClass}
            value={account.id}
            onChange={(e) => setAccountId(e.target.value)}
          >
            {funded.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-400">vs</span>
          <select
            aria-label="Benchmark"
            className={selectClass}
            value={bench.key}
            onChange={(e) => setBenchKey(e.target.value)}
          >
            {data.benchmarks.map((b) => (
              <option key={b.key} value={b.key}>
                {b.label}
              </option>
            ))}
          </select>
        </div>

        {last && (
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile
              label={account.name}
              dot={CHART.primary}
              value={formatPercent(last.account)}
              valueClass={signClass(last.account)}
              sub="Time-weighted return"
            />
            <Tile
              label={bench.label}
              dot={CHART.benchmark}
              value={formatPercent(last.benchmark)}
              valueClass={signClass(last.benchmark)}
              sub="Total return"
            />
            <Tile
              label={diff >= 0 ? "Ahead of benchmark" : "Behind benchmark"}
              value={`${diff >= 0 ? "+" : "−"}${Math.abs(diff).toFixed(2)} pts`}
              valueClass={signClass(diff)}
              sub={diff >= 0 ? "Outperforming" : "Underperforming"}
            />
            <Tile
              label="Money earned"
              value={rangeStats?.available ? formatMoney(rangeStats.gain, "USD") : "—"}
              valueClass={rangeStats?.available ? signClass(rangeStats.gain) : "text-gray-400"}
              sub={rangeStats?.available ? "After deposits & withdrawals" : "Less history than this range"}
            />
          </div>
        )}

        <div className="h-72 sm:h-80" role="img" aria-label={`${account.name} return compared with ${bench.label}`}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chart} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.primary} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={CHART.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={CHART.grid} strokeDasharray="3 4" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: CHART.axis }}
                tickFormatter={(d: string) => formatAxisDate(d, spanDays)}
                tickLine={false}
                axisLine={false}
                minTickGap={56}
                tickMargin={8}
              />
              <YAxis
                tick={{ fontSize: 12, fill: CHART.axis }}
                tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="2 3" />
              <Tooltip
                cursor={{ stroke: "#94a3b8", strokeDasharray: "3 3" }}
                content={<PerfTooltip accountName={account.name} benchName={bench.label} />}
              />
              <Area
                type="monotone"
                dataKey="account"
                stroke="none"
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
                activeDot={false}
                legendType="none"
              />
              <Line
                type="monotone"
                dataKey="benchmark"
                stroke={CHART.benchmark}
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff", fill: CHART.benchmark }}
                animationDuration={600}
              />
              <Line
                type="monotone"
                dataKey="account"
                stroke={CHART.primary}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff", fill: CHART.primary }}
                animationDuration={600}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-gray-600">
          <span className="flex items-center gap-2">
            <span className="h-0.5 w-5 rounded" style={{ background: CHART.primary }} /> {account.name}
          </span>
          <span className="flex items-center gap-2">
            <span
              className="h-0.5 w-5"
              style={{
                backgroundImage: `repeating-linear-gradient(90deg, ${CHART.benchmark} 0 5px, transparent 5px 8px)`,
              }}
            />{" "}
            {bench.label}
          </span>
        </div>

        {quality && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">{quality}</p>
        )}
        {account.missingPrices.length > 0 && (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            No price history for {account.missingPrices.join(", ")}; those holdings are left out of the curve.
          </p>
        )}
      </Card>

      {!compact && (
        <Card
          title="Period returns"
          subtitle={`${account.name} vs ${bench.label}. Gain is money earned after removing deposits and withdrawals.`}
          flush
        >
          <div className="overflow-x-auto px-5 pb-5 text-sm sm:px-6">
            <table className="min-w-full">
              <thead className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="py-2 pr-3">Period</th>
                  <th className="px-3 py-2 text-right">Gain</th>
                  <th className="px-3 py-2 text-right">{account.name}</th>
                  <th className="px-3 py-2 text-right">{bench.label}</th>
                  <th className="py-2 pl-3 text-right">vs benchmark</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ key, label, stats }) => (
                  <tr key={key} className="border-t border-gray-100 transition-colors hover:bg-gray-50/70">
                    <td className="py-3 pr-3 font-medium">
                      {label}
                      {stats.available && key !== "ALL" && (
                        <span className="ml-2 text-xs font-normal text-gray-400">from {stats.startDate}</span>
                      )}
                    </td>
                    {stats.available ? (
                      <>
                        <td className={`num px-3 py-3 text-right ${signClass(stats.gain)}`}>
                          {formatMoney(stats.gain, "USD")}
                        </td>
                        <td className={`num px-3 py-3 text-right font-medium ${signClass(stats.twr)}`}>
                          {formatPercent(stats.twr * 100)}
                        </td>
                        <td className={`num px-3 py-3 text-right ${signClass(stats.bench)}`}>
                          {formatPercent(stats.bench * 100)}
                        </td>
                        <td className="py-3 pl-3 text-right">
                          <span
                            className={`num inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                              stats.diff >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {stats.diff >= 0 ? (
                              <ArrowUpIcon className="h-3 w-3" strokeWidth={2.5} />
                            ) : (
                              <ArrowDownIcon className="h-3 w-3" strokeWidth={2.5} />
                            )}
                            {pts(stats.diff)}
                          </span>
                        </td>
                      </>
                    ) : (
                      <td
                        colSpan={4}
                        className="px-3 py-3 text-right text-gray-400"
                        title="This account has less history than the period"
                      >
                        Not enough history
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-xs leading-relaxed text-gray-500">
              Time-weighted returns count every period equally, whatever the balance was. So{" "}
              <span className="font-medium">Since start</span> for All accounts is dominated by the early years
              when balances were small. The Returns page shows the dollar-weighted (XIRR) figure, which reflects
              how much money was actually invested when.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
