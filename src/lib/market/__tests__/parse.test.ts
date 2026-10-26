import { describe, expect, it } from "vitest";
import { parseYahooChart } from "../parse";

const ts = (d: string) => Math.floor(new Date(`${d}T14:30:00Z`).getTime() / 1000);

const fixture = {
  chart: {
    result: [
      {
        meta: { symbol: "XYZ" },
        timestamp: [ts("2025-01-02"), ts("2025-01-03"), ts("2025-01-06"), ts("2025-01-07")],
        events: {
          splits: {
            [ts("2025-01-06")]: { date: ts("2025-01-06"), numerator: 10, denominator: 1 },
          },
        },
        indicators: {
          quote: [{ close: [100, null, 10.5, 11] }],
          adjclose: [{ adjclose: [99, null, 10.4, 11] }],
        },
      },
    ],
    error: null,
  },
};

describe("parseYahooChart", () => {
  it("parses prices, skipping null closes", () => {
    const h = parseYahooChart(fixture, "XYZ");
    expect(h.points.map((p) => p.date)).toEqual(["2025-01-02", "2025-01-06", "2025-01-07"]);
    expect(h.points[0]).toEqual({ date: "2025-01-02", close: 100, adjclose: 99 });
  });

  it("parses split events into share multipliers", () => {
    expect(parseYahooChart(fixture, "XYZ").splits).toEqual([{ date: "2025-01-06", factor: 10 }]);
  });

  it("falls back to close when adjclose is missing", () => {
    const f = structuredClone(fixture);
    delete (f.chart.result[0].indicators as { adjclose?: unknown }).adjclose;
    expect(parseYahooChart(f, "XYZ").points[0].adjclose).toBe(100);
  });

  it("throws on API errors and empty results", () => {
    expect(() => parseYahooChart({ chart: { error: { description: "Not Found" } } }, "BAD")).toThrow(/BAD/);
    expect(() => parseYahooChart({ chart: { result: null } }, "BAD")).toThrow(/BAD/);
    expect(() => parseYahooChart({}, "BAD")).toThrow();
  });
});
