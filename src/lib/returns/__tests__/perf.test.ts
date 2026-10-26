import { describe, expect, it } from "vitest";
import { chartSeries, chartStart, periodStats, windowStart, type PerfSeries } from "../perf";

const dates = [
  "2024-12-30", "2024-12-31", "2025-01-02", "2025-02-03", "2025-03-03",
  "2025-06-02", "2025-12-01", "2025-12-31",
];

const series = (firstIdx: number | null, t: (number | null)[]): PerfSeries => ({
  v: t.map((x) => (x === null ? 0 : x * 10)),
  cf: t.map((x) => (x === null ? 0 : 1000)),
  t,
  firstIdx,
});

describe("windowStart", () => {
  it("finds the last day on or before the period start", () => {
    expect(dates[windowStart(dates, "1M", 0)!]).toBe("2025-12-01");
    expect(dates[windowStart(dates, "6M", 0)!]).toBe("2025-06-02");
    expect(dates[windowStart(dates, "1Y", 0)!]).toBe("2024-12-31");
  });

  it("starts YTD on the last day of the prior year", () => {
    expect(dates[windowStart(dates, "YTD", 0)!]).toBe("2024-12-31");
  });

  it("is null when the account is younger than the period", () => {
    expect(windowStart(dates, "1Y", 3)).toBeNull();
    expect(windowStart(dates, "YTD", 3)).toBeNull();
    expect(windowStart(dates, "1M", 3)).not.toBeNull();
  });

  it("is null when the calendar does not reach back far enough", () => {
    expect(windowStart(["2025-06-01", "2025-12-31"], "1Y", 0)).toBeNull();
  });

  it("covers the whole account for ALL", () => {
    expect(windowStart(dates, "ALL", 3)).toBe(3);
    expect(windowStart(dates, "ALL", null)).toBeNull();
  });
});

describe("chartStart", () => {
  it("clamps to when the account began", () => {
    expect(chartStart(dates, "1Y", 3)).toBe(3);
    expect(chartStart(dates, "1M", 3)).toBe(6);
  });
});

describe("periodStats", () => {
  const t = [100, 100, 100, 100, 100, 100, 110, 121];
  const bench = [1, 1, 1, 1, 1, 1, 1.05, 1.1025];

  it("computes gain, return and the difference from the benchmark", () => {
    const s = series(0, t);
    s.v = [1000, 1000, 1000, 1000, 1000, 1000, 1100, 1210];
    s.cf = [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000];
    const p = periodStats(dates, s, bench, "ALL");
    expect(p.available).toBe(true);
    expect(p.gain).toBeCloseTo(210, 9);
    expect(p.twr).toBeCloseTo(0.21, 9);
    expect(p.bench).toBeCloseTo(0.1025, 9);
    expect(p.diff).toBeCloseTo(0.1075, 9);
  });

  it("excludes deposits made during the period from the gain", () => {
    const s = series(0, t);
    s.v = [1000, 1000, 1000, 1000, 1000, 1000, 1100, 1710];
    s.cf = [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1500]; // 500 deposited
    expect(periodStats(dates, s, bench, "1M").gain).toBeCloseTo(1710 - 1100 - 500, 9);
  });

  it("marks periods longer than the account's history unavailable", () => {
    expect(periodStats(dates, series(3, [null, null, null, 100, 100, 100, 110, 121]), bench, "1Y").available).toBe(false);
  });
});

describe("chartSeries", () => {
  it("rebases both lines to 0% at the start", () => {
    const s = series(0, [100, 100, 100, 100, 100, 100, 110, 121]);
    const pts = chartSeries(dates, s, [1, 1, 1, 1, 1, 1, 1.05, 1.1025], "1M");
    expect(pts[0]).toEqual({ date: "2025-12-01", account: 0, benchmark: 0 });
    expect(pts[pts.length - 1].account).toBeCloseTo((121 / 110 - 1) * 100, 9);
    expect(pts[pts.length - 1].benchmark).toBeCloseTo((1.1025 / 1.05 - 1) * 100, 9);
  });

  it("returns nothing for an unfunded account", () => {
    expect(chartSeries(dates, series(null, dates.map(() => null)), dates.map(() => 1), "1Y")).toEqual([]);
  });
});
