// "What if you had copied this manager?" Each quarter, buy the stocks in their
// 13F at the reported weights on the day the filing became public (not the
// quarter end, which nobody outside the fund could act on), hold them until
// the next filing, then switch. Total return, so dividends count.

import type { PricePoint } from "@/lib/market/parse";

export interface CloneQuarter {
  filedAt: string;
  totalValue: number;
  holdings: { ticker: string; value: number }[];
}

export interface WindowStat {
  years: number;
  clone: number;
  bench: number;
  cloneAnnual: number;
  benchAnnual: number;
}

export interface ClonePoint {
  date: string;
  clone: number;
  bench: number;
}

export interface CloneResult {
  /** Growth of 100, sampled weekly. */
  series: ClonePoint[];
  windows: WindowStat[];
  /** Average share of each filing's value that had prices and was copied. */
  coverage: number;
}

export const WINDOW_YEARS = [1, 3, 5] as const;
const STALE_DAYS = 7;

const addDays = (iso: string, days: number) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

export const yearsBefore = (iso: string, years: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y - years, m - 1, d)).toISOString().slice(0, 10);
};

/** Index of the last point on or before `date`, or -1. */
export function atOrBefore(points: { date: string }[], date: string): number {
  let lo = 0;
  let hi = points.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].date <= date) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found;
}

function priceOn(points: PricePoint[] | undefined, date: string, maxStaleDays = Infinity): number | null {
  if (!points) return null;
  const i = atOrBefore(points, date);
  if (i < 0) return null;
  if (Number.isFinite(maxStaleDays) && points[i].date < addDays(date, -maxStaleDays)) return null;
  return points[i].adjclose;
}

export function computeClone(
  quarters: CloneQuarter[],
  prices: Map<string, PricePoint[]>,
  bench: PricePoint[]
): CloneResult | null {
  const sorted = [...quarters].sort((a, b) => a.filedAt.localeCompare(b.filedAt));
  if (sorted.length === 0 || bench.length === 0) return null;
  const days = bench.filter((p) => p.date >= sorted[0].filedAt);
  if (days.length < 2) return null;

  const daily: ClonePoint[] = [];
  const coverages: number[] = [];
  const benchStart = days[0].adjclose;
  let q = -1;
  let periodStartValue = 100;
  let weights: { ticker: string; weight: number; start: number }[] = [];

  const valueOn = (date: string) => {
    if (weights.length === 0) return periodStartValue; // nothing copyable: sit in cash
    let growth = 0;
    for (const w of weights) growth += w.weight * ((priceOn(prices.get(w.ticker), date) ?? w.start) / w.start);
    return periodStartValue * growth;
  };

  for (const day of days) {
    // Rebalance into the newest filing once it's public.
    if (q + 1 < sorted.length && day.date >= sorted[q + 1].filedAt) {
      periodStartValue = q < 0 ? 100 : valueOn(day.date);
      while (q + 1 < sorted.length && day.date >= sorted[q + 1].filedAt) q++;
      const quarter = sorted[q];
      const usable = quarter.holdings
        .map((h) => ({ ...h, start: priceOn(prices.get(h.ticker), day.date, STALE_DAYS) }))
        .filter((h): h is { ticker: string; value: number; start: number } => h.start !== null && h.value > 0);
      const total = usable.reduce((s, h) => s + h.value, 0);
      weights = usable.map((h) => ({ ticker: h.ticker, weight: h.value / total, start: h.start }));
      coverages.push(quarter.totalValue > 0 ? total / quarter.totalValue : 0);
    }
    daily.push({ date: day.date, clone: valueOn(day.date), bench: (100 * day.adjclose) / benchStart });
  }

  const last = daily[daily.length - 1];
  const windows: WindowStat[] = [];
  for (const years of WINDOW_YEARS) {
    const from = yearsBefore(last.date, years);
    if (daily[0].date > addDays(from, STALE_DAYS)) continue;
    const start = daily[Math.max(0, atOrBefore(daily, from))];
    const clone = last.clone / start.clone - 1;
    const bench = last.bench / start.bench - 1;
    windows.push({
      years,
      clone,
      bench,
      cloneAnnual: (1 + clone) ** (1 / years) - 1,
      benchAnnual: (1 + bench) ** (1 / years) - 1,
    });
  }

  const round = (p: ClonePoint): ClonePoint => ({
    date: p.date,
    clone: Math.round(p.clone * 100) / 100,
    bench: Math.round(p.bench * 100) / 100,
  });
  const series = daily.filter((_, i) => i % 5 === 0 || i === daily.length - 1).map(round);

  return {
    series,
    windows,
    coverage: coverages.length ? coverages.reduce((s, c) => s + c, 0) / coverages.length : 0,
  };
}
