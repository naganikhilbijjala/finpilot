import { describe, expect, it } from "vitest";
import {
  annualSeries,
  cagr,
  revenueGrowth,
  revenueSeries,
  type FactEntry,
  type UsGaap,
} from "../revenue";

const fy = (year: number, val: number, over: Partial<FactEntry> = {}): FactEntry => ({
  start: `${year}-01-01`,
  end: `${year}-12-31`,
  val,
  filed: `${year + 1}-02-15`,
  form: "10-K",
  ...over,
});

const gaap = (tag: string, entries: FactEntry[]): UsGaap => ({ [tag]: { units: { USD: entries } } });

describe("annualSeries", () => {
  it("keeps only ~12-month 10-K periods", () => {
    const s = annualSeries([
      fy(2020, 100),
      fy(2021, 50, { start: "2021-01-01", end: "2021-03-31" }), // a quarter
      fy(2022, 70, { form: "10-Q" }),
      fy(2023, 80, { start: undefined }),
    ]);
    expect([...s.keys()]).toEqual(["2020-12-31"]);
  });

  it("lets the latest filing win a restatement", () => {
    const s = annualSeries([fy(2020, 100), fy(2020, 95, { filed: "2022-02-15" })]);
    expect(s.get("2020-12-31")).toBe(95);
  });
});

describe("cagr", () => {
  const series = new Map<string, number>();
  for (let y = 2014; y <= 2024; y++) series.set(`${y}-12-31`, 100 * 1.1 ** (y - 2014));

  it("computes CAGR over the requested window", () => {
    expect(cagr(series, 10)).toBeCloseTo(0.1, 6);
    expect(cagr(series, 3)).toBeCloseTo(0.1, 6);
  });

  it("is null when history is too short", () => {
    expect(cagr(series, 15)).toBeNull();
    expect(cagr(new Map(), 5)).toBeNull();
  });

  it("is null for non-positive endpoints", () => {
    const bad = new Map([["2014-12-31", -5], ["2024-12-31", 100]]);
    expect(cagr(bad, 10)).toBeNull();
  });
});

describe("revenueSeries", () => {
  it("stitches older years from another tag", () => {
    const g: UsGaap = {
      ...gaap("SalesRevenueNet", [fy(2012, 80), fy(2013, 90)]),
      ...gaap("Revenues", [fy(2014, 100), fy(2015, 110)]),
    };
    const s = revenueSeries(g)!;
    expect([...s.keys()].sort()).toEqual(["2012-12-31", "2013-12-31", "2014-12-31", "2015-12-31"]);
  });

  it("does not double count a fiscal year reported under two tags", () => {
    const g: UsGaap = {
      ...gaap("SalesRevenueNet", [fy(2014, 99)]),
      ...gaap("Revenues", [fy(2014, 100), fy(2015, 110)]),
    };
    const s = revenueSeries(g)!;
    expect(s.size).toBe(2);
    expect(s.get("2014-12-31")).toBe(100);
  });

  it("is null when no revenue tag exists", () => {
    expect(revenueSeries({})).toBeNull();
  });
});

describe("revenueGrowth", () => {
  it("returns nulls for a company with no history (e.g. a new CIK)", () => {
    expect(revenueGrowth({})).toEqual({ revenueCagr3y: null, revenueCagr5y: null, revenueCagr10y: null });
  });

  it("reports only the windows the history covers", () => {
    const entries = [2019, 2020, 2021, 2022, 2023, 2024].map((y, i) => fy(y, 100 * 1.2 ** i));
    const g = revenueGrowth(gaap("Revenues", entries));
    expect(g.revenueCagr5y).toBeCloseTo(0.2, 6);
    expect(g.revenueCagr3y).toBeCloseTo(0.2, 6);
    expect(g.revenueCagr10y).toBeNull();
  });
});
