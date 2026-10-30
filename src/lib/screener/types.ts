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
  pe: number | null;
  /** Own PEG: P/E over 5-year EPS CAGR (in %). The provider's PEG swings too much to trust. */
  peg: number | null;
  priceToBook: number | null;
  debtToEquity: number | null;
  interestCoverage: number | null;
  roe: number | null;
  roic: number | null;
  fcfYield: number | null;
  grossMargin: number | null;
  netMargin: number | null;
  revenueGrowth: number | null;
  epsGrowth: number | null;
  /** 5-year EPS growth, already annualised by the provider. */
  epsCagr5y: number | null;
  /** Revenue CAGR from SEC filings. Null when there isn't enough history. Older cached rows may lack these. */
  revenueCagr3y: number | null;
  revenueCagr5y: number | null;
  revenueCagr10y: number | null;
  category: LynchCategory;
}

/** Marker row for symbols the data plan won't return fundamentals for. */
export interface RestrictedMarker {
  symbol: string;
  restricted: true;
}

export type StoredData = Fundamentals | RestrictedMarker;

export function hasFundamentals(d: StoredData): d is Fundamentals {
  if ("restricted" in d) return false;
  // Older rows saved profile-only data when ratio endpoints were locked.
  return [d.pe, d.roic, d.roe, d.debtToEquity, d.epsGrowth, d.revenueGrowth].some(
    (v) => v !== null
  );
}

export interface StoredFundamentals {
  data: StoredData;
  fetchedAt: string;
}
