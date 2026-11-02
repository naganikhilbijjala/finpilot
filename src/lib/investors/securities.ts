// Maps 13F securities (identified by CUSIP, with abbreviated names such as
// "BANK OF AMER CORP") to tickers. The main source is a total-market index
// fund's holdings filing, which lists ~3,500 US stocks with both a CUSIP and a
// readable name; names are the fallback for anything it doesn't hold.

import { nameKey, resolveCompany, type Company, type CompanyIndex } from "@/lib/exposure/names";
import type { NportHolding } from "@/lib/exposure/nport";
import { ETF_CUSIPS } from "./etfs";

// Abbreviations used in 13F issuer names (from the SEC's 13(f) securities list).
const ABBREVIATIONS: Record<string, string> = {
  AMER: "AMERICA",
  AMERN: "AMERICAN",
  BANCORPORATION: "BANCORP",
  CAP: "CAPITAL",
  CMNTY: "COMMUNITY",
  COMMUNICATIONS: "COMMUNICATIONS",
  ENTMT: "ENTERTAINMENT",
  FINL: "FINANCIAL",
  GRDN: "GARDEN",
  HLDG: "HOLDING",
  HLDGS: "HOLDINGS",
  INDS: "INDUSTRIES",
  INTL: "INTERNATIONAL",
  MFG: "MANUFACTURING",
  MANAGMT: "MANAGEMENT",
  MGMT: "MANAGEMENT",
  NATL: "NATIONAL",
  NEV: "NEVADA",
  PETE: "PETROLEUM",
  PHARMACEUTICALS: "PHARMACEUTICALS",
  PPTYS: "PROPERTIES",
  PRODS: "PRODUCTS",
  RY: "RAILWAY",
  SPRT: "SPORTS",
  RES: "RESOURCES",
  SVCS: "SERVICES",
  SYS: "SYSTEMS",
  TECHNOLOGIES: "TECHNOLOGIES",
  TECH: "TECHNOLOGY",
  TR: "TRUST",
  UTD: "UNITED",
};

/** Expands 13F abbreviations and drops trailing fragments ("GROUP IN" -> "GROUP"). */
export function expand13FName(name: string): string {
  return name
    .toUpperCase()
    .replace(/\bMTN BE\b|\bSPONSORED\b|\bSPON\b|\bADR\b|\bADS\b|\bORD\b|\bPUB\b/g, " ")
    // "SPOTIFY TECHNOLOGY S A" -> "... SA", so the legal-form filter recognises it.
    .replace(/\b([A-Z]) ([A-Z])\s*$/, "$1$2")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => ABBREVIATIONS[w] ?? w)
    .join(" ")
    .replace(/\s+(IN|I|INCO|CO IN|L|COR)$/, "");
}

export type CusipMap = Map<string, Company>;

/** CUSIP -> company from a fund's N-PORT holdings, matched through their readable names. */
export function buildCusipMap(holdings: Pick<NportHolding, "name" | "cusip">[], index: CompanyIndex): CusipMap {
  const map: CusipMap = new Map();
  for (const h of holdings) {
    if (!h.cusip || map.has(h.cusip)) continue;
    const company = resolveCompany(index, h.name);
    if (company) map.set(h.cusip.toUpperCase(), company);
  }
  return map;
}

// 13F names are cut at ~28 characters ("TAIWAN SEMICONDUCTOR MANUFAC"), so a
// name can also match the one SEC company whose name starts with it.
const MIN_PREFIX = 10;
const prefixLists = new WeakMap<CompanyIndex, [string, Company][]>();

function byUniquePrefix(index: CompanyIndex, name: string): Company | null {
  const key = nameKey(name);
  if (key.length < MIN_PREFIX) return null;
  let list = prefixLists.get(index);
  if (!list) {
    list = [...index.byName.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    prefixLists.set(index, list);
  }
  let lo = 0;
  let hi = list.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (list[mid][0] < key) lo = mid + 1;
    else hi = mid;
  }
  const first = list[lo];
  const second = list[lo + 1];
  if (!first?.[0].startsWith(key)) return null;
  // Ambiguous unless every match is the same company.
  if (second?.[0].startsWith(key) && second[1].cik !== first[1].cik) return null;
  return first[1];
}

export function resolveSecurity(
  cusips: CusipMap,
  index: CompanyIndex,
  cusip: string,
  name: string
): Company | null {
  const etf = ETF_CUSIPS[cusip];
  if (etf) return index.byTicker.get(etf[0]) ?? { cik: 0, ticker: etf[0], title: etf[1] };
  const expanded = expand13FName(name);
  return (
    cusips.get(cusip) ??
    resolveCompany(index, name) ??
    resolveCompany(index, expanded) ??
    byUniquePrefix(index, expanded)
  );
}
