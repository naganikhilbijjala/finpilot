// "Look-through" exposure: splits each fund into the companies it holds and
// adds them to direct holdings, so NVDA bought outright, NVDA inside VOO and
// NVDA inside QQQ show up as one number.

import type { NportFiling } from "./nport";
import { nameKey, normalizeTicker, resolveCompany, type CompanyIndex } from "./names";

export interface PositionInput {
  ticker: string;
  description: string | null;
  marketValue: number;
  /** True for ETFs and mutual funds. */
  isFund: boolean;
  isOption?: boolean;
}

export interface FundInput {
  filing: NportFiling;
  /** When the fund files no holdings itself (e.g. SPY), whose holdings stand in. */
  proxyFor?: string;
}

export type RowKind = "company" | "fund" | "cash" | "bonds" | "other";

export interface ExposureSource {
  /** Fund ticker, or null for shares held directly. */
  fund: string | null;
  value: number;
}

export interface ExposureRow {
  key: string;
  kind: RowKind;
  /** Null for issuers with no SEC ticker (most non-US companies) and buckets. */
  ticker: string | null;
  /** SEC company number, when the company is in the SEC's list. */
  cik: number | null;
  /** Issuer country as an ISO code, from the funds' filings ("US", "TW"). */
  country: string | null;
  name: string;
  value: number;
  /** Percent of total invested value. */
  pct: number;
  /** Largest source first; direct holdings use fund: null. */
  sources: ExposureSource[];
}

export interface FundCoverage {
  ticker: string;
  value: number;
  status: "ok" | "proxy" | "unavailable";
  proxyFor?: string;
  asOf: string | null;
  holdingsCount: number;
  /** Percent of the fund's assets matched to a known company. */
  matchedPct: number;
}

export interface Exposure {
  total: number;
  rows: ExposureRow[];
  funds: FundCoverage[];
}

const BUCKETS: Record<Exclude<RowKind, "company" | "fund">, string> = {
  cash: "Cash & equivalents (inside funds)",
  bonds: "Bonds & debt",
  other: "Other (derivatives, funds, options)",
};

function bucketFor(assetCat: string | null): Exclude<RowKind, "company" | "fund"> | null {
  if (assetCat === "EC" || assetCat === "EP") return null;
  if (assetCat === "STIV") return "cash";
  if (assetCat === "DBT" || assetCat?.startsWith("ABS") || assetCat === "LON" || assetCat === "SN") return "bonds";
  return "other";
}

const isShouting = (s: string) => s === s.toUpperCase() && /[A-Z]{3}/.test(s);

/** Drops SEC state suffixes: "APPLIED MATERIALS INC /DE" -> "APPLIED MATERIALS INC". */
const displayName = (s: string) => s.replace(/\s*\/[A-Z]{2,3}\/?\s*$/, "").trim();

export function computeExposure(
  positions: PositionInput[],
  funds: Map<string, FundInput | null>,
  index: CompanyIndex
): Exposure {
  const rows = new Map<string, Omit<ExposureRow, "pct" | "sources"> & { sources: Map<string, number> }>();
  const add = (
    key: string,
    init: () => Pick<ExposureRow, "kind" | "ticker" | "name"> & { cik?: number | null },
    source: string | null,
    value: number,
    country: string | null = null
  ) => {
    const row = rows.get(key) ?? { key, cik: null, country: null, ...init(), value: 0, sources: new Map() };
    if (!row.country && country) row.country = country;
    row.value += value;
    const s = source ?? "";
    row.sources.set(s, (row.sources.get(s) ?? 0) + value);
    rows.set(key, row);
  };
  const addCompany = (
    name: string,
    ticker: string | null,
    source: string | null,
    value: number,
    country: string | null = null
  ) => {
    const company = ticker ? index.byTicker.get(normalizeTicker(ticker)) : resolveCompany(index, name);
    if (company) {
      const key = `cik:${company.cik}`;
      add(
        key,
        () => ({ kind: "company", ticker: company.ticker, cik: company.cik, name: displayName(company.title) }),
        source,
        value,
        country
      );
      // Funds write "NVIDIA Corp" where the SEC list says "NVIDIA CORP"; prefer the readable one.
      const row = rows.get(key)!;
      if (source && isShouting(row.name) && !isShouting(name)) row.name = displayName(name);
    } else if (ticker) {
      add(`t:${normalizeTicker(ticker)}`, () => ({ kind: "company", ticker, name }), source, value, country);
    } else {
      add(`n:${nameKey(name) || name.toUpperCase()}`, () => ({ kind: "company", ticker: null, name }), source, value, country);
    }
  };
  const addBucket = (kind: Exclude<RowKind, "company" | "fund">, source: string | null, value: number) =>
    add(`bucket:${kind}`, () => ({ kind, ticker: null, name: BUCKETS[kind] }), source, value);

  const coverage: FundCoverage[] = [];
  let total = 0;

  for (const p of positions) {
    if (!(p.marketValue > 0)) continue;
    total += p.marketValue;

    if (p.isOption) {
      addBucket("other", null, p.marketValue);
      continue;
    }
    if (!p.isFund) {
      addCompany(p.description ?? p.ticker, p.ticker, null, p.marketValue);
      continue;
    }

    const fund = funds.get(p.ticker) ?? null;
    const holdings = fund?.filing.holdings ?? [];
    const grossPct = holdings.reduce((s, h) => s + h.pct, 0);
    if (!fund || holdings.length === 0 || grossPct <= 0) {
      add(`fund:${p.ticker}`, () => ({ kind: "fund", ticker: p.ticker, name: p.description ?? p.ticker }), p.ticker, p.marketValue);
      coverage.push({ ticker: p.ticker, value: p.marketValue, status: "unavailable", asOf: null, holdingsCount: 0, matchedPct: 0 });
      continue;
    }

    // Weights rarely sum to exactly 100 (cash, rounding, liabilities); scale
    // so the fund's whole market value is always accounted for.
    let matched = 0;
    for (const h of holdings) {
      const value = (h.pct / grossPct) * p.marketValue;
      const bucket = bucketFor(h.assetCat);
      if (bucket) {
        addBucket(bucket, p.ticker, value);
        continue;
      }
      const company = resolveCompany(index, h.name);
      if (company) matched += h.pct;
      addCompany(h.name, company?.ticker ?? null, p.ticker, value, h.country ?? null);
    }
    coverage.push({
      ticker: p.ticker,
      value: p.marketValue,
      status: fund.proxyFor ? "proxy" : "ok",
      proxyFor: fund.proxyFor,
      asOf: fund.filing.asOf,
      holdingsCount: holdings.length,
      matchedPct: (matched / grossPct) * 100,
    });
  }

  return {
    total,
    rows: [...rows.values()]
      .map((r) => ({
        ...r,
        pct: total > 0 ? (r.value / total) * 100 : 0,
        sources: [...r.sources.entries()]
          .map(([fund, value]) => ({ fund: fund || null, value }))
          .sort((a, b) => b.value - a.value),
      }))
      .sort((a, b) => b.value - a.value),
    funds: coverage.sort((a, b) => b.value - a.value),
  };
}
