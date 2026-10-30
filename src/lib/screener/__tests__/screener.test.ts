import { describe, expect, it } from "vitest";
import { classifyLynch, computePeg } from "../metrics";
import { hasMetrics, normalizeFundamentals } from "../normalize";
import { parseCriteria } from "../params";
import { runScreen, screenStock } from "../screen";
import { hasFundamentals, type Fundamentals } from "../types";

// Real values from Finnhub stock/metric for BALL, trimmed to the fields we read.
const BALL = { symbol: "BALL", name: "Ball Corp", sector: "Materials" };
const BALL_METRIC = {
  peTTM: 17.9143, pbQuarterly: 2.8914, "totalDebt/totalEquityQuarterly": 1.2565,
  netInterestCoverageTTM: 4.9718, roeTTM: 17.05, roiTTM: 7.36, grossMarginTTM: 18.63,
  netProfitMarginTTM: 6.61, epsGrowth5Y: 13.47, epsGrowthTTMYoy: 82.34,
  revenueGrowthTTMYoy: 15.56, pfcfShareTTM: 9.6118,
};
const MMM = { symbol: "MMM", name: "3M", sector: "Industrials" };

const stock = (over: Partial<Fundamentals> = {}): Fundamentals => ({
  symbol: "TEST", name: "Test Co", sector: "Technology", pe: 20, peg: 1, priceToBook: 3, debtToEquity: 0.5,
  interestCoverage: 10, roe: 0.2, roic: 0.18, fcfYield: 0.05, grossMargin: 0.5,
  netMargin: 0.15, revenueGrowth: 0.1, epsGrowth: 0.15, epsCagr5y: 0.2,
  revenueCagr3y: 0.12, revenueCagr5y: 0.11, revenueCagr10y: 0.1,
  category: "fast_grower", ...over,
});

describe("metrics", () => {
  it("computes PEG only for positive P/E and growth", () => {
    expect(computePeg(20, 0.2)).toBeCloseTo(1);
    expect(computePeg(-5, 0.2)).toBeNull();
    expect(computePeg(20, -0.1)).toBeNull();
    expect(computePeg(null, 0.2)).toBeNull();
  });

  it("classifies Lynch categories", () => {
    expect(classifyLynch({ sector: "Technology", pe: 30, epsCagr5y: 0.25 })).toBe("fast_grower");
    expect(classifyLynch({ sector: "Technology", pe: 20, epsCagr5y: 0.12 })).toBe("stalwart");
    expect(classifyLynch({ sector: "Utilities", pe: 18, epsCagr5y: 0.04 })).toBe("slow_grower");
    expect(classifyLynch({ sector: "Energy", pe: 9, epsCagr5y: 0.3 })).toBe("cyclical");
    expect(classifyLynch({ sector: "Technology", pe: null, epsCagr5y: 0.1 })).toBe("turnaround");
    expect(classifyLynch({ sector: "Technology", pe: 12, epsCagr5y: -0.05 })).toBe("turnaround");
    expect(classifyLynch({ sector: "Technology", pe: 12, epsCagr5y: null })).toBe("unclassified");
  });
});

describe("normalizeFundamentals", () => {
  const f = normalizeFundamentals(BALL, BALL_METRIC);

  it("converts Finnhub percentages to fractions", () => {
    expect(f).toMatchObject({ symbol: "BALL", name: "Ball Corp", sector: "Materials" });
    expect(f.roe).toBeCloseTo(0.1705, 4);
    expect(f.roic).toBeCloseTo(0.0736, 4);
    expect(f.netMargin).toBeCloseTo(0.0661, 4);
    expect(f.epsCagr5y).toBeCloseTo(0.1347, 4);
    expect(f.debtToEquity).toBeCloseTo(1.2565, 4);
  });

  it("derives own PEG and FCF yield", () => {
    expect(f.peg).toBeCloseTo(17.9143 / 13.47, 3);
    expect(f.fcfYield).toBeCloseTo(1 / 9.6118, 4);
  });

  it("labels Energy and Materials cyclical", () => {
    expect(f.category).toBe("cyclical");
  });

  it("handles shrinking earnings and loss-making stocks", () => {
    const mmm = normalizeFundamentals(MMM, { peTTM: 25.78, epsGrowth5Y: -8.5, pfcfShareTTM: 33.5 });
    expect(mmm.category).toBe("turnaround");
    expect(mmm.peg).toBeNull();
    const loss = normalizeFundamentals(MMM, { peTTM: -4, epsGrowth5Y: 10, pfcfShareTTM: -2 });
    expect(loss.pe).toBeNull();
    expect(loss.fcfYield).toBeNull();
  });

  it("treats an empty metric object as no data", () => {
    expect(hasMetrics({})).toBe(false);
    expect(hasMetrics(undefined)).toBe(false);
    expect(hasMetrics(BALL_METRIC)).toBe(true);
  });
});

describe("screening", () => {
  it("fails a criterion when data is missing", () => {
    const r = screenStock(stock({ roic: null }), { minRoic: 0.15 });
    expect(r.passed).toBe(false);
    expect(r.checks[0].passed).toBe(false);
  });

  it("requires a positive P/E for the max P/E filter", () => {
    expect(screenStock(stock({ pe: -3 }), { maxPe: 15 }).passed).toBe(false);
  });

  it("applies every active criterion", () => {
    const c = { maxPeg: 1.5, minRoic: 0.15, maxDebtToEquity: 1 };
    expect(screenStock(stock(), c).passed).toBe(true);
    expect(screenStock(stock({ debtToEquity: 2 }), c).passed).toBe(false);
  });

  it("sorts by PEG with unknown PEG last", () => {
    const out = runScreen(
      [stock({ symbol: "B", peg: 1.2 }), stock({ symbol: "C", peg: null }), stock({ symbol: "A", peg: 0.8 })],
      {}
    );
    expect(out.map((r) => r.stock.symbol)).toEqual(["A", "B", "C"]);
  });
});

describe("revenue growth filters", () => {
  it("applies 10-year revenue growth and fails when it is unknown", () => {
    expect(screenStock(stock(), { minRevCagr10y: 0.08 }).passed).toBe(true);
    expect(screenStock(stock({ revenueCagr10y: 0.05 }), { minRevCagr10y: 0.08 }).passed).toBe(false);
    expect(screenStock(stock({ revenueCagr10y: null }), { minRevCagr10y: 0.08 }).passed).toBe(false);
  });

  it("tolerates cached rows saved before revenue growth existed", () => {
    const old = { ...stock(), revenueCagr10y: undefined } as unknown as Fundamentals;
    expect(screenStock(old, { minRevCagr10y: 0.08 }).passed).toBe(false);
  });
});

describe("parseCriteria", () => {
  it("scales percent fields and drops empties", () => {
    expect(parseCriteria({ maxPe: "20", minRoic: "15", minRoe: "" })).toEqual({
      maxPe: 20, minRoic: 0.15,
    });
  });

  it("uses a preset when named and ignores junk", () => {
    expect(parseCriteria({ preset: "lynch" }).maxPeg).toBe(1.5);
    expect(parseCriteria({ maxPe: "abc", category: "nope" })).toEqual({});
  });
});

describe("hasFundamentals", () => {
  const profileOnly = { ...stock(), pe: null, roic: null, roe: null, debtToEquity: null, epsGrowth: null, revenueGrowth: null };

  it("rejects restricted markers and old profile-only rows", () => {
    expect(hasFundamentals({ symbol: "BALL", restricted: true })).toBe(false);
    expect(hasFundamentals(profileOnly)).toBe(false);
  });

  it("accepts rows with real numbers", () => {
    expect(hasFundamentals(stock())).toBe(true);
  });
});
