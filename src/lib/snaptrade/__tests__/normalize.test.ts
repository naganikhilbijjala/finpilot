import { describe, expect, it } from "vitest";
import type { Account, AccountPosition } from "snaptrade-typescript-sdk";
import {
  maskAccountNumber,
  normalizeAccount,
  normalizePosition,
  normalizePositions,
} from "../normalize";

// Mirrors the real AccountPosition shape: numeric fields are strings.
const position = (over: Record<string, unknown> = {}): AccountPosition =>
  ({
    instrument: {
      kind: "stock",
      id: "i1",
      symbol: "AAPL",
      raw_symbol: "AAPL",
      description: "Apple Inc",
      currency: "USD",
    },
    units: "10",
    price: "200",
    cost_basis: "150",
    currency: "USD",
    ...over,
  }) as unknown as AccountPosition;

describe("normalizePosition", () => {
  it("parses string numbers and computes value and unrealized P&L", () => {
    const p = normalizePosition(position())!;
    expect(p.ticker).toBe("AAPL");
    expect(p.description).toBe("Apple Inc");
    expect(p.units).toBe(10);
    expect(p.averageCost).toBe(150);
    expect(p.marketValue).toBe(2000);
    expect(p.unrealizedPnl).toBe(500);
    expect(p.unrealizedPct).toBeCloseTo(33.3333, 3);
    expect(p.currency).toBe("USD");
  });

  it("returns null P&L, not zero, when cost is unknown", () => {
    const p = normalizePosition(position({ cost_basis: null }))!;
    expect(p.unrealizedPnl).toBeNull();
    expect(p.unrealizedPct).toBeNull();
    expect(p.marketValue).toBe(2000);
  });

  it("returns null value when price is unknown or not numeric", () => {
    expect(normalizePosition(position({ price: null }))!.marketValue).toBeNull();
    expect(normalizePosition(position({ price: "n/a" }))!.marketValue).toBeNull();
  });

  it("handles fractional units", () => {
    expect(normalizePosition(position({ units: "0.5" }))!.marketValue).toBe(100);
  });

  it("keeps short positions negative", () => {
    expect(normalizePosition(position({ units: "-2" }))!.marketValue).toBe(-400);
  });

  it("does not guess option value or P&L (unknown contract multiplier)", () => {
    const p = normalizePosition(
      position({
        instrument: { kind: "option", id: "o1", symbol: "AAPL250117C00150000" },
      })
    )!;
    expect(p.ticker).toBe("AAPL250117C00150000");
    expect(p.marketValue).toBeNull();
    expect(p.unrealizedPnl).toBeNull();
  });

  it("drops rows without a ticker or with zero/missing units", () => {
    expect(normalizePosition(position({ instrument: { kind: "stock" } }))).toBeNull();
    expect(normalizePosition(position({ units: "0" }))).toBeNull();
    expect(normalizePosition(position({ units: null }))).toBeNull();
  });
});

describe("normalizePositions", () => {
  it("tolerates null and sorts by market value", () => {
    expect(normalizePositions(null)).toEqual([]);
    const small = position({ units: "1" });
    const big = position({
      units: "100",
      instrument: { kind: "stock", id: "i2", symbol: "MSFT" },
    });
    expect(normalizePositions([small, big]).map((p) => p.ticker)).toEqual([
      "MSFT",
      "AAPL",
    ]);
  });
});

describe("normalizeAccount", () => {
  const account = {
    id: "a1",
    name: null,
    number: "123456789",
    institution_name: "Fidelity",
    balance: { total: { amount: 1234.5, currency: "USD" } },
    sync_status: {
      holdings: { initial_sync_completed: false, last_successful_sync: null },
    },
  } as unknown as Account;

  it("masks the account number and falls back to institution name", () => {
    const a = normalizeAccount(account);
    expect(a.name).toBe("Fidelity");
    expect(a.maskedNumber).toBe("••••6789");
    expect(JSON.stringify(a)).not.toContain("123456789");
  });

  it("takes total from the account and cash from balances", () => {
    const a = normalizeAccount(account, [{ cash: 50 }] as never);
    expect(a.totalValue).toBe(1234.5);
    expect(a.currency).toBe("USD");
    expect(a.cash).toBe(50);
    expect(a.initialSyncCompleted).toBe(false);
  });

  it("leaves cash null when balances are unavailable", () => {
    expect(normalizeAccount(account, null).cash).toBeNull();
  });
});

describe("maskAccountNumber", () => {
  it("handles empty input", () => {
    expect(maskAccountNumber(undefined)).toBe("••••");
  });
});
