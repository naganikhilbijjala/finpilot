import { describe, expect, it } from "vitest";
import { annualise, classifyLynch, computePeg } from "../metrics";
import { normalizeFundamentals } from "../normalize";
import { parseCriteria } from "../params";
import { runScreen, screenStock } from "../screen";
import type { Fundamentals } from "../types";

// Real AAPL values from FMP (stable API), trimmed to the fields we read.
const AAPL_RAW = {
  profile: { companyName: "Apple Inc.", sector: "Technology", industry: "Consumer Electronics", price: 343.83, marketCap: 5017916909400 },
  ratios: { priceToEarningsRatioTTM: 39.29, priceToBookRatioTTM: 46.87, debtToEquityRatioTTM: 0.784, interestCoverageRatioTTM: 0, grossProfitMarginTTM: 0.4865, netProfitMarginTTM: 0.2762 },
  metrics: { returnOnEquityTTM: 1.372, returnOnInvestedCapitalTTM: 0.5187, freeCashFlowYieldTTM: 0.0272 },
  growth: { revenueGrowth: 0.0643, epsgrowth: 0.2259, fiveYNetIncomeGrowthPerShare: 1.2647, weightedAverageSharesDilutedGrowth: -0.0262 },
};

const stock = (over: Partial<Fundamentals> = {}): Fundamentals => ({
  symbol: "TEST", name: "Test Co", sector: "Technology", industry: null,
  price: 100, marketCap: 1e10, pe: 20, peg: 1, priceToBook: 3, debtToEquity: 0.5,
  interestCoverage: 10, roe: 0.2, roic: 0.18, fcfYield: 0.05, grossMargin: 0.5,
  netMargin: 0.15, revenueGrowth: 0.1, epsGrowth: 0.15, epsCagr5y: 0.2,
  shareCountChange: -0.01, category: "fast_grower", ...over,
});

describe("metrics", () => {
  it("annualises cumulative growth", () => {
    expect(annualise(1.0, 5)).toBeCloseTo(0.1487, 4); // doubled in 5y
    expect(annualise(null, 5)).toBeNull();
    expect(annualise(-1, 5)).toBeNull();
  });

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
  const f = normalizeFundamentals("AAPL", AAPL_RAW);

  it("maps provider fields", () => {
    expect(f).toMatchObject({ symbol: "AAPL", name: "Apple Inc.", sector: "Technology", pe: 39.29, roic: 0.5187 });
  });

  it("derives CAGR, own PEG and category from 5y growth", () => {
    expect(f.epsCagr5y).toBeCloseTo(0.1776, 3);
    expect(f.peg).toBeCloseTo(39.29 / 17.76, 1);
    expect(f.category).toBe("stalwart");
  });

  it("treats reported interest coverage of 0 as unknown", () => {
    expect(f.interestCoverage).toBeNull();
  });

  it("survives locked or missing endpoints", () => {
    const empty = normalizeFundamentals("ZZZ", { profile: undefined, ratios: undefined, metrics: undefined, growth: undefined });
    expect(empty.pe).toBeNull();
    expect(empty.peg).toBeNull();
    expect(empty.category).toBe("unclassified");
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
    const c = { maxPeg: 1.5, minRoic: 0.15, noDilution: true };
    expect(screenStock(stock(), c).passed).toBe(true);
    expect(screenStock(stock({ shareCountChange: 0.05 }), c).passed).toBe(false);
  });

  it("sorts by PEG with unknown PEG last", () => {
    const out = runScreen(
      [stock({ symbol: "B", peg: 1.2 }), stock({ symbol: "C", peg: null }), stock({ symbol: "A", peg: 0.8 })],
      {}
    );
    expect(out.map((r) => r.stock.symbol)).toEqual(["A", "B", "C"]);
  });
});

describe("parseCriteria", () => {
  it("scales percent fields and drops empties", () => {
    expect(parseCriteria({ maxPe: "20", minRoic: "15", minRoe: "", noDilution: "on" })).toEqual({
      maxPe: 20, minRoic: 0.15, noDilution: true,
    });
  });

  it("uses a preset when named and ignores junk", () => {
    expect(parseCriteria({ preset: "lynch" }).maxPeg).toBe(1.5);
    expect(parseCriteria({ maxPe: "abc", category: "nope" })).toEqual({});
  });
});
