import { describe, expect, it } from "vitest";
import { computeReturns, type AccountInput } from "../compute";
import type { ActivityView, PositionView } from "@/lib/snaptrade/types";

const ASOF = new Date("2026-01-01T00:00:00Z");

const act = (
  date: string,
  type: string,
  ticker: string | null,
  units: number | null,
  amount: number | null,
  over: Partial<ActivityView> = {}
): ActivityView => ({
  id: null,
  date: `${date}T00:00:00Z`,
  type,
  ticker,
  units,
  price: null,
  amount,
  isOption: false,
  ...over,
});

const pos = (ticker: string, units: number, price: number | null): PositionView => ({
  ticker,
  description: null,
  units,
  price,
  averageCost: null,
  marketValue: price === null ? null : units * price,
  unrealizedPnl: null,
  unrealizedPct: null,
  currency: "USD",
  cashEquivalent: false,
});

const account = (over: Partial<AccountInput> = {}): AccountInput => ({
  id: "A",
  name: "Acct",
  totalValue: null,
  positions: [],
  activities: [],
  ...over,
});

describe("ticker returns", () => {
  it("computes a simple 10% holding", () => {
    const r = computeReturns(
      [
        account({
          activities: [act("2025-01-01", "BUY", "AAA", 10, -1000)],
          positions: [pos("AAA", 10, 110)],
        }),
      ],
      ASOF
    );
    const t = r.open[0];
    expect(t.ticker).toBe("AAA");
    expect(t.value).toBe(1100);
    expect(t.invested).toBe(1000);
    expect(t.gain).toBe(100);
    expect(t.xirr).toBeCloseTo(0.1, 9);
    expect(t.unreconciledUnits).toBe(0);
    expect(t.shortHistory).toBe(false);
  });

  it("nets a reinvested dividend (DIVIDEND + REI) and counts it once", () => {
    const r = computeReturns(
      [
        account({
          activities: [
            act("2025-01-01", "BUY", "AAA", 10, -1000),
            act("2025-07-01", "DIVIDEND", "AAA", 0, 20),
            act("2025-07-01", "REI", "AAA", 0.2, -20),
          ],
          positions: [pos("AAA", 10.2, 110)],
        }),
      ],
      ASOF
    );
    const t = r.open[0];
    expect(t.invested).toBe(1020);
    expect(t.dividends).toBe(20);
    expect(t.value).toBeCloseTo(1122, 6);
    expect(t.gain).toBeCloseTo(1122 + 20 - 1020, 6);
    expect(t.unreconciledUnits).toBe(0);
  });

  it("reports a closed position's realized return", () => {
    const r = computeReturns(
      [
        account({
          activities: [
            act("2025-01-01", "BUY", "AAA", 10, -1000),
            act("2026-01-01", "SELL", "AAA", -10, 1200),
          ],
        }),
      ],
      ASOF
    );
    expect(r.open).toEqual([]);
    const t = r.closed[0];
    expect(t.value).toBe(0);
    expect(t.gain).toBe(200);
    expect(t.xirr).toBeCloseTo(0.2, 9);
  });

  it("ends a closed position's holding period at the sale, not today", () => {
    const r = computeReturns(
      [
        account({
          activities: [
            act("2025-01-01", "BUY", "AAA", 10, -1000),
            act("2025-04-01", "SELL", "AAA", -10, 1100),
          ],
        }),
      ],
      ASOF
    );
    const t = r.closed[0];
    expect(t.since).toBe("2025-01-01");
    expect(t.until).toBe("2025-04-01");
    expect(t.years).toBeCloseTo(90 / 365, 3);
    expect(t.shortHistory).toBe(true);
    // 10% in 90 days annualizes to about 49%.
    expect(t.xirr).toBeCloseTo(Math.pow(1.1, 365 / 90) - 1, 6);
  });

  it("leaves an open position's end date empty", () => {
    const r = computeReturns(
      [
        account({
          activities: [act("2025-01-01", "BUY", "AAA", 10, -1000)],
          positions: [pos("AAA", 10, 110)],
        }),
      ],
      ASOF
    );
    expect(r.open[0].until).toBeNull();
  });

  it("ignores money-market sweeps and options", () => {
    const r = computeReturns(
      [
        account({
          activities: [
            act("2025-01-01", "BUY", "SPAXX", 500, -500),
            act("2025-01-02", "BUY", "OPT", 1, -50, { isOption: true }),
          ],
        }),
      ],
      ASOF
    );
    expect(r.open).toEqual([]);
    expect(r.closed).toEqual([]);
  });

  it("values the actual holding when buys were recorded in pre-split units", () => {
    // Bought 1 unit at $500; a 10-for-1 split later, the account holds 10 units at $55.
    const r = computeReturns(
      [
        account({
          activities: [act("2025-01-01", "BUY", "AAA", 1, -500)],
          positions: [pos("AAA", 10, 55)],
        }),
      ],
      ASOF
    );
    const t = r.open[0];
    expect(t.units).toBe(10);
    expect(t.value).toBe(550);
    expect(t.xirr).toBeCloseTo(0.1, 9);
    expect(t.unreconciledUnits).toBeCloseTo(9);
  });

  it("does not flag negligible unit differences", () => {
    const r = computeReturns(
      [
        account({
          activities: [act("2025-01-01", "BUY", "AAA", 10, -1000)],
          positions: [pos("AAA", 10.001, 110)],
        }),
      ],
      ASOF
    );
    expect(r.open[0].unreconciledUnits).toBe(0);
  });

  it("treats a position as open by current holdings, not recorded units", () => {
    // Pre-split buy of 1, post-split sell of 10: recorded net is -9 but nothing is held.
    const r = computeReturns(
      [
        account({
          activities: [
            act("2025-01-01", "BUY", "AAA", 1, -500),
            act("2025-12-01", "SELL", "AAA", -10, 600),
          ],
        }),
      ],
      ASOF
    );
    expect(r.open).toEqual([]);
    expect(r.closed[0].gain).toBe(100);
    expect(r.closed[0].unreconciledUnits).toBe(0);
  });

  it("flags a held ticker with no activity and gives no return", () => {
    const r = computeReturns([account({ positions: [pos("AAA", 3, 100)] })], ASOF);
    const t = r.open[0];
    expect(t.unreconciledUnits).toBe(3);
    expect(t.xirr).toBeNull();
  });

  it("gives no return when the held ticker has no price", () => {
    const r = computeReturns(
      [
        account({
          activities: [act("2025-01-01", "BUY", "AAA", 10, -1000)],
          positions: [pos("AAA", 10, null)],
        }),
      ],
      ASOF
    );
    expect(r.open[0].value).toBeNull();
    expect(r.open[0].gain).toBeNull();
    expect(r.open[0].xirr).toBeNull();
  });

  it("flags short histories", () => {
    const r = computeReturns(
      [
        account({
          activities: [act("2025-12-01", "BUY", "AAA", 10, -1000)],
          positions: [pos("AAA", 10, 101)],
        }),
      ],
      ASOF
    );
    expect(r.open[0].shortHistory).toBe(true);
  });

  it("pools the same ticker across accounts and keeps the split", () => {
    const mk = (id: string, units: number) =>
      account({
        id,
        name: id,
        activities: [act("2025-01-01", "BUY", "AAA", units, -units * 100)],
        positions: [pos("AAA", units, 110)],
      });
    const r = computeReturns([mk("A", 10), mk("B", 30)], ASOF);
    expect(r.open).toHaveLength(1);
    const t = r.open[0];
    expect(t.units).toBe(40);
    expect(t.value).toBe(4400);
    expect(t.xirr).toBeCloseTo(0.1, 9);
    expect(t.byAccount.map((a) => a.accountId)).toEqual(["B", "A"]);
  });
});

describe("account returns", () => {
  it("treats CONTRIBUTION (positive on the account) as money the investor put in", () => {
    const r = computeReturns(
      [
        account({
          totalValue: 1100,
          activities: [act("2025-01-01", "CONTRIBUTION", null, null, 1000)],
        }),
      ],
      ASOF
    );
    const a = r.accounts[0];
    expect(a.contributed).toBe(1000);
    expect(a.gain).toBe(100);
    expect(a.xirr).toBeCloseTo(0.1, 9);
  });

  it("counts withdrawals as money received", () => {
    const r = computeReturns(
      [
        account({
          totalValue: 900,
          activities: [
            act("2025-01-01", "CONTRIBUTION", null, null, 1000),
            act("2025-07-01", "WITHDRAWAL", null, null, -200),
          ],
        }),
      ],
      ASOF
    );
    const a = r.accounts[0];
    expect(a.withdrawn).toBe(200);
    expect(a.gain).toBe(900 + 200 - 1000);
    expect(a.xirr).toBeGreaterThan(0);
  });

  it("ignores trades and dividends inside the account", () => {
    const r = computeReturns(
      [
        account({
          totalValue: 1100,
          activities: [
            act("2025-01-01", "CONTRIBUTION", null, null, 1000),
            act("2025-03-01", "BUY", "AAA", 10, -1000),
            act("2025-06-01", "DIVIDEND", "AAA", 0, 30),
          ],
        }),
      ],
      ASOF
    );
    expect(r.accounts[0].xirr).toBeCloseTo(0.1, 9);
  });

  it("returns no annualized value without contributions or a known value", () => {
    expect(computeReturns([account({ totalValue: 100 })], ASOF).accounts[0].xirr).toBeNull();
    expect(
      computeReturns(
        [account({ activities: [act("2025-01-01", "CONTRIBUTION", null, null, 100)] })],
        ASOF
      ).accounts[0].xirr
    ).toBeNull();
  });

  it("separates stock/fund dividends from money-market interest", () => {
    const mk = (id: string) =>
      account({
        id,
        totalValue: 1000,
        activities: [
          act("2025-03-01", "DIVIDEND", "AAA", 0, 20),
          act("2025-04-01", "DIVIDEND", "AAA", 0, 5),
          act("2025-05-01", "DIVIDEND", "SPAXX", 0, 7),
        ],
      });
    const r = computeReturns([mk("A"), mk("B")], ASOF);
    expect(r.accounts[0].dividends).toBe(25);
    expect(r.accounts[0].interest).toBe(7);
    expect(r.portfolio.dividends).toBe(50);
    expect(r.portfolio.interest).toBe(14);
  });

  it("pools all accounts into a portfolio return", () => {
    const mk = (id: string) =>
      account({
        id,
        totalValue: 1100,
        activities: [act("2025-01-01", "CONTRIBUTION", null, null, 1000)],
      });
    const r = computeReturns([mk("A"), mk("B")], ASOF);
    expect(r.portfolio.value).toBe(2200);
    expect(r.portfolio.contributed).toBe(2000);
    expect(r.portfolio.gain).toBe(200);
    expect(r.portfolio.xirr).toBeCloseTo(0.1, 9);
  });

  it("leaves the portfolio value unknown if any account value is unknown", () => {
    const r = computeReturns(
      [account({ id: "A", totalValue: 100 }), account({ id: "B", totalValue: null })],
      ASOF
    );
    expect(r.portfolio.value).toBeNull();
    expect(r.portfolio.xirr).toBeNull();
  });
});
