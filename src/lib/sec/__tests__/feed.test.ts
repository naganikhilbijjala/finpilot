import { describe, expect, it } from "vitest";
import type { Exposure, ExposureRow } from "@/lib/exposure/lookthrough";
import { buildFeed, describeFiling, pickFollowed } from "../feed";
import { filingUrl, parseSubmissions, type CompanyProfile } from "../submissions";

const raw = {
  cik: "0001045810",
  name: "NVIDIA CORP",
  sic: "3674",
  sicDescription: "SEMICONDUCTORS & RELATED DEVICES",
  addresses: { business: { stateOrCountry: "CA", isForeignLocation: null, country: null } },
  filings: {
    recent: {
      form: ["4", "8-K", "10-Q", "8-K", "10-K"],
      filingDate: ["2026-10-20", "2026-10-15", "2026-08-27", "2026-05-28", "2025-01-01"],
      reportDate: ["", "2026-10-14", "2026-07-27", "2026-05-28", "2024-12-31"],
      items: ["", "5.02,9.01", "", "2.02,9.01", ""],
      accessionNumber: ["0001-26-1", "0001045810-26-000101", "0001045810-26-000090", "0001045810-26-000050", "x"],
      primaryDocument: ["f4.xml", "nvda-8k.htm", "nvda-10q.htm", "nvda-8k2.htm", "old.htm"],
    },
  },
};

describe("parseSubmissions", () => {
  it("keeps tracked forms from the last year and reads the profile", () => {
    const p = parseSubmissions(raw, new Date("2026-11-01"));
    expect(p).toMatchObject({
      cik: 1045810,
      sic: "3674",
      industry: "Semiconductors & Related Devices",
      country: "United States",
    });
    expect(p.filings.map((f) => f.form)).toEqual(["8-K", "10-Q", "8-K"]);
    expect(p.filings[0].items).toEqual(["5.02", "9.01"]);
  });

  it("uses the country for foreign addresses", () => {
    const p = parseSubmissions({ addresses: { business: { isForeignLocation: 1, country: "Taiwan" } } });
    expect(p.country).toBe("Taiwan");
  });

  it("links to the primary document", () => {
    expect(filingUrl(1045810, { accession: "0001045810-26-000101", document: "nvda-8k.htm" })).toBe(
      "https://www.sec.gov/Archives/edgar/data/1045810/000104581026000101/nvda-8k.htm"
    );
  });
});

describe("describeFiling", () => {
  it("leads an 8-K with its most serious item", () => {
    const d = describeFiling({ form: "8-K", items: ["2.02", "4.02", "9.01"], reportDate: null });
    expect(d).toEqual({
      title: "Past results no longer reliable (restatement)",
      tags: ["Earnings results"],
      importance: "high",
      category: "earnings",
    });
  });

  it("puts earnings first among equally important items", () => {
    expect(describeFiling({ form: "8-K", items: ["5.02", "2.02"], reportDate: null }).title).toBe("Earnings results");
  });

  it("describes periodic reports and amendments", () => {
    expect(describeFiling({ form: "10-Q", items: [], reportDate: "2026-07-27" }).title).toBe(
      "Quarterly report through Jul 27, 2026"
    );
    expect(describeFiling({ form: "10-K/A", items: [], reportDate: null }).title).toBe("Annual report (amended)");
    expect(describeFiling({ form: "SC 13D", items: [], reportDate: null }).importance).toBe("high");
  });
});

describe("feed", () => {
  const row = (key: string, cik: number, value: number, funds: (string | null)[]): ExposureRow => ({
    key,
    kind: "company",
    ticker: key.toUpperCase(),
    cik,
    country: null,
    name: key,
    value,
    pct: value / 10,
    sources: funds.map((fund) => ({ fund, value: value / funds.length })),
  });

  const exposure: Exposure = {
    total: 1000,
    funds: [],
    rows: [
      row("aapl", 1, 300, ["VOO"]),
      row("nvda", 1045810, 200, [null, "VOO"]),
      row("msft", 3, 100, ["VOO"]),
      row("tiny", 4, 1, [null]),
    ],
  };

  it("follows every direct holding plus the top fund holdings", () => {
    const f = pickFollowed(exposure, { fromFunds: 1 });
    expect(f.map((c) => [c.ticker, c.held])).toEqual([
      ["AAPL", "funds"],
      ["NVDA", "both"],
      ["TINY", "direct"],
    ]);
  });

  it("builds a newest-first feed from the window", () => {
    const profiles = new Map<number, CompanyProfile>([[1045810, parseSubmissions(raw, new Date("2026-11-01"))]]);
    const items = buildFeed(pickFollowed(exposure), profiles, "2026-06-01");
    expect(items.map((i) => [i.filedAt, i.title])).toEqual([
      ["2026-10-15", "Executive or board change"],
      ["2026-08-27", "Quarterly report through Jul 27, 2026"],
    ]);
    expect(items[0]).toMatchObject({ ticker: "NVDA", exposurePct: 20, held: "both" });
  });
});
