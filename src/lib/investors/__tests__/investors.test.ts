import { describe, expect, it } from "vitest";
import { buildCompanyIndex } from "@/lib/exposure/names";
import type { PricePoint } from "@/lib/market/parse";
import { atOrBefore, computeClone } from "../clone";
import { consensus, edge } from "../consensus";
import type { Manager } from "../managers";
import { buildReport, positionsToPrice, type Quarter } from "../report";
import { buildCusipMap, expand13FName, resolveSecurity } from "../securities";
import { infoTableFile, parseInfoTable, toPositions } from "../thirteenf";

const index = buildCompanyIndex({
  0: { cik_str: 70858, ticker: "BAC", title: "BANK OF AMERICA CORP /DE/" },
  1: { cik_str: 797468, ticker: "OXY", title: "OCCIDENTAL PETROLEUM CORP /DE/" },
  2: { cik_str: 1046179, ticker: "TSM", title: "TAIWAN SEMICONDUCTOR MANUFACTURING CO LTD" },
  3: { cik_str: 1639920, ticker: "SPOT", title: "Spotify Technology S.A." },
  4: { cik_str: 320193, ticker: "AAPL", title: "Apple Inc." },
  5: { cik_str: 1046180, ticker: "TAIX", title: "TAIWAN SEMICONDUCTOR EQUIPMENT CO" },
  6: { cik_str: 72971, ticker: "WFC", title: "WELLS FARGO & COMPANY/MN" },
  7: { cik_str: 16868, ticker: "CNI", title: "CANADIAN NATIONAL RAILWAY CO" },
  8: { cik_str: 1061219, ticker: "EPD", title: "ENTERPRISE PRODUCTS PARTNERS L.P." },
  9: { cik_str: 1060955, ticker: "ICLR", title: "ICON PLC" },
  10: { cik_str: 1636519, ticker: "MSGS", title: "Madison Square Garden Sports Corp." },
});

const table = `<?xml version="1.0"?>
<ns1:informationTable xmlns:ns1="http://www.sec.gov/edgar/document/thirteenf/informationtable">
  <ns1:infoTable><ns1:nameOfIssuer>APPLE INC</ns1:nameOfIssuer><ns1:titleOfClass>COM</ns1:titleOfClass>
    <ns1:cusip>037833100</ns1:cusip><ns1:value>600</ns1:value>
    <ns1:shrsOrPrnAmt><ns1:sshPrnamt>3</ns1:sshPrnamt><ns1:sshPrnamtType>SH</ns1:sshPrnamtType></ns1:shrsOrPrnAmt></ns1:infoTable>
  <ns1:infoTable><ns1:nameOfIssuer>APPLE INC</ns1:nameOfIssuer><ns1:titleOfClass>COM</ns1:titleOfClass>
    <ns1:cusip>037833100</ns1:cusip><ns1:value>400</ns1:value>
    <ns1:shrsOrPrnAmt><ns1:sshPrnamt>2</ns1:sshPrnamt><ns1:sshPrnamtType>SH</ns1:sshPrnamtType></ns1:shrsOrPrnAmt></ns1:infoTable>
  <ns1:infoTable><ns1:nameOfIssuer>APPLE INC</ns1:nameOfIssuer><ns1:titleOfClass>CALL</ns1:titleOfClass>
    <ns1:cusip>037833100</ns1:cusip><ns1:value>999</ns1:value><ns1:putCall>Call</ns1:putCall>
    <ns1:shrsOrPrnAmt><ns1:sshPrnamt>9</ns1:sshPrnamt><ns1:sshPrnamtType>SH</ns1:sshPrnamtType></ns1:shrsOrPrnAmt></ns1:infoTable>
  <ns1:infoTable><ns1:nameOfIssuer>BANK OF AMER CORP</ns1:nameOfIssuer><ns1:titleOfClass>COM</ns1:titleOfClass>
    <ns1:cusip>060505104</ns1:cusip><ns1:value>500</ns1:value>
    <ns1:shrsOrPrnAmt><ns1:sshPrnamt>10</ns1:sshPrnamt><ns1:sshPrnamtType>SH</ns1:sshPrnamtType></ns1:shrsOrPrnAmt></ns1:infoTable>
  <ns1:infoTable><ns1:nameOfIssuer>SOME NOTE</ns1:nameOfIssuer><ns1:titleOfClass>NOTE</ns1:titleOfClass>
    <ns1:cusip>000000AA1</ns1:cusip><ns1:value>50</ns1:value>
    <ns1:shrsOrPrnAmt><ns1:sshPrnamt>50</ns1:sshPrnamt><ns1:sshPrnamtType>PRN</ns1:sshPrnamtType></ns1:shrsOrPrnAmt></ns1:infoTable>
</ns1:informationTable>`;

describe("13F information table", () => {
  it("parses namespaced rows and merges sub-adviser rows, dropping options and bonds", () => {
    const rows = parseInfoTable(table);
    expect(rows).toHaveLength(5);
    expect(rows[2].putCall).toBe("Call");
    expect(toPositions(rows)).toEqual([
      { cusip: "037833100", name: "APPLE INC", value: 1000, shares: 5 },
      { cusip: "060505104", name: "BANK OF AMER CORP", value: 500, shares: 10 },
    ]);
  });

  it("finds the information table among the filing's files", () => {
    expect(infoTableFile(["x-index.html", "primary_doc.xml", "56757.xml"])).toBe("56757.xml");
    expect(infoTableFile(["primary_doc.xml", "a.xml", "form13fInfoTable.xml"])).toBe("form13fInfoTable.xml");
    expect(infoTableFile(["primary_doc.xml"])).toBeNull();
  });
});

describe("resolveSecurity", () => {
  const cusips = buildCusipMap([{ name: "Wells Fargo & Co", cusip: "949746101" }], index);

  it("prefers the CUSIP map", () => {
    expect(resolveSecurity(cusips, index, "949746101", "WELLS FARGO CO NEW")?.ticker).toBe("WFC");
  });

  it.each([
    ["BANK OF AMER CORP", "BAC"],
    ["OCCIDENTAL PETE CORP", "OXY"],
    ["TAIWAN SEMICONDUCTOR MANUFAC", "TSM"],
    ["TAIWAN SEMICONDUCTOR MFG LTD", "TSM"],
    ["SPOTIFY TECHNOLOGY S A", "SPOT"],
    ["CANADIAN NATL RY CO", "CNI"],
    ["ENTERPRISE PRODS PARTNERS L", "EPD"],
    ["ICON PUB LTD CO", "ICLR"],
    ["MADISON SQUARE GRDN SPRT COR", "MSGS"],
  ])("%s -> %s", (name, ticker) => {
    expect(resolveSecurity(cusips, index, "000000000", name)?.ticker).toBe(ticker);
  });

  it("identifies ETFs by CUSIP, since 13F names only give the trust", () => {
    expect(resolveSecurity(cusips, index, "464287655", "ISHARES TR")).toMatchObject({ ticker: "IWM" });
    expect(resolveSecurity(cusips, index, "78462F103", "STATE STR SPDR S&P 500 ETF T")).toMatchObject({
      ticker: "SPY",
      title: "SPDR S&P 500 ETF",
    });
    expect(resolveSecurity(cusips, index, "000000000", "ISHARES TR")).toBeNull();
  });

  it("refuses an ambiguous prefix", () => {
    expect(resolveSecurity(cusips, index, "000000000", "TAIWAN SEMICONDUCTOR")).toBeNull();
  });

  it("expands abbreviations", () => {
    expect(expand13FName("JEFFERIES FINANCIAL GROUP IN")).toBe("JEFFERIES FINANCIAL GROUP");
    expect(expand13FName("BELITE BIO INC SPONSORED ADS")).toBe("BELITE BIO INC");
  });
});

const days = (from: string, n: number) =>
  Array.from({ length: n }, (_, i) => new Date(Date.parse(`${from}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10));

const series = (dates: string[], f: (i: number) => number): PricePoint[] =>
  dates.map((date, i) => ({ date, close: f(i), adjclose: f(i) }));

describe("computeClone", () => {
  const dates = days("2020-01-01", 2200);
  const bench = series(dates, (i) => 100 * 1.0002 ** i);

  it("tracks a single stock between filings and switches on the filing date", () => {
    const prices = new Map([
      ["UP", series(dates, (i) => 10 * 1.0005 ** i)],
      ["FLAT", series(dates, () => 50)],
    ]);
    const r = computeClone(
      [
        { filedAt: dates[0], totalValue: 1, holdings: [{ ticker: "UP", value: 1 }] },
        { filedAt: dates[1000], totalValue: 1, holdings: [{ ticker: "FLAT", value: 1 }] },
      ],
      prices,
      bench
    )!;
    const at = (d: string) => r.series[atOrBefore(r.series, d)].clone;
    // Grew with UP for 1000 days, then held flat.
    expect(at(dates[1000])).toBeCloseTo(100 * 1.0005 ** 1000, 0);
    expect(r.series[r.series.length - 1].clone).toBeCloseTo(100 * 1.0005 ** 1000, 0);
    expect(r.coverage).toBe(1);
    expect(r.windows.map((w) => w.years)).toEqual([1, 3, 5]);
    const one = r.windows[0];
    expect(one.clone).toBeCloseTo(0);
    expect(one.bench).toBeGreaterThan(0);
  });

  it("adds a 10-year window once there's that much history", () => {
    const long = days("2014-01-01", 4100);
    const r = computeClone(
      [{ filedAt: long[0], totalValue: 1, holdings: [{ ticker: "X", value: 1 }] }],
      new Map([["X", series(long, (i) => 10 * 1.0003 ** i)]]),
      series(long, () => 100)
    )!;
    expect(r.windows.map((w) => w.years)).toEqual([1, 3, 5, 10]);
    const ten = r.windows[3];
    expect(ten.bench).toBeCloseTo(0);
    expect(ten.cloneAnnual).toBeCloseTo((1 + ten.clone) ** 0.1 - 1);
  });

  it("weights by value and skips stocks without prices", () => {
    const prices = new Map([
      ["A", series(dates, (i) => (i < 10 ? 10 : 20))],
      ["B", series(dates, () => 10)],
    ]);
    const r = computeClone(
      [{ filedAt: dates[0], totalValue: 100, holdings: [{ ticker: "A", value: 25 }, { ticker: "B", value: 50 }, { ticker: "GONE", value: 25 }] }],
      prices,
      bench
    )!;
    // A doubles at a third of the copied weight: +33%.
    expect(r.series[r.series.length - 1].clone).toBeCloseTo(133.33, 1);
    expect(r.coverage).toBeCloseTo(0.75);
  });
});

describe("buildReport", () => {
  const dates = days("2025-01-01", 400);
  const flat = { points: series(dates, () => 10), splits: [] as { date: string; factor: number }[] };
  const pos = (cusip: string, ticker: string, value: number, shares: number) => ({
    cusip,
    ticker,
    name: ticker,
    displayName: ticker,
    value,
    shares,
  });
  const quarters: Quarter[] = [
    { filedAt: dates[10], reportDate: "2024-12-31", positions: [pos("1", "AAA", 60, 10), pos("2", "BBB", 30, 10), pos("3", "CCC", 10, 10)] },
    { filedAt: dates[100], reportDate: "2025-03-31", positions: [pos("1", "AAA", 50, 100), pos("2", "BBB", 30, 8), pos("4", "DDD", 20, 5)] },
  ];

  it("labels changes, adjusting share counts for splits", () => {
    const prices = new Map([
      ["AAA", { ...flat, splits: [{ date: "2025-02-01", factor: 10 }] }],
      ["BBB", flat],
      ["CCC", flat],
      ["DDD", flat],
      ["SPY", flat],
    ]);
    const r = buildReport({ cik: 1, filer: "Test", quarters, prices, bench: flat.points });
    expect(r.holdings.map((h) => [h.ticker, h.pct, h.change])).toEqual([
      ["AAA", 50, null], // 10 -> 100 shares is just the 10-for-1 split
      ["BBB", 30, "reduced"],
      ["DDD", 20, "new"],
    ]);
    expect(r.soldOut).toEqual([{ ticker: "CCC", name: "CCC", prevPct: 10 }]);
    expect(r.reportDate).toBe("2025-03-31");
    expect(r.quartersUsed).toBe(2);
  });

  it("merges share classes that resolve to one ticker", () => {
    const twoClasses: Quarter[] = [
      { ...quarters[0], positions: [pos("A1", "GOOGL", 30, 3), pos("C1", "GOOGL", 20, 2), pos("2", "BBB", 50, 1)] },
    ];
    const r = buildReport({ cik: 1, filer: "T", quarters: twoClasses, prices: new Map([["SPY", flat]]), bench: flat.points });
    expect(r.holdings.map((h) => [h.ticker, h.value, h.pct])).toEqual([
      ["GOOGL", 50, 50],
      ["BBB", 50, 50],
    ]);
  });

  it("measures weights against the whole filing when only the largest positions are kept", () => {
    const big: Quarter[] = [{ ...quarters[1], totalValue: 1000, positionCount: 4200 }];
    const r = buildReport({ cik: 1, filer: "T", quarters: big, prices: new Map([["SPY", flat]]), bench: flat.points });
    expect(r.positionCount).toBe(4200);
    expect(r.totalValue).toBe(1000);
    expect(r.holdings[0]).toMatchObject({ ticker: "AAA", pct: 5 });
  });

  it("prices only the largest positions", () => {
    const q: Quarter = {
      filedAt: "2025-01-01",
      reportDate: "2024-12-31",
      positions: [pos("1", "A", 90, 1), pos("2", "B", 6, 1), pos("3", "C", 4, 1)],
    };
    expect(positionsToPrice(q).map((p) => p.ticker)).toEqual(["A", "B"]);
  });
});

describe("consensus", () => {
  const m = (cik: number, name: string): Manager => ({ cik, name, person: "", style: "" });
  const report = (holdings: [string, number][], cloneAnnual = 0.1) =>
    ({
      holdings: holdings.map(([ticker, pct]) => ({ cusip: ticker, ticker, name: ticker, value: 0, pct, change: null, sharesChangePct: null })),
      clone: { series: [], coverage: 1, windows: [{ years: 5, clone: 0, bench: 0, cloneAnnual, benchAnnual: 0.12 }] },
    }) as never;

  it("ranks stocks by how many managers hold them and marks what you own", () => {
    const rows = consensus(
      [
        { manager: m(1, "One"), report: report([["AAPL", 20], ["KO", 10]]) },
        { manager: m(2, "Two"), report: report([["AAPL", 10], ["KO", 30], ["MSFT", 5]]) },
        { manager: m(3, "Three"), report: report([["AAPL", 6]]) },
      ],
      { KO: 1.5 }
    );
    expect(rows.map((r) => [r.ticker, r.holders.length, r.avgPct, r.ownedPct])).toEqual([
      ["AAPL", 3, 12, null],
      ["KO", 2, 20, 1.5],
    ]);
  });

  it("reports the yearly gap to the S&P", () => {
    expect(edge(report([], 0.15), 5)).toBeCloseTo(0.03);
    expect(edge(report([], 0.15), 3)).toBeNull();
  });
});
