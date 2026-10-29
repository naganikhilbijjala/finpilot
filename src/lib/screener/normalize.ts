import { annualise, classifyLynch, computePeg, numOrNull } from "./metrics";
import type { Fundamentals } from "./types";

type Row = Record<string, unknown> | undefined;

export interface RawFundamentals {
  profile: Row;
  ratios: Row; // ratios-ttm
  metrics: Row; // key-metrics-ttm
  growth: Row; // financial-growth (latest annual)
}

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : null;

/** Flattens the four FMP responses into one Fundamentals row. */
export function normalizeFundamentals(
  symbol: string,
  raw: RawFundamentals
): Fundamentals {
  const { profile, ratios, metrics, growth } = raw;

  const pe = numOrNull(ratios?.priceToEarningsRatioTTM);
  // The provider reports 0 when there's no interest expense; that's "no debt cost", not "can't pay".
  const coverage = numOrNull(ratios?.interestCoverageRatioTTM);
  const epsCagr5y = annualise(numOrNull(growth?.fiveYNetIncomeGrowthPerShare), 5);
  const sector = str(profile?.sector);

  return {
    symbol,
    name: str(profile?.companyName),
    sector,
    industry: str(profile?.industry),
    price: numOrNull(profile?.price),
    marketCap: numOrNull(profile?.marketCap),
    pe,
    peg: computePeg(pe, epsCagr5y),
    priceToBook: numOrNull(ratios?.priceToBookRatioTTM),
    debtToEquity: numOrNull(ratios?.debtToEquityRatioTTM),
    interestCoverage: coverage === 0 ? null : coverage,
    roe: numOrNull(metrics?.returnOnEquityTTM),
    roic: numOrNull(metrics?.returnOnInvestedCapitalTTM),
    fcfYield: numOrNull(metrics?.freeCashFlowYieldTTM),
    grossMargin: numOrNull(ratios?.grossProfitMarginTTM),
    netMargin: numOrNull(ratios?.netProfitMarginTTM),
    revenueGrowth: numOrNull(growth?.revenueGrowth),
    epsGrowth: numOrNull(growth?.epsgrowth),
    epsCagr5y,
    shareCountChange: numOrNull(growth?.weightedAverageSharesDilutedGrowth),
    category: classifyLynch({ sector, pe, epsCagr5y }),
  };
}
