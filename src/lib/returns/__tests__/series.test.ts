import { describe, expect, it } from "vitest";
import type { PriceHistory } from "@/lib/market/parse";
import type { ActivityView } from "@/lib/snaptrade/types";
import { buildAccountSeries, combineSeries, forwardFill, twrIndex } from "../series";

const dates = ["2025-01-02", "2025-01-03", "2025-01-06", "2025-01-07", "2025-01-08"];

const act = (
  date: string,
  type: string,
  ticker: string | null,
  units: number | null,
  amount: number | null
): ActivityView => ({
  id: null,
  date: `${date}T00:00:00Z`,
  type,
  ticker,
  units,
  price: null,
  amount,
  isOption: false,
});

const history = (
  ticker: string,
  closes: number[],
  splits: { date: string; factor: number }[] = []
): PriceHistory => ({
  ticker,
  points: closes.map((close, i) => ({ date: dates[i], close, adjclose: close })),
  splits,
});

const build = (
  activities: ActivityView[],
  hs: PriceHistory[],
  actualValue: number | null = null
) =>
  buildAccountSeries(
    { id: "A", name: "Acct", activities, actualValue },
    dates,
    new Map(hs.map((h) => [h.ticker, h]))
  );

describe("forwardFill", () => {
  it("carries the last value forward and backfills the start", () => {
    expect(
      forwardFill(["a", "b", "c", "d"], [
        { date: "b", value: 2 },
        { date: "d", value: 4 },
      ])
    ).toEqual([2, 2, 2, 4]);
  });
});

describe("twrIndex", () => {
  it("does not credit a deposit as that day's return", () => {
    // 100 grows 10% by the next close, then 100 more is deposited: value 210 = 110 + 100.
    const { t } = twrIndex([100, 210], [100, 200]);
    expect(t[1]).toBeCloseTo(110, 9);
  });

  it("is null before the first funded day and carries through empty spells", () => {
    const { t, firstIdx } = twrIndex([0, 0, 100, 110, 0, 0], [0, 0, 100, 100, 100, 100]);
    expect(firstIdx).toBe(2);
    expect(t.slice(0, 2)).toEqual([null, null]);
    expect(t[3]).toBeCloseTo(110, 9);
    // The account was emptied by a withdrawal; the index must not blow up.
    expect(t[5]).toBeCloseTo(t[4] as number, 9);
  });

  it("returns no index when nothing was ever funded", () => {
    expect(twrIndex([0, 0], [0, 0]).firstIdx).toBeNull();
  });
});

describe("buildAccountSeries", () => {
  it("values holdings plus cash and matches the price return", () => {
    const s = build(
      [act("2025-01-02", "CONTRIBUTION", null, null, 1000), act("2025-01-02", "BUY", "AAA", 10, -1000)],
      [history("AAA", [100, 102, 104, 106, 110])]
    );
    expect(s.v[0]).toBeCloseTo(1000, 6);
    expect(s.v[4]).toBeCloseTo(1100, 6);
    expect(s.t[4]).toBeCloseTo(110, 6);
    expect(s.cf[4]).toBe(1000);
  });

  it("is unaffected by when extra money is deposited", () => {
    const s = build(
      [
        act("2025-01-02", "CONTRIBUTION", null, null, 1000),
        act("2025-01-02", "BUY", "AAA", 10, -1000),
        act("2025-01-07", "CONTRIBUTION", null, null, 5000),
        act("2025-01-07", "BUY", "AAA", 50, -5000),
      ],
      [history("AAA", [100, 100, 100, 100, 110])]
    );
    // Only the last day moved, +10%; the big deposit must not change the return.
    expect(s.t[4]).toBeCloseTo(110, 6);
  });

  it("converts pre-split recorded units so a split causes no jump", () => {
    // Bought 1 unit at $500; 10-for-1 split on 2025-01-07. Closes are split-adjusted ($50 before).
    const s = build(
      [act("2025-01-02", "CONTRIBUTION", null, null, 500), act("2025-01-02", "BUY", "AAA", 1, -500)],
      [history("AAA", [50, 50, 50, 55, 55], [{ date: "2025-01-07", factor: 10 }])]
    );
    expect(s.v[2]).toBeCloseTo(500, 6); // 10 adjusted units x $50
    expect(s.v[3]).toBeCloseTo(550, 6);
    expect(s.t[4]).toBeCloseTo(110, 6);
  });

  it("does not split-adjust buys made after the split", () => {
    const s = build(
      [act("2025-01-08", "CONTRIBUTION", null, null, 550), act("2025-01-08", "BUY", "AAA", 10, -550)],
      [history("AAA", [50, 50, 50, 55, 55], [{ date: "2025-01-07", factor: 10 }])]
    );
    expect(s.v[4]).toBeCloseTo(550, 6);
  });

  it("ignores money-market sweep trades but keeps the interest they pay", () => {
    const s = build(
      [
        act("2025-01-02", "CONTRIBUTION", null, null, 1000),
        act("2025-01-02", "BUY", "SPAXX", 1000, -1000),
        act("2025-01-07", "DIVIDEND", "SPAXX", 0, 5),
        act("2025-01-07", "REI", "SPAXX", 5, -5),
      ],
      []
    );
    expect(s.v[4]).toBeCloseTo(1005, 6);
    expect(s.checks.missingPrices).toEqual([]);
  });

  it("counts dividends as cash and reinvestment as a buy", () => {
    const s = build(
      [
        act("2025-01-02", "CONTRIBUTION", null, null, 1000),
        act("2025-01-02", "BUY", "AAA", 10, -1000),
        act("2025-01-07", "DIVIDEND", "AAA", 0, 20),
        act("2025-01-07", "REI", "AAA", 0.2, -20),
      ],
      [history("AAA", [100, 100, 100, 100, 100])]
    );
    expect(s.v[4]).toBeCloseTo(1020, 6); // 10.2 units x $100, cash back to zero
  });

  it("reports tickers without price history instead of guessing", () => {
    const s = build(
      [act("2025-01-02", "CONTRIBUTION", null, null, 1000), act("2025-01-02", "BUY", "NOPE", 10, -1000)],
      []
    );
    expect(s.checks.missingPrices).toEqual(["NOPE"]);
  });

  it("flags unhandled activity types that carry a ticker", () => {
    const s = build(
      [act("2025-01-02", "EXTERNAL_ASSET_TRANSFER_IN", "AAA", 5, null)],
      [history("AAA", [100, 100, 100, 100, 100])]
    );
    expect(s.checks.unhandledTypes).toEqual(["EXTERNAL_ASSET_TRANSFER_IN"]);
  });

  it("compares the reconstruction with the real balance", () => {
    const s = build(
      [act("2025-01-02", "CONTRIBUTION", null, null, 1000)],
      [],
      1010
    );
    expect(s.checks.diffPct).toBeCloseTo(((1000 - 1010) / 1010) * 100, 6);
  });
});

describe("combineSeries", () => {
  it("sums value and flows and recomputes the index on the total", () => {
    const a = build([act("2025-01-02", "CONTRIBUTION", null, null, 1000)], []);
    const b = build(
      [act("2025-01-02", "CONTRIBUTION", null, null, 1000), act("2025-01-02", "BUY", "AAA", 10, -1000)],
      [history("AAA", [100, 100, 100, 100, 120])],
      1200
    );
    const all = combineSeries("all", "All", [a, b]);
    expect(all.v[4]).toBeCloseTo(2200, 6);
    expect(all.cf[4]).toBe(2000);
    expect(all.t[4]).toBeCloseTo(110, 6);
  });
});
