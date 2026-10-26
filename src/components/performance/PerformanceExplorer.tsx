"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/Card";
import {
  chartSeries,
  PERIODS,
  periodStats,
  type PeriodKey,
} from "@/lib/returns/perf";
import { formatMoney, formatPercent } from "@/lib/utils/format";
import type { PerformanceData } from "@/lib/returns/loadPerformance";

const ACCOUNT_COLOR = "#2563eb";
const BENCH_COLOR = "#f59e0b";
const RANGES: PeriodKey[] = ["1M", "3M", "6M", "YTD", "1Y", "ALL"];
const RANGE_LABEL: Record<PeriodKey, string> = {
  "1M": "1M",
  "3M": "3M",
  "6M": "6M",
  YTD: "YTD",
  "1Y": "1Y",
  ALL: "All",
};

const signClass = (v: number) => (v >= 0 ? "text-green-600" : "text-red-600");
const pts = (diff: number) => `${diff >= 0 ? "+" : ""}${(diff * 100).toFixed(2)} pts`;

export function PerformanceExplorer({ data }: { data: PerformanceData }) {
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
    return <p className="text-sm text-gray-600">Not enough history to chart yet.</p>;
  }

  const last = chart[chart.length - 1];
  const headline = last
    ? {
        account: last.account,
        bench: last.benchmark,
        diff: (last.account - last.benchmark) / 100,
        since: chart[0].date,
      }
    : null;
  const quality =
    account.diffPct !== null && Math.abs(account.diffPct) > 0.5
      ? `The rebuilt value is ${account.diffPct.toFixed(1)}% off today's real balance (usually a few fractional shares missing from the activity history), so this curve is approximate.`
      : null;

  const select = "rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900";

  return (
    <div className="space-y-6 text-gray-900">
      <Card>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <label className="text-sm text-gray-600">
            Account{" "}
            <select className={select} value={account.id} onChange={(e) => setAccountId(e.target.value)}>
              {funded.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-gray-600">
            Compare with{" "}
            <select className={select} value={bench.key} onChange={(e) => setBenchKey(e.target.value)}>
              {data.benchmarks.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
          <div className="ml-auto flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-md px-2.5 py-1 text-sm ${
                  r === range ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {RANGE_LABEL[r]}
              </button>
            ))}
          </div>
        </div>

        {headline ? (
          <p className="mb-4 text-sm text-gray-700">
            Since {headline.since}, <span className="font-medium">{account.name}</span> returned{" "}
            <span className={`font-semibold ${signClass(headline.account)}`}>
              {formatPercent(headline.account)}
            </span>{" "}
            vs <span className="font-medium">{bench.label}</span>{" "}
            <span className={`font-semibold ${signClass(headline.bench)}`}>
              {formatPercent(headline.bench)}
            </span>
            : {headline.diff >= 0 ? "ahead" : "behind"} by{" "}
            <span className={`font-semibold ${signClass(headline.diff)}`}>
              {Math.abs(headline.diff * 100).toFixed(2)} pts
            </span>
            .
          </p>
        ) : (
          <p className="mb-4 text-sm text-gray-600">This account has no history in this range.</p>
        )}

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "#4b5563" }}
                tickFormatter={(d: string) => d.slice(0, 7)}
                minTickGap={48}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#4b5563" }}
                tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                width={48}
              />
              <ReferenceLine y={0} stroke="#9ca3af" />
              <Tooltip
                formatter={(v: number, name: string) => [formatPercent(v), name]}
                labelFormatter={(d: string) => d}
              />
              <Line
                type="monotone"
                dataKey="account"
                name={account.name}
                stroke={ACCOUNT_COLOR}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="benchmark"
                name={bench.label}
                stroke={BENCH_COLOR}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex gap-5 text-sm text-gray-700">
          <span className="flex items-center gap-2">
            <span className="h-0.5 w-5" style={{ background: ACCOUNT_COLOR }} /> {account.name}
          </span>
          <span className="flex items-center gap-2">
            <span className="h-0.5 w-5" style={{ background: BENCH_COLOR }} /> {bench.label}
          </span>
        </div>

        {quality && (
          <p className="mt-3 rounded bg-amber-50 border border-amber-200 p-2 text-xs text-amber-800">{quality}</p>
        )}
        {account.missingPrices.length > 0 && (
          <p className="mt-3 rounded bg-amber-50 border border-amber-200 p-2 text-xs text-amber-800">
            No price history for {account.missingPrices.join(", ")}; those holdings are left out of the curve.
          </p>
        )}
      </Card>

      <Card
        title="Period returns"
        subtitle={`${account.name} vs ${bench.label}. Gain is money earned after removing deposits and withdrawals.`}
      >
        <div className="overflow-x-auto text-sm">
          <table className="min-w-full">
            <thead className="text-left text-gray-600 font-medium">
              <tr>
                <th className="py-2 pr-3">Period</th>
                <th className="py-2 px-3 text-right">Gain</th>
                <th className="py-2 px-3 text-right">{account.name}</th>
                <th className="py-2 px-3 text-right">{bench.label}</th>
                <th className="py-2 pl-3 text-right">vs benchmark</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ key, label, stats }) => (
                <tr key={key} className="border-t border-gray-100">
                  <td className="py-2 pr-3">
                    {label}
                    {stats.available && key !== "ALL" && (
                      <span className="ml-2 text-xs text-gray-500">from {stats.startDate}</span>
                    )}
                  </td>
                  {stats.available ? (
                    <>
                      <td className={`py-2 px-3 text-right ${signClass(stats.gain)}`}>
                        {formatMoney(stats.gain, "USD")}
                      </td>
                      <td className={`py-2 px-3 text-right ${signClass(stats.twr)}`}>
                        {formatPercent(stats.twr * 100)}
                      </td>
                      <td className={`py-2 px-3 text-right ${signClass(stats.bench)}`}>
                        {formatPercent(stats.bench * 100)}
                      </td>
                      <td className={`py-2 pl-3 text-right font-medium ${signClass(stats.diff)}`}>
                        {pts(stats.diff)}
                      </td>
                    </>
                  ) : (
                    <td
                      colSpan={4}
                      className="py-2 px-3 text-right text-gray-500"
                      title="This account has less history than the period"
                    >
                      — not enough history
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Time-weighted returns count every period equally, whatever the balance was. So{" "}
          <span className="font-medium">Since start</span> for All accounts is dominated by the early years
          when balances were small. The Returns page shows the dollar-weighted (XIRR) figure, which reflects
          how much money was actually invested when.
        </p>
      </Card>
    </div>
  );
}
