import { describe, expect, it } from "vitest";
import { parseTickerMap } from "../cikmap";
import { toSector } from "../sectors";
import { findConstituent, looksLikeTicker, searchStocks } from "../symbols";
import { MAX_CUSTOM, MAX_UNIVERSE, PRESET_UNIVERSE } from "../universe";
import type { Constituent } from "../sp500";

describe("preset universe", () => {
  it("combines S&P 500 and S&P 400 with no duplicate tickers", () => {
    const symbols = PRESET_UNIVERSE.map((c) => c.symbol);
    expect(new Set(symbols).size).toBe(symbols.length);
    expect(symbols.length).toBeGreaterThan(850);
    expect(symbols.length).toBeLessThan(MAX_UNIVERSE);
  });

  it("leaves room for hand-added stocks under the cap", () => {
    expect(MAX_CUSTOM).toBe(MAX_UNIVERSE - PRESET_UNIVERSE.length);
    expect(MAX_CUSTOM).toBeGreaterThan(50);
  });

  it("includes mid-caps and tolerates unknown SEC numbers", () => {
    expect(findConstituent("AAL")?.name).toContain("American Airlines");
    expect(PRESET_UNIVERSE.some((c) => c.cik === null)).toBe(true);
    expect(PRESET_UNIVERSE.every((c) => c.symbol && c.name && c.sector)).toBe(true);
  });
});

describe("added stocks in search and lookup", () => {
  const sofi: Constituent = { symbol: "SOFI", name: "SoFi Technologies, Inc.", sector: "Financials", cik: null };
  const universe = [...PRESET_UNIVERSE, sofi];

  it("finds a hand-added stock by ticker and name", () => {
    expect(searchStocks("sofi", 6, universe)[0].symbol).toBe("SOFI");
    expect(searchStocks("technologies", 20, universe).map((c) => c.symbol)).toContain("SOFI");
    expect(findConstituent("SOFI", universe)?.name).toContain("SoFi");
  });

  it("does not know it until it is added", () => {
    expect(findConstituent("SOFI")).toBeUndefined();
  });
});

describe("looksLikeTicker", () => {
  it("accepts plausible tickers and share classes", () => {
    for (const t of ["SOFI", "aapl", "BRK.B", "brk-b", "F"]) expect(looksLikeTicker(t)).toBe(true);
  });

  it("rejects names, numbers and junk", () => {
    for (const t of ["apple inc", "123", "TOOLONGX", "A-BC", "", "S&P"]) expect(looksLikeTicker(t)).toBe(false);
  });
});

describe("toSector", () => {
  it("maps Finnhub industries onto GICS sectors", () => {
    expect(toSector("Financial Services")).toBe("Financials");
    expect(toSector("Technology")).toBe("Information Technology");
    expect(toSector("Packaging")).toBe("Materials");
    expect(toSector(" Energy ")).toBe("Energy");
  });

  it("falls back to Other", () => {
    expect(toSector("Something New")).toBe("Other");
    expect(toSector(null)).toBe("Other");
  });
});

describe("parseTickerMap", () => {
  it("builds ticker -> CIK from the SEC file shape", () => {
    const map = parseTickerMap({
      "0": { cik_str: 320193, ticker: "AAPL", title: "Apple Inc." },
      "1": { cik_str: "1818874", ticker: "sofi", title: "SoFi" },
      "2": { cik_str: 1067983, ticker: "BRK.B", title: "Berkshire" },
    });
    expect(map.get("AAPL")).toBe(320193);
    expect(map.get("SOFI")).toBe(1818874);
    expect(map.get("BRK-B")).toBe(1067983);
  });

  it("ignores malformed entries", () => {
    expect(parseTickerMap(null).size).toBe(0);
    expect(parseTickerMap({ "0": { ticker: "X" }, "1": { cik_str: 5 } }).size).toBe(0);
  });
});
