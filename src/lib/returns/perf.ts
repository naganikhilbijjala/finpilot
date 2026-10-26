// Pure helpers for comparing an account's return index with a benchmark.

export type PeriodKey = "1M" | "3M" | "6M" | "YTD" | "1Y" | "ALL";

export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "1M", label: "1 month" },
  { key: "3M", label: "3 months" },
  { key: "6M", label: "6 months" },
  { key: "YTD", label: "Year to date" },
  { key: "1Y", label: "1 year" },
  { key: "ALL", label: "Since start" },
];

/** Arrays aligned to a shared calendar of dates. */
export interface PerfSeries {
  v: number[];
  cf: number[];
  t: (number | null)[];
  firstIdx: number | null;
}

const MONTHS: Record<string, number> = { "1M": 1, "3M": 3, "6M": 6, "1Y": 12 };

/** Calendar date a period began, or null for "since start". */
function targetDate(endDate: string, key: PeriodKey): string | null {
  if (key === "ALL") return null;
  const end = new Date(`${endDate}T00:00:00Z`);
  if (key === "YTD") return `${end.getUTCFullYear() - 1}-12-31`;
  const d = new Date(end);
  d.setUTCMonth(d.getUTCMonth() - MONTHS[key]);
  return d.toISOString().slice(0, 10);
}

const lastIndexOnOrBefore = (dates: string[], target: string) => {
  let idx = -1;
  for (let i = 0; i < dates.length && dates[i] <= target; i++) idx = i;
  return idx;
}

/**
 * Index where a full period begins, or null if the account has less history
 * than the period (so a partial window is never passed off as the whole period).
 */
export function windowStart(
  dates: string[],
  key: PeriodKey,
  firstIdx: number | null
): number | null {
  const end = dates.length - 1;
  if (firstIdx === null || end < 1) return null;
  const target = targetDate(dates[end], key);
  const idx = target === null ? firstIdx : lastIndexOnOrBefore(dates, target);
  if (idx < 0 || idx < firstIdx || idx >= end) return null;
  return idx;
}

/** Where to start the chart: the period start, clamped to when the account began. */
export function chartStart(dates: string[], key: PeriodKey, firstIdx: number | null): number | null {
  const end = dates.length - 1;
  if (firstIdx === null || end < 1) return null;
  const target = targetDate(dates[end], key);
  const idx = target === null ? 0 : Math.max(0, lastIndexOnOrBefore(dates, target));
  const start = Math.max(idx, firstIdx);
  return start < end ? start : null;
}

export interface PeriodStats {
  available: boolean;
  startDate: string | null;
  /** Money gained in the period: change in value minus net deposits. */
  gain: number;
  /** Time-weighted return, decimal. */
  twr: number;
  bench: number;
  /** twr - bench, decimal (0.02 = 2 percentage points ahead). */
  diff: number;
}

export function periodStats(
  dates: string[],
  s: PerfSeries,
  bench: number[],
  key: PeriodKey
): PeriodStats {
  const start = windowStart(dates, key, s.firstIdx);
  const none = { available: false, startDate: null, gain: 0, twr: 0, bench: 0, diff: 0 };
  if (start === null) return none;
  const end = dates.length - 1;
  const t0 = s.t[start];
  const t1 = s.t[end];
  if (t0 === null || t1 === null || !bench[start] || !bench[end]) return none;

  const twr = t1 / t0 - 1;
  const b = bench[end] / bench[start] - 1;
  return {
    available: true,
    startDate: dates[start],
    gain: s.v[end] - s.v[start] - (s.cf[end] - s.cf[start]),
    twr,
    bench: b,
    diff: twr - b,
  };
}

export interface ChartPoint {
  date: string;
  /** Percent change since the window start. */
  account: number;
  benchmark: number;
}

/** Both lines rebased to 0% at the window start so they compare directly. */
export function chartSeries(
  dates: string[],
  s: PerfSeries,
  bench: number[],
  key: PeriodKey
): ChartPoint[] {
  const start = chartStart(dates, key, s.firstIdx);
  if (start === null || s.t[start] === null || !bench[start]) return [];
  const t0 = s.t[start] as number;
  const b0 = bench[start];
  const out: ChartPoint[] = [];
  for (let i = start; i < dates.length; i++) {
    const t = s.t[i];
    if (t === null) continue;
    out.push({
      date: dates[i],
      account: (t / t0 - 1) * 100,
      benchmark: (bench[i] / b0 - 1) * 100,
    });
  }
  return out;
}
