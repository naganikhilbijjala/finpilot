import { describe, expect, it } from "vitest";
import type { CompanyProfile } from "@/lib/sec/submissions";
import { classify, countryName, profileTargets, type SectorLookup } from "../classify";
import type { Exposure, ExposureRow } from "../lookthrough";
import { sicToSector } from "../sectors";

const row = (r: Partial<ExposureRow> & Pick<ExposureRow, "key" | "value">): ExposureRow => ({
  kind: "company",
  ticker: null,
  cik: null,
  country: null,
  name: r.key,
  pct: 0,
  sources: [{ fund: null, value: r.value }],
  ...r,
});

const profile = (cik: number, sic: string | null, country: string | null): CompanyProfile => ({
  cik,
  name: "",
  sic,
  industry: null,
  country,
  filings: [],
});

const sp: SectorLookup = {
  byCik: new Map([[1045810, "Information Technology"]]),
  byTicker: new Map([["JPM", "Financials"]]),
};

describe("sicToSector", () => {
  it.each([
    ["3674", "Information Technology"],
    ["2834", "Health Care"],
    ["1311", "Energy"],
    ["6798", "Real Estate"],
    ["6022", "Financials"],
    ["3711", "Consumer Discretionary"],
    ["4911", "Utilities"],
    ["4813", "Communication Services"],
    ["5411", "Consumer Staples"],
  ])("%s -> %s", (sic, sector) => expect(sicToSector(sic)).toBe(sector));

  it("returns null for missing or unmapped codes", () => {
    expect(sicToSector(null)).toBeNull();
    expect(sicToSector("")).toBeNull();
    expect(sicToSector("9999")).toBeNull();
  });
});

describe("classify", () => {
  const exposure: Exposure = {
    total: 1000,
    funds: [],
    rows: [
      row({ key: "nvda", ticker: "NVDA", cik: 1045810, country: "US", value: 400 }),
      row({ key: "tsm", ticker: "TSM", cik: 1046179, value: 200 }),
      row({ key: "jpm", ticker: "JPM", cik: 19617, country: "US", value: 200 }),
      row({ key: "mystery", value: 100 }),
      row({ key: "cash", kind: "cash", name: "Cash", value: 100 }),
    ],
  };

  it("asks the SEC only about companies S&P or the funds don't already describe", () => {
    expect(profileTargets(exposure, sp)).toEqual([1046179]);
  });

  it("rolls up sectors over all money and countries over stocks", () => {
    const b = classify(exposure, sp, new Map([[1046179, profile(1046179, "3674", "Taiwan")]]));
    expect(b.sectors.map((s) => [s.key, s.pct])).toEqual([
      ["Information Technology", 60],
      ["Financials", 20],
      ["Unclassified", 10],
      ["Cash (inside funds)", 10],
    ]);
    expect(b.sectors[0].top.map((t) => t.label)).toEqual(["NVDA", "TSM"]);
    expect(b.stockValue).toBe(900);
    const countries = Object.fromEntries(b.countries.map((c) => [c.key, Math.round(c.pct * 10) / 10]));
    expect(countries).toEqual({ "United States": 66.7, Taiwan: 22.2, Unknown: 11.1 });
    expect(b.sectorCoverage.sp).toBeCloseTo((600 / 900) * 100);
    expect(b.sectorCoverage.sec).toBeCloseTo((200 / 900) * 100);
  });

  it("labels foreign companies with no sector on file separately and drops empty groups", () => {
    const b = classify(
      {
        total: 100,
        funds: [],
        rows: [
          row({ key: "toyota", name: "Toyota Motor Corp", country: "JP", value: 100 }),
          row({ key: "deriv", kind: "other", value: -1 }),
        ],
      },
      sp,
      new Map()
    );
    expect(b.sectors.map((s) => s.key)).toEqual(["Non-US, sector not reported"]);
    expect(b.countries[0]).toMatchObject({ key: "Japan", pct: 100 });
  });

  it("names countries from ISO codes", () => {
    expect(countryName("US")).toBe("United States");
    expect(countryName("NL")).toBe("Netherlands");
  });
});
