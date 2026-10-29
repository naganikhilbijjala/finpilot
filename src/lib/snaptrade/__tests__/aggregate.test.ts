import { describe, expect, it } from "vitest";
import { buildOverview } from "../aggregate";
import type { AccountSnapshot, PositionView, SnapshotResult } from "../types";

const pos = (ticker: string, units: number, price: number | null, avg: number | null, over: Partial<PositionView> = {}): PositionView => ({
  ticker,
  description: null,
  kind: "stock",
  units,
  price,
  averageCost: avg,
  marketValue: price === null ? null : units * price,
  unrealizedPnl: price !== null && avg !== null ? (price - avg) * units : null,
  unrealizedPct: null,
  currency: "USD",
  cashEquivalent: false,
  ...over,
});

const acct = (
  id: string,
  total: number | null,
  cash: number | null,
  positions: PositionView[],
  currency: string | null = "USD"
): AccountSnapshot => ({
  account: {
    id,
    name: id,
    institution: "Fidelity",
    maskedNumber: "••••1234",
    totalValue: total,
    cash,
    currency,
    holdingsSyncedAt: null,
    initialSyncCompleted: true,
  },
  positions,
});

const snap = (accounts: AccountSnapshot[]): SnapshotResult => ({
  fetchedAt: "2026-10-25T00:00:00Z",
  accounts,
  failures: [],
});

describe("buildOverview", () => {
  it("merges the same ticker across accounts and sums P&L", () => {
    const o = buildOverview(
      snap([
        acct("A", 1000, 0, [pos("FXAIX", 10, 100, 80)]),
        acct("B", 3000, 0, [pos("FXAIX", 30, 100, 90)]),
      ])
    );
    expect(o.holdings).toHaveLength(1);
    const h = o.holdings[0];
    expect(h.units).toBe(40);
    expect(h.marketValue).toBe(4000);
    expect(h.costBasis).toBe(10 * 80 + 30 * 90);
    expect(h.unrealizedPnl).toBe(4000 - 3500);
    expect(h.accounts.map((a) => a.accountId)).toEqual(["B", "A"]);
    expect(o.netWorth).toBe(4000);
  });

  it("counts money-market positions as cash, not holdings, without double counting", () => {
    const o = buildOverview(
      snap([acct("A", 108.42, 8.42, [pos("VTI", 1, 100, 90), pos("SPAXX", 8.42, 1, 1)])])
    );
    expect(o.holdings.map((h) => h.ticker)).toEqual(["VTI"]);
    expect(o.invested).toBe(100);
    expect(o.cash).toBe(8.42);
    expect(o.invested + o.cash).toBeCloseTo(o.netWorth, 2);
    expect(o.accounts[0].cashPct).toBeCloseTo(7.77, 1);
  });

  it("flags cash-equivalent positions by the API flag too", () => {
    const o = buildOverview(
      snap([acct("A", 50, 50, [pos("XYZ", 50, 1, 1, { cashEquivalent: true })])])
    );
    expect(o.holdings).toEqual([]);
  });

  it("computes concentration shares", () => {
    const o = buildOverview(
      snap([acct("A", 100, 0, [pos("A1", 1, 50, 50), pos("B1", 1, 30, 30), pos("C1", 1, 20, 20)])])
    );
    expect(o.concentration.top1).toEqual({ ticker: "A1", pct: 50 });
    expect(o.concentration.top5Pct).toBeCloseTo(100);
  });

  it("ranks gainers and losers and ignores unknown cost", () => {
    const o = buildOverview(
      snap([
        acct("A", 0, 0, [
          pos("UP", 10, 20, 10),
          pos("UP2", 1, 11, 10),
          pos("DOWN", 10, 8, 10),
          pos("NOCOST", 5, 10, null),
        ]),
      ])
    );
    expect(o.gainers.map((h) => h.ticker)).toEqual(["UP", "UP2"]);
    expect(o.losers.map((h) => h.ticker)).toEqual(["DOWN"]);
    // Totals exclude the unknown-cost holding so the percentage isn't distorted.
    expect(o.costBasis).toBe(100 + 10 + 100);
    expect(o.unrealizedPnl).toBe(100 + 1 - 20);
    expect(o.unrealizedPct).toBeCloseTo((81 / 210) * 100);
  });

  it("treats a holding with any unknown-cost lot as unknown cost", () => {
    const o = buildOverview(
      snap([acct("A", 0, 0, [pos("X", 1, 10, 5)]), acct("B", 0, 0, [pos("X", 1, 10, null)])])
    );
    expect(o.holdings[0].costBasis).toBeNull();
    expect(o.holdings[0].unrealizedPnl).toBeNull();
  });

  it("excludes accounts in a different currency from totals", () => {
    const o = buildOverview(
      snap([acct("US", 1000, 0, [], "USD"), acct("CA", 500, 0, [], "CAD")])
    );
    expect(o.currency).toBe("USD");
    expect(o.netWorth).toBe(1000);
    expect(o.excludedAccounts).toEqual([{ name: "CA", currency: "CAD" }]);
  });

  it("counts unpriced positions and keeps them out of values", () => {
    const o = buildOverview(snap([acct("A", 100, 0, [pos("OPT", 1, null, null)])]));
    expect(o.unpricedCount).toBe(1);
    expect(o.holdings).toEqual([]);
  });

  it("handles an empty snapshot and null totals", () => {
    const empty = buildOverview(snap([]));
    expect(empty.netWorth).toBe(0);
    expect(empty.unrealizedPct).toBeNull();
    expect(empty.concentration.top1).toBeNull();

    const o = buildOverview(snap([acct("A", null, 5, [pos("X", 2, 10, 10)])]));
    expect(o.netWorth).toBe(25);
  });

  it("passes failures through", () => {
    const s = snap([]);
    s.failures = [{ accountId: "z", accountName: "Z", message: "SnapTrade returned HTTP 500" }];
    expect(buildOverview(s).failures).toHaveLength(1);
  });
});
