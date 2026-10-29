export type LynchCategory =
  | "fast_grower"
  | "stalwart"
  | "slow_grower"
  | "cyclical"
  | "turnaround"
  | "unclassified";

/** One stock's fundamentals, flattened from the provider. Ratios are plain
 *  numbers (0.15 = 15%); null means the provider had no usable value. */
export interface Fundamentals {
  symbol: string;
  name: string | null;
  sector: string | null;
  industry: string | null;
  price: number | null;
  marketCap: number | null;
  pe: number | null;
  /** Own PEG: P/E over 5-year EPS CAGR (in %). The provider's PEG swings too much to trust. */
  peg: number | null;
  priceToBook: number | null;
  debtToEquity: number | null;
  /** Null when no interest expense is reported (provider returns 0). */
  interestCoverage: number | null;
  roe: number | null;
  roic: number | null;
  fcfYield: number | null;
  grossMargin: number | null;
  netMargin: number | null;
  revenueGrowth: number | null;
  epsGrowth: number | null;
  /** Annualised from the provider's cumulative 5-year per-share net income growth. */
  epsCagr5y: number | null;
  /** Year-over-year change in diluted share count; negative means buybacks. */
  shareCountChange: number | null;
  category: LynchCategory;
}

export interface StoredFundamentals {
  data: Fundamentals;
  fetchedAt: string;
}
