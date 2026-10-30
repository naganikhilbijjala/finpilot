import type { Fundamentals, LynchCategory } from "./types";

export interface ScreenCriteria {
  maxPe?: number;
  maxPeg?: number;
  maxDebtToEquity?: number;
  minRoic?: number;
  minRoe?: number;
  minEpsCagr?: number;
  minRevCagr5y?: number;
  minRevCagr10y?: number;
  minFcfYield?: number;
  minNetMargin?: number;
  category?: LynchCategory;
  sector?: string;
}

export interface ScreenCheck {
  label: string;
  passed: boolean;
}

export interface ScreenResult {
  stock: Fundamentals;
  checks: ScreenCheck[];
  /** Every active criterion passed. */
  passed: boolean;
}

const pct = (v: number) => `${(v * 100).toFixed(0)}%`;

// Missing data fails a criterion: never surface a stock on numbers we don't have.
const atMost = (v: number | null, max: number) => v !== null && v <= max;
const atLeast = (v: number | null, min: number) => v !== null && v >= min;

export function screenStock(
  stock: Fundamentals,
  c: ScreenCriteria
): ScreenResult {
  const checks: ScreenCheck[] = [];
  const add = (label: string, passed: boolean) => checks.push({ label, passed });

  if (c.maxPe !== undefined) add(`P/E ≤ ${c.maxPe}`, stock.pe !== null && stock.pe > 0 && stock.pe <= c.maxPe);
  if (c.maxPeg !== undefined) add(`PEG ≤ ${c.maxPeg}`, atMost(stock.peg, c.maxPeg));
  if (c.maxDebtToEquity !== undefined) add(`D/E ≤ ${c.maxDebtToEquity}`, atMost(stock.debtToEquity, c.maxDebtToEquity));
  if (c.minRoic !== undefined) add(`ROIC ≥ ${pct(c.minRoic)}`, atLeast(stock.roic, c.minRoic));
  if (c.minRoe !== undefined) add(`ROE ≥ ${pct(c.minRoe)}`, atLeast(stock.roe, c.minRoe));
  if (c.minEpsCagr !== undefined) add(`EPS growth ≥ ${pct(c.minEpsCagr)}/yr`, atLeast(stock.epsCagr5y, c.minEpsCagr));
  if (c.minRevCagr5y !== undefined) add(`Revenue growth 5y ≥ ${pct(c.minRevCagr5y)}/yr`, atLeast(stock.revenueCagr5y ?? null, c.minRevCagr5y));
  if (c.minRevCagr10y !== undefined) add(`Revenue growth 10y ≥ ${pct(c.minRevCagr10y)}/yr`, atLeast(stock.revenueCagr10y ?? null, c.minRevCagr10y));
  if (c.minFcfYield !== undefined) add(`FCF yield ≥ ${pct(c.minFcfYield)}`, atLeast(stock.fcfYield, c.minFcfYield));
  if (c.minNetMargin !== undefined) add(`Net margin ≥ ${pct(c.minNetMargin)}`, atLeast(stock.netMargin, c.minNetMargin));
  if (c.category) add(`Type: ${c.category}`, stock.category === c.category);
  if (c.sector) add(`Sector: ${c.sector}`, stock.sector === c.sector);

  return { stock, checks, passed: checks.every((k) => k.passed) };
}

export function runScreen(
  stocks: Fundamentals[],
  criteria: ScreenCriteria
): ScreenResult[] {
  return stocks
    .map((s) => screenStock(s, criteria))
    .filter((r) => r.passed)
    // Cheapest relative to growth first; unknown PEG last.
    .sort((a, b) => (a.stock.peg ?? Infinity) - (b.stock.peg ?? Infinity));
}

/** Starting points; sliders in the UI start from these. */
export const PRESETS: Record<string, { label: string; blurb: string; criteria: ScreenCriteria }> = {
  lynch: {
    label: "Lynch growth at a fair price",
    blurb: "Growing 15%+ a year, PEG under 1.5, modest debt.",
    criteria: { minEpsCagr: 0.15, maxPeg: 1.5, maxDebtToEquity: 1 },
  },
  quality: {
    label: "Quality compounders",
    blurb: "High returns on capital, real margins, modest debt.",
    criteria: { minRoic: 0.15, minNetMargin: 0.1, maxDebtToEquity: 1 },
  },
  longTerm: {
    label: "Long-term growers",
    blurb: "Revenue up 10%+ a year for a decade, high returns on capital, modest debt.",
    criteria: { minRevCagr10y: 0.1, minRoic: 0.12, maxDebtToEquity: 1 },
  },
  value: {
    label: "Cheap with cash flow",
    blurb: "Low P/E, solid free cash flow yield, low debt.",
    criteria: { maxPe: 15, minFcfYield: 0.06, maxDebtToEquity: 0.8 },
  },
};
