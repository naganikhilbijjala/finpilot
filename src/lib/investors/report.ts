// Builds one manager's page from their parsed 13F history: latest holdings,
// what changed since the previous quarter, and the copied-portfolio return.

import type { PricePoint, Split } from "@/lib/market/parse";
import { computeClone, type CloneResult } from "./clone";
import type { Position } from "./thirteenf";

export interface ResolvedPosition extends Position {
  ticker: string | null;
  /** Readable company name when the security was matched. */
  displayName: string;
}

export interface Quarter {
  filedAt: string;
  reportDate: string;
  /** Largest positions only, for filers with thousands. */
  positions: ResolvedPosition[];
  /** All long stock positions in the filing, when more were filed than kept. */
  totalValue?: number;
  positionCount?: number;
}

const totalOf = (q: Quarter) => q.totalValue ?? q.positions.reduce((s, p) => s + p.value, 0);

export type Change = "new" | "added" | "reduced";

export interface ManagerHolding {
  cusip: string;
  ticker: string | null;
  name: string;
  value: number;
  /** Percent of the manager's reported 13F portfolio. */
  pct: number;
  change: Change | null;
  /** Change in share count since last quarter, split-adjusted. */
  sharesChangePct: number | null;
}

export interface SoldOut {
  ticker: string | null;
  name: string;
  prevPct: number;
}

export interface ManagerReport {
  cik: number;
  filer: string;
  reportDate: string;
  filedAt: string;
  totalValue: number;
  positionCount: number;
  holdings: ManagerHolding[];
  soldOut: SoldOut[];
  clone: CloneResult | null;
  quartersUsed: number;
  /** Percent of the latest portfolio's value matched to a ticker. */
  matchedPct: number;
  builtAt: string;
}

export const SHOWN_HOLDINGS = 40;
export const SHOWN_SOLD = 25;
/** Share-count moves smaller than this are noise (rounding, small trims). */
const CHANGE_THRESHOLD = 0.05;

/** The positions worth pricing for one quarter: largest first, up to 95% of value or 40 names. */
export function positionsToPrice(q: Quarter, maxNames = 40, coverage = 0.95): ResolvedPosition[] {
  const total = q.positions.reduce((s, p) => s + p.value, 0);
  const out: ResolvedPosition[] = [];
  let covered = 0;
  for (const p of q.positions) {
    if (out.length >= maxNames || covered >= coverage * total) break;
    covered += p.value;
    if (p.ticker) out.push(p);
  }
  return out;
}

/**
 * Share classes of one company (GOOGL and GOOG, LEN and LEN.B) resolve to the
 * same ticker; they're one position for the reader. The largest class's CUSIP
 * identifies it, so quarter-on-quarter changes still line up.
 */
export function mergeByTicker(positions: ResolvedPosition[]): ResolvedPosition[] {
  const out = new Map<string, ResolvedPosition>();
  for (const p of positions) {
    const key = p.ticker ?? `cusip:${p.cusip}`;
    const existing = out.get(key);
    if (existing) {
      existing.value += p.value;
      existing.shares += p.shares;
    } else out.set(key, { ...p });
  }
  return [...out.values()].sort((a, b) => b.value - a.value);
}

function splitFactor(splits: Split[] | undefined, after: string, through: string): number {
  return (splits ?? []).filter((s) => s.date > after && s.date <= through).reduce((f, s) => f * s.factor, 1);
}

export function buildReport(input: {
  cik: number;
  filer: string;
  quarters: Quarter[];
  prices: Map<string, { points: PricePoint[]; splits: Split[] }>;
  bench: PricePoint[];
  builtAt?: string;
}): ManagerReport {
  const quarters = input.quarters
    .map((q) => ({ ...q, positions: mergeByTicker(q.positions) }))
    .sort((a, b) => a.filedAt.localeCompare(b.filedAt));
  const latest = quarters[quarters.length - 1];
  const prev = quarters.length > 1 ? quarters[quarters.length - 2] : null;
  const total = totalOf(latest);
  const prevTotal = prev ? totalOf(prev) : 0;
  // Matched by ticker where known, since the largest share class (and so the CUSIP) can change.
  const keyOf = (p: ResolvedPosition) => p.ticker ?? p.cusip;
  const prevByKey = new Map(prev?.positions.map((p) => [keyOf(p), p]));
  const latestKeys = new Set(latest.positions.map(keyOf));

  const holdings: ManagerHolding[] = latest.positions.slice(0, SHOWN_HOLDINGS).map((p) => {
    let change: Change | null = null;
    let sharesChangePct: number | null = null;
    if (prev) {
      const before = prevByKey.get(keyOf(p));
      if (!before) change = "new";
      else if (before.shares > 0) {
        const factor = p.ticker
          ? splitFactor(input.prices.get(p.ticker)?.splits, prev.reportDate, latest.reportDate)
          : 1;
        const delta = p.shares / (before.shares * factor) - 1;
        sharesChangePct = delta * 100;
        if (delta >= CHANGE_THRESHOLD) change = "added";
        else if (delta <= -CHANGE_THRESHOLD) change = "reduced";
      }
    }
    return {
      cusip: p.cusip,
      ticker: p.ticker,
      name: p.displayName,
      value: p.value,
      pct: total > 0 ? (p.value / total) * 100 : 0,
      change,
      sharesChangePct,
    };
  });

  const soldOut: SoldOut[] = (prev?.positions ?? [])
    .filter((p) => !latestKeys.has(keyOf(p)) && prevTotal > 0 && p.value / prevTotal >= 0.001)
    .map((p) => ({ ticker: p.ticker, name: p.displayName, prevPct: (p.value / prevTotal) * 100 }))
    .sort((a, b) => b.prevPct - a.prevPct)
    .slice(0, SHOWN_SOLD);

  const prices = new Map([...input.prices].map(([t, h]) => [t, h.points]));
  const clone = computeClone(
    quarters.map((q) => ({
      filedAt: q.filedAt,
      totalValue: totalOf(q),
      holdings: positionsToPrice(q).map((p) => ({ ticker: p.ticker as string, value: p.value })),
    })),
    prices,
    input.bench
  );

  const matched = latest.positions.filter((p) => p.ticker).reduce((s, p) => s + p.value, 0);
  return {
    cik: input.cik,
    filer: input.filer,
    reportDate: latest.reportDate,
    filedAt: latest.filedAt,
    totalValue: total,
    positionCount: latest.positionCount ?? latest.positions.length,
    holdings,
    soldOut,
    clone,
    quartersUsed: quarters.length,
    matchedPct: total > 0 ? (matched / total) * 100 : 0,
    builtAt: input.builtAt ?? new Date().toISOString(),
  };
}
