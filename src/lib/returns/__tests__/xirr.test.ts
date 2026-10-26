import { describe, expect, it } from "vitest";
import { xirr } from "../xirr";

const d = (s: string) => new Date(`${s}T00:00:00Z`);

describe("xirr", () => {
  it("matches Excel's documented XIRR example", () => {
    // From Microsoft's XIRR documentation: result 0.373362535
    const r = xirr([
      { amount: -10000, when: d("2008-01-01") },
      { amount: 2750, when: d("2008-03-01") },
      { amount: 4250, when: d("2008-10-30") },
      { amount: 3250, when: d("2009-02-15") },
      { amount: 2750, when: d("2009-04-01") },
    ]);
    expect(r).toBeCloseTo(0.373362535, 6);
  });

  it("returns exactly 10% for 1000 -> 1100 over 365 days", () => {
    const r = xirr([
      { amount: -1000, when: d("2025-01-01") },
      { amount: 1100, when: d("2026-01-01") },
    ]);
    expect(r).toBeCloseTo(0.1, 9);
  });

  it("handles losses", () => {
    const r = xirr([
      { amount: -1000, when: d("2025-01-01") },
      { amount: 900, when: d("2026-01-01") },
    ]);
    expect(r).toBeCloseTo(-0.1, 9);
  });

  it("does not depend on flow order", () => {
    const flows = [
      { amount: 1100, when: d("2026-01-01") },
      { amount: -1000, when: d("2025-01-01") },
    ];
    expect(xirr(flows)).toBeCloseTo(0.1, 9);
  });

  it("is order-independent of the dates for multiple deposits (DCA)", () => {
    const r = xirr([
      { amount: -100, when: d("2025-01-01") },
      { amount: -100, when: d("2025-07-01") },
      { amount: 230, when: d("2026-01-01") },
    ])!;
    expect(r).toBeGreaterThan(0.1);
    expect(r).toBeLessThan(0.4);
  });

  it("returns null without both an inflow and an outflow", () => {
    expect(xirr([])).toBeNull();
    expect(xirr([{ amount: -100, when: d("2025-01-01") }])).toBeNull();
    expect(
      xirr([
        { amount: -100, when: d("2025-01-01") },
        { amount: -50, when: d("2025-06-01") },
      ])
    ).toBeNull();
  });

  it("returns null for meaningless extreme rates from tiny windows", () => {
    expect(
      xirr([
        { amount: -100, when: d("2026-01-01") },
        { amount: 200, when: d("2026-01-02") },
      ])
    ).toBeNull();
  });

  it("ignores zero and non-finite amounts", () => {
    const r = xirr([
      { amount: -1000, when: d("2025-01-01") },
      { amount: 0, when: d("2025-06-01") },
      { amount: NaN, when: d("2025-07-01") },
      { amount: 1100, when: d("2026-01-01") },
    ]);
    expect(r).toBeCloseTo(0.1, 9);
  });
});
