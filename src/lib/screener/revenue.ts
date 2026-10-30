// Revenue growth from SEC XBRL "companyfacts". Pure: takes the parsed `us-gaap`
// object so it can be tested without the network.

export interface FactEntry {
  start?: string;
  end: string;
  val: number;
  filed: string;
  form: string;
}

export type UsGaap = Record<string, { units?: { USD?: FactEntry[] } } | undefined>;

export interface RevenueGrowth {
  revenueCagr3y: number | null;
  revenueCagr5y: number | null;
  revenueCagr10y: number | null;
}

// Companies label revenue differently, and change labels over the years.
export const REVENUE_TAGS = [
  "Revenues",
  "RevenueFromContractWithCustomerExcludingAssessedTax",
  "RevenueFromContractWithCustomerIncludingAssessedTax",
  "SalesRevenueNet",
  "SalesRevenueGoodsNet",
  "RevenuesNetOfInterestExpense",
];

const DAY = 86_400_000;
const daysBetween = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / DAY;

/** end date -> value for ~12-month periods from 10-Ks; the latest filing wins (restatements). */
export function annualSeries(entries: FactEntry[]): Map<string, number> {
  const best = new Map<string, FactEntry>();
  for (const e of entries) {
    if ((e.form !== "10-K" && e.form !== "10-K/A") || !e.start) continue;
    const span = daysBetween(e.start, e.end);
    if (span < 350 || span > 380) continue;
    const cur = best.get(e.end);
    if (!cur || e.filed > cur.filed) best.set(e.end, e);
  }
  return new Map([...best].map(([end, e]) => [end, e.val]));
}

/**
 * Uses the tag reported most recently as the base, then fills older years
 * from other tags where the base has a gap.
 */
export function seriesFromTags(usGaap: UsGaap, tags: string[]): Map<string, number> | null {
  const candidates = tags.map((t) => annualSeries(usGaap[t]?.units?.USD ?? [])).filter(
    (s) => s.size > 0
  );
  if (candidates.length === 0) return null;

  const latest = (s: Map<string, number>) => [...s.keys()].sort().at(-1)!;
  candidates.sort((a, b) => latest(b).localeCompare(latest(a)) || b.size - a.size);

  const merged = new Map(candidates[0]);
  for (const s of candidates.slice(1)) {
    for (const [end, val] of s) {
      // Skip years within ~40 days of one we already have (same fiscal year).
      if (![...merged.keys()].some((m) => daysBetween(end, m) < 40)) merged.set(end, val);
    }
  }
  return merged;
}

export const revenueSeries = (usGaap: UsGaap) => seriesFromTags(usGaap, REVENUE_TAGS);

/** CAGR over `years` ending at the latest annual figure; null if history is too short or a value is non-positive. */
export function cagr(series: Map<string, number>, years: number): number | null {
  const ends = [...series.keys()].sort();
  const lastEnd = ends.at(-1);
  if (!lastEnd) return null;

  const target = new Date(lastEnd);
  target.setUTCFullYear(target.getUTCFullYear() - years);
  const targetIso = target.toISOString().slice(0, 10);
  const firstEnd = ends.reduce((a, b) => (daysBetween(b, targetIso) < daysBetween(a, targetIso) ? b : a));
  if (daysBetween(firstEnd, targetIso) > 40) return null;

  const first = series.get(firstEnd)!;
  const last = series.get(lastEnd)!;
  return first > 0 && last > 0 ? (last / first) ** (1 / years) - 1 : null;
}

export function revenueGrowth(usGaap: UsGaap): RevenueGrowth {
  const series = revenueSeries(usGaap);
  return {
    revenueCagr3y: series ? cagr(series, 3) : null,
    revenueCagr5y: series ? cagr(series, 5) : null,
    revenueCagr10y: series ? cagr(series, 10) : null,
  };
}

export const NO_REVENUE_GROWTH: RevenueGrowth = {
  revenueCagr3y: null,
  revenueCagr5y: null,
  revenueCagr10y: null,
};
