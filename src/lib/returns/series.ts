import type { PriceHistory } from "@/lib/market/parse";
import { isCashLikeTicker } from "@/lib/snaptrade/aggregate";
import type { ActivityView } from "@/lib/snaptrade/types";

export interface SeriesInput {
  id: string;
  name: string;
  activities: ActivityView[];
  /** Today's reported account value, used only to check the reconstruction. */
  actualValue: number | null;
}

export interface SeriesChecks {
  /** Reconstructed value on the last day. */
  modelValue: number;
  actualValue: number | null;
  /** (model - actual) / actual * 100. */
  diffPct: number | null;
  /** Tickers that were held but have no price history (valued at zero). */
  missingPrices: string[];
  /** Activity types with a ticker that this model doesn't handle (e.g. transfers). */
  unhandledTypes: string[];
  /** Largest one-day move in the return index, in percent (a glitch detector). */
  maxDailyMovePct: number;
}

/** All arrays are aligned to the shared calendar of dates. */
export interface AccountSeries {
  id: string;
  name: string;
  /** Account value at each day's close. */
  v: number[];
  /** Cumulative deposits minus withdrawals. */
  cf: number[];
  /** Time-weighted return index (100 at first funded day), null before it. */
  t: (number | null)[];
  firstIdx: number | null;
  checks: SeriesChecks;
}

const MIN_VALUE = 1;

/** Last known value at or before each calendar date (first value before history starts). */
export function forwardFill(
  dates: string[],
  points: { date: string; value: number }[]
): number[] {
  const out: number[] = [];
  let p = 0;
  let last = points[0]?.value ?? 0;
  for (const d of dates) {
    while (p < points.length && points[p].date <= d) last = points[p++].value;
    out.push(last);
  }
  return out;
}

/** Time-weighted return index from daily values and cumulative flows. */
export function twrIndex(v: number[], cf: number[]) {
  const t: (number | null)[] = v.map(() => null);
  const firstIdx = v.findIndex((x) => x > MIN_VALUE);
  if (firstIdx < 0) return { t, firstIdx: null as number | null, maxDailyMovePct: 0 };

  t[firstIdx] = 100;
  let maxMove = 0;
  for (let i = firstIdx + 1; i < v.length; i++) {
    const prev = t[i - 1] as number;
    const base = v[i - 1];
    if (base < MIN_VALUE) {
      t[i] = prev;
      continue;
    }
    // Flows land during the day: they are in today's value but did not earn today's return.
    const r = (v[i] - (cf[i] - cf[i - 1])) / base - 1;
    maxMove = Math.max(maxMove, Math.abs(r) * 100);
    t[i] = prev * (1 + r);
  }
  return { t, firstIdx: firstIdx as number | null, maxDailyMovePct: maxMove };
}

interface Event {
  date: string;
  ticker?: string;
  /** Units in today's split-adjusted share basis. */
  units?: number;
  cash: number;
  flow: number;
}

const splitMultiplier = (history: PriceHistory | undefined, onDate: string) =>
  (history?.splits ?? [])
    .filter((s) => s.date > onDate)
    .reduce((m, s) => m * s.factor, 1);

/**
 * Rebuilds an account's daily value from its activities and price history.
 * Cash is the running sum of cash-affecting activities; sweep-fund trades are
 * internal (cash <-> money market) so they are ignored, while the interest they
 * pay is kept. Recorded units are converted to today's share basis using split
 * events, since brokers record older buys in pre-split units.
 */
export function buildAccountSeries(
  input: SeriesInput,
  dates: string[],
  histories: Map<string, PriceHistory>
): AccountSeries {
  const events: Event[] = [];
  const unhandled = new Set<string>();

  for (const act of input.activities) {
    if (act.amount === null && act.units === null) continue;
    const date = act.date.slice(0, 10);
    const amount = act.amount ?? 0;
    const t = act.ticker;
    const sweep = t !== null && isCashLikeTicker(t);

    switch (act.type) {
      case "CONTRIBUTION":
        events.push({ date, cash: Math.abs(amount), flow: Math.abs(amount) });
        break;
      case "WITHDRAWAL":
        events.push({ date, cash: -Math.abs(amount), flow: -Math.abs(amount) });
        break;
      case "DIVIDEND":
        events.push({ date, cash: amount, flow: 0 });
        break;
      case "BUY":
      case "REI":
      case "SELL": {
        if (sweep) break; // internal move between cash and the money-market fund
        const sign = act.type === "SELL" ? 1 : -1;
        const cash = sign * Math.abs(amount);
        if (!t || act.isOption) {
          events.push({ date, cash, flow: 0 });
          break;
        }
        const units =
          (act.type === "SELL" ? -1 : 1) *
          Math.abs(act.units ?? 0) *
          splitMultiplier(histories.get(t), date);
        events.push({ date, ticker: t, units, cash, flow: 0 });
        break;
      }
      default:
        if (t) unhandled.add(act.type);
        else if (amount !== 0) events.push({ date, cash: amount, flow: 0 }); // fees, interest, tax
    }
  }
  events.sort((a, b) => a.date.localeCompare(b.date));

  const tickers = [...new Set(events.flatMap((e) => (e.ticker ? [e.ticker] : [])))];
  const prices = new Map<string, number[]>();
  const missing: string[] = [];
  for (const t of tickers) {
    const h = histories.get(t);
    if (!h) missing.push(t);
    else prices.set(t, forwardFill(dates, h.points.map((p) => ({ date: p.date, value: p.close }))));
  }

  const units = new Map<string, number>();
  let cash = 0;
  let cumFlow = 0;
  let e = 0;
  const v: number[] = [];
  const cf: number[] = [];

  dates.forEach((d, i) => {
    while (e < events.length && events[e].date <= d) {
      const ev = events[e++];
      cash += ev.cash;
      cumFlow += ev.flow;
      if (ev.ticker) units.set(ev.ticker, (units.get(ev.ticker) ?? 0) + (ev.units ?? 0));
    }
    let value = cash;
    for (const [t, u] of units) {
      const px = prices.get(t)?.[i];
      if (px !== undefined && Math.abs(u) > 1e-9) value += u * px;
    }
    v.push(value);
    cf.push(cumFlow);
  });

  const { t, firstIdx, maxDailyMovePct } = twrIndex(v, cf);
  const modelValue = v[v.length - 1] ?? 0;

  return {
    id: input.id,
    name: input.name,
    v,
    cf,
    t,
    firstIdx,
    checks: {
      modelValue,
      actualValue: input.actualValue,
      diffPct:
        input.actualValue !== null && input.actualValue > 0
          ? ((modelValue - input.actualValue) / input.actualValue) * 100
          : null,
      missingPrices: missing,
      unhandledTypes: [...unhandled],
      maxDailyMovePct,
    },
  };
}

/** Sums accounts day by day and recomputes the return index on the total. */
export function combineSeries(id: string, name: string, list: AccountSeries[]): AccountSeries {
  const n = list[0]?.v.length ?? 0;
  const v = Array.from({ length: n }, (_, i) => list.reduce((s, a) => s + a.v[i], 0));
  const cf = Array.from({ length: n }, (_, i) => list.reduce((s, a) => s + a.cf[i], 0));
  const { t, firstIdx, maxDailyMovePct } = twrIndex(v, cf);
  const actual = list.every((a) => a.checks.actualValue !== null)
    ? list.reduce((s, a) => s + (a.checks.actualValue as number), 0)
    : null;
  const modelValue = v[n - 1] ?? 0;
  return {
    id,
    name,
    v,
    cf,
    t,
    firstIdx,
    checks: {
      modelValue,
      actualValue: actual,
      diffPct: actual && actual > 0 ? ((modelValue - actual) / actual) * 100 : null,
      missingPrices: [...new Set(list.flatMap((a) => a.checks.missingPrices))],
      unhandledTypes: [...new Set(list.flatMap((a) => a.checks.unhandledTypes))],
      maxDailyMovePct,
    },
  };
}
