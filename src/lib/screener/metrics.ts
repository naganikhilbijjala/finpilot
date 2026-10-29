import type { LynchCategory } from "./types";

const finite = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

export const numOrNull = (v: unknown): number | null => (finite(v) ? v : null);

/** Annualises a cumulative growth figure (0.76 over 5y -> ~12% a year). */
export function annualise(cumulative: number | null, years: number): number | null {
  if (cumulative === null || cumulative <= -1) return null;
  return (1 + cumulative) ** (1 / years) - 1;
}

/** Lynch's PEG: P/E divided by growth in percent. Undefined without positive P/E and growth. */
export function computePeg(pe: number | null, growth: number | null): number | null {
  if (pe === null || growth === null || pe <= 0 || growth <= 0) return null;
  return pe / (growth * 100);
}

// Earnings of these sectors follow the economic cycle, so a low P/E at the
// top of the cycle is a warning, not a bargain.
const CYCLICAL_SECTORS = new Set(["Energy", "Materials"]);

/** Rough Lynch buckets from growth alone; a starting point, not a verdict. */
export function classifyLynch(input: {
  sector: string | null;
  pe: number | null;
  epsCagr5y: number | null;
}): LynchCategory {
  const { sector, pe, epsCagr5y: g } = input;
  if (sector && CYCLICAL_SECTORS.has(sector)) return "cyclical";
  if (g === null) return "unclassified";
  // No positive P/E means the company isn't earning a profit right now.
  if (pe === null || g < 0) return "turnaround";
  if (g >= 0.2) return "fast_grower";
  if (g >= 0.1) return "stalwart";
  return "slow_grower";
}

export const CATEGORY_LABELS: Record<LynchCategory, string> = {
  fast_grower: "Fast grower",
  stalwart: "Stalwart",
  slow_grower: "Slow grower",
  cyclical: "Cyclical",
  turnaround: "Turnaround",
  unclassified: "Unclassified",
};
