import { classifyLynch, computePeg, numOrNull } from "./metrics";
import { NO_REVENUE_GROWTH } from "./revenue";
import type { Fundamentals } from "./types";

/** Finnhub's `metric` object from stock/metric?metric=all. */
export type FinnhubMetric = Record<string, unknown>;

// Finnhub reports percentages as whole numbers (17.05 = 17.05%); we store fractions.
const pct = (v: unknown): number | null => {
  const n = numOrNull(v);
  return n === null ? null : n / 100;
};

/** Finnhub returns an empty object for symbols it has no data on. */
export const hasMetrics = (metric: FinnhubMetric | undefined): metric is FinnhubMetric =>
  Boolean(metric && Object.keys(metric).length > 0);

export function normalizeFundamentals(
  constituent: { symbol: string; name: string; sector: string },
  metric: FinnhubMetric
): Fundamentals {
  const pe = numOrNull(metric.peTTM);
  const epsCagr5y = pct(metric.epsGrowth5Y);
  const pfcf = numOrNull(metric.pfcfShareTTM);

  return {
    symbol: constituent.symbol,
    name: constituent.name,
    sector: constituent.sector,
    // A negative P/E means losses; treat it as no P/E.
    pe: pe !== null && pe > 0 ? pe : null,
    peg: computePeg(pe, epsCagr5y),
    priceToBook: numOrNull(metric.pbQuarterly),
    debtToEquity: numOrNull(metric["totalDebt/totalEquityQuarterly"]),
    interestCoverage: numOrNull(metric.netInterestCoverageTTM),
    roe: pct(metric.roeTTM),
    // Finnhub's "return on investment", the closest it offers to ROIC.
    roic: pct(metric.roiTTM),
    fcfYield: pfcf !== null && pfcf > 0 ? 1 / pfcf : null,
    grossMargin: pct(metric.grossMarginTTM),
    netMargin: pct(metric.netProfitMarginTTM),
    revenueGrowth: pct(metric.revenueGrowthTTMYoy),
    epsGrowth: pct(metric.epsGrowthTTMYoy),
    epsCagr5y,
    ...NO_REVENUE_GROWTH,
    category: classifyLynch({ sector: constituent.sector, pe, epsCagr5y }),
  };
}
