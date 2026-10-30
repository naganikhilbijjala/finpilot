import { describe, expect, it } from "vitest";
import { findConstituent, normalizeSymbol, searchStocks } from "../symbols";

describe("normalizeSymbol / findConstituent", () => {
  it("maps broker share-class tickers to ours", () => {
    expect(normalizeSymbol(" brk.b ")).toBe("BRK-B");
    expect(findConstituent("BRK.B")?.name).toContain("Berkshire");
  });

  it("returns undefined for tickers outside the S&P 500 (e.g. ETFs)", () => {
    expect(findConstituent("VOO")).toBeUndefined();
    expect(findConstituent("")).toBeUndefined();
  });
});

describe("searchStocks", () => {
  it("puts an exact ticker first", () => {
    expect(searchStocks("aapl")[0].symbol).toBe("AAPL");
  });

  it("finds by company name, including later words", () => {
    expect(searchStocks("apple").map((c) => c.symbol)).toContain("AAPL");
    expect(searchStocks("hathaway").map((c) => c.symbol)).toContain("BRK-B");
  });

  it("ranks ticker prefixes ahead of name matches", () => {
    const out = searchStocks("MS").map((c) => c.symbol);
    expect(out.indexOf("MS")).toBe(0);
  });

  it("accepts the dotted form of a share class", () => {
    expect(searchStocks("brk.b")[0].symbol).toBe("BRK-B");
  });

  it("returns nothing for blank or unmatched queries and honours the limit", () => {
    expect(searchStocks("  ")).toEqual([]);
    expect(searchStocks("zzzzqq")).toEqual([]);
    expect(searchStocks("a", 3)).toHaveLength(3);
  });
});
