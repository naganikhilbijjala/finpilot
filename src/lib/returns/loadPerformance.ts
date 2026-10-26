import "server-only";
import { fetchPriceHistories } from "@/lib/market/history";
import { isCashLikeTicker } from "@/lib/snaptrade/aggregate";
import type { SnapshotFailure } from "@/lib/snaptrade/types";
import { loadInputs } from "./load";
import { buildAccountSeries, combineSeries, forwardFill, type AccountSeries } from "./series";

const BENCHMARKS = [
  { key: "SPY", label: "S&P 500" },
  { key: "QQQ", label: "Nasdaq-100" },
  { key: "VTI", label: "US total market" },
] as const;

export interface PerfAccount {
  id: string;
  name: string;
  v: number[];
  cf: number[];
  t: (number | null)[];
  firstIdx: number | null;
  /** Reconstructed vs real balance today, in percent. */
  diffPct: number | null;
  missingPrices: string[];
}

export interface PerformanceData {
  dates: string[];
  /** First entry is the all-accounts total. */
  accounts: PerfAccount[];
  /** Total-return price index (dividends reinvested), aligned to dates. */
  benchmarks: { key: string; label: string; b: number[] }[];
  failures: SnapshotFailure[];
  asOf: string;
}

const round = (x: number, d: number) => Math.round(x * 10 ** d) / 10 ** d;

const toPerf = (s: AccountSeries): PerfAccount => ({
  id: s.id,
  name: s.name,
  v: s.v.map((x) => round(x, 2)),
  cf: s.cf.map((x) => round(x, 2)),
  t: s.t.map((x) => (x === null ? null : round(x, 4))),
  firstIdx: s.firstIdx,
  diffPct: s.checks.diffPct === null ? null : round(s.checks.diffPct, 2),
  missingPrices: s.checks.missingPrices,
});

/**
 * Rebuilds each account's daily value from its transactions and market prices,
 * and aligns benchmark total-return indexes to the same calendar.
 */
export async function loadPerformance(): Promise<PerformanceData> {
  const { inputs, failures } = await loadInputs();

  const from = inputs
    .flatMap((i) => i.activities.map((a) => a.date.slice(0, 10)))
    .sort()[0];
  if (!from) {
    return { dates: [], accounts: [], benchmarks: [], failures, asOf: new Date().toISOString() };
  }

  const tickers = inputs.flatMap((i) =>
    i.activities.flatMap((a) =>
      a.ticker && !a.isOption && !isCashLikeTicker(a.ticker) ? [a.ticker] : []
    )
  );
  const { histories } = await fetchPriceHistories(
    [...tickers, ...BENCHMARKS.map((b) => b.key)],
    from
  );

  const spy = histories.get("SPY");
  if (!spy) throw new Error("Benchmark price history is unavailable right now");
  const dates = spy.points.map((p) => p.date).filter((d) => d >= from);

  const series = inputs.map((i) => {
    const account = inputs.find((x) => x.id === i.id)!;
    return buildAccountSeries(
      { id: i.id, name: i.name, activities: i.activities, actualValue: account.totalValue },
      dates,
      histories
    );
  });

  const benchmarks = BENCHMARKS.flatMap((b) => {
    const h = histories.get(b.key);
    if (!h) return [];
    return [
      {
        key: b.key,
        label: b.label,
        b: forwardFill(dates, h.points.map((p) => ({ date: p.date, value: p.adjclose }))).map((x) =>
          round(x, 4)
        ),
      },
    ];
  });

  const all = combineSeries("all", "All accounts", series);
  return {
    dates,
    accounts: [all, ...series].map(toPerf),
    benchmarks,
    failures,
    asOf: new Date().toISOString(),
  };
}
