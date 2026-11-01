import { describe, expect, it } from "vitest";
import { computeExposure } from "../lookthrough";
import { buildCompanyIndex, nameKey, resolveCompany } from "../names";
import { parseNport, type NportFiling } from "../nport";

const index = buildCompanyIndex({
  0: { cik_str: 1045810, ticker: "NVDA", title: "NVIDIA CORP" },
  1: { cik_str: 1652044, ticker: "GOOGL", title: "Alphabet Inc." },
  2: { cik_str: 1652044, ticker: "GOOG", title: "Alphabet Inc." },
  3: { cik_str: 316709, ticker: "SCHW", title: "SCHWAB CHARLES CORP" },
  4: { cik_str: 2115436, ticker: "XOM", title: "ExxonMobil Holdings Corp" },
  5: { cik_str: 875320, ticker: "VRTX", title: "VERTEX PHARMACEUTICALS INC / MA" },
  6: { cik_str: 898173, ticker: "ORLY", title: "O REILLY AUTOMOTIVE INC" },
  7: { cik_str: 59478, ticker: "LLY", title: "ELI LILLY & Co" },
  8: { cik_str: 109198, ticker: "TJX", title: "TJX COMPANIES INC /DE/" },
  9: { cik_str: 2012383, ticker: "BLK", title: "BlackRock, Inc." },
  10: { cik_str: 937966, ticker: "ASML", title: "ASML HOLDING NV" },
});

const xml = (rows: [string, number, string][], asOf = "2026-06-30") => `
<edgarSubmission><formData><genInfo><seriesName>Test Fund</seriesName><seriesId>S000000001</seriesId>
<repPdDate>${asOf}</repPdDate></genInfo><invstOrSecs>
${rows
  .map(
    ([name, pct, cat]) =>
      `<invstOrSec><name>${name}</name><cusip>123456789</cusip><pctVal>${pct}</pctVal><assetCat>${cat}</assetCat></invstOrSec>`
  )
  .join("\n")}
</invstOrSecs></formData></edgarSubmission>`;

describe("parseNport", () => {
  it("reads holdings, the as-of date and decodes entities", () => {
    const f = parseNport(xml([["Eli Lilly &amp; Co", 1.5, "EC"], ["Money Fund", 0.3, "STIV"]]));
    expect(f.asOf).toBe("2026-06-30");
    expect(f.seriesId).toBe("S000000001");
    expect(f.holdings).toEqual([
      { name: "Eli Lilly & Co", cusip: "123456789", pct: 1.5, assetCat: "EC" },
      { name: "Money Fund", cusip: "123456789", pct: 0.3, assetCat: "STIV" },
    ]);
  });
});

describe("resolveCompany", () => {
  it.each([
    ["NVIDIA Corp.", "NVDA"],
    ["Alphabet Inc Class C", "GOOGL"],
    ["Charles Schwab Corp/The", "SCHW"],
    ["Exxon Mobil Corp", "XOM"],
    ["Vertex Pharmaceuticals Inc.", "VRTX"],
    ["O'Reilly Automotive, Inc.", "ORLY"],
    ["Eli Lilly & Co", "LLY"],
    ["TJX Cos Inc/The", "TJX"],
    ["BlackRock Funding Inc/DE", "BLK"],
    ["ASML Holding N.V.", "ASML"],
  ])("%s -> %s", (name, ticker) => {
    expect(resolveCompany(index, name)?.ticker).toBe(ticker);
  });

  it("returns null for unknown issuers", () => {
    expect(resolveCompany(index, "Taiwan Semiconductor Manufacturing Co Ltd")).toBeNull();
  });

  it("ignores legal-form noise", () => {
    expect(nameKey("The Coca-Cola Company")).toBe(nameKey("COCA COLA CO"));
  });
});

describe("computeExposure", () => {
  const fund = (rows: [string, number, string][]): { filing: NportFiling } => ({ filing: parseNport(xml(rows)) });

  it("combines direct shares with each fund's slice", () => {
    const funds = new Map([
      ["VOO", fund([["NVIDIA Corp", 10, "EC"], ["Alphabet Inc", 90, "EC"]])],
      ["QQQ", fund([["NVIDIA Corp", 5, "EC"], ["Alphabet Inc", 95, "EC"]])],
    ]);
    const e = computeExposure(
      [
        { ticker: "NVDA", description: "NVIDIA", marketValue: 1000, isFund: false },
        { ticker: "VOO", description: "Vanguard S&P 500", marketValue: 5000, isFund: true },
        { ticker: "QQQ", description: "Invesco QQQ", marketValue: 4000, isFund: true },
      ],
      funds,
      index
    );
    const nvda = e.rows.find((r) => r.ticker === "NVDA")!;
    // 1000 direct + 10% of 5000 + 5% of 4000
    expect(nvda.value).toBeCloseTo(1700);
    expect(nvda.pct).toBeCloseTo(17);
    expect(nvda.name).toBe("NVIDIA Corp");
    expect(nvda.sources).toEqual([
      { fund: null, value: 1000 },
      { fund: "VOO", value: 500 },
      { fund: "QQQ", value: 200 },
    ]);
    expect(e.total).toBe(10000);
    expect(e.rows.reduce((s, r) => s + r.value, 0)).toBeCloseTo(10000);
  });

  it("merges share classes into one company", () => {
    const e = computeExposure(
      [
        { ticker: "GOOG", description: null, marketValue: 300, isFund: false },
        { ticker: "GOOGL", description: null, marketValue: 700, isFund: false },
      ],
      new Map(),
      index
    );
    expect(e.rows).toHaveLength(1);
    expect(e.rows[0]).toMatchObject({ ticker: "GOOGL", value: 1000, pct: 100 });
  });

  it("scales weights that don't sum to 100 and buckets non-equities", () => {
    const e = computeExposure(
      [{ ticker: "SCHD", description: null, marketValue: 1000, isFund: true }],
      new Map([["SCHD", fund([["NVIDIA Corp", 49, "EC"], ["Money Fund", 0.5, "STIV"], ["Some Bond", 0.5, "DBT"]])]]),
      index
    );
    expect(e.rows.find((r) => r.ticker === "NVDA")!.value).toBeCloseTo(980);
    expect(e.rows.find((r) => r.kind === "cash")!.value).toBeCloseTo(10);
    expect(e.rows.find((r) => r.kind === "bonds")!.value).toBeCloseTo(10);
    expect(e.funds[0]).toMatchObject({ ticker: "SCHD", status: "ok", holdingsCount: 3, asOf: "2026-06-30" });
    expect(e.funds[0].matchedPct).toBeCloseTo(98);
  });

  it("keeps a fund whole when its holdings are unavailable", () => {
    const e = computeExposure(
      [{ ticker: "DIA", description: "SPDR Dow Jones", marketValue: 500, isFund: true }],
      new Map([["DIA", null]]),
      index
    );
    expect(e.rows[0]).toMatchObject({ kind: "fund", ticker: "DIA", value: 500 });
    expect(e.funds[0].status).toBe("unavailable");
  });

  it("keeps unmatched issuers under their own name", () => {
    const e = computeExposure(
      [{ ticker: "VXUS", description: null, marketValue: 100, isFund: true }],
      new Map([["VXUS", fund([["Taiwan Semiconductor Manufacturing Co Ltd", 100, "EC"]])]]),
      index
    );
    expect(e.rows[0]).toMatchObject({ ticker: null, name: "Taiwan Semiconductor Manufacturing Co Ltd" });
  });

  it("merges unmatched issuers spelled differently by different funds", () => {
    const e = computeExposure(
      [
        { ticker: "VOO", description: null, marketValue: 100, isFund: true },
        { ticker: "QQQ", description: null, marketValue: 100, isFund: true },
      ],
      new Map([
        ["VOO", fund([["Warner Bros. Discovery, Inc.", 100, "EC"]])],
        ["QQQ", fund([["Warner Bros Discovery Inc", 100, "EC"]])],
      ]),
      index
    );
    expect(e.rows).toHaveLength(1);
    expect(e.rows[0].value).toBe(200);
  });
});
