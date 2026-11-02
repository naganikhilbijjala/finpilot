// Rolls look-through exposure up by sector and by country, so "how much of
// my money is really in tech / outside the US" counts what the funds hold.

import type { CompanyProfile } from "@/lib/sec/submissions";
import type { Exposure, ExposureRow } from "./lookthrough";
import { sicToSector } from "./sectors";

export interface BreakdownSlice {
  key: string;
  label: string;
  value: number;
  /** Percent of the breakdown's base (all invested money for sectors, stocks for countries). */
  pct: number;
  /** Largest companies in the slice, for the tooltip. */
  top: { label: string; pct: number }[];
}

export interface Breakdowns {
  sectors: BreakdownSlice[];
  countries: BreakdownSlice[];
  /** Money in individual companies (the base for countries). */
  stockValue: number;
  /** Percent of stock value whose sector came from S&P, the SEC industry code, or nowhere. */
  sectorCoverage: { sp: number; sec: number; none: number };
}

export interface SectorLookup {
  byCik: Map<number, string>;
  byTicker: Map<string, string>;
}

export const UNCLASSIFIED = "Unclassified";
/** Foreign companies outside the SEC's list: funds report their country but not their industry. */
export const INTERNATIONAL_UNCLASSIFIED = "Non-US, sector not reported";
export const UNKNOWN_COUNTRY = "Unknown";

const NON_STOCK: Record<Exclude<ExposureRow["kind"], "company">, string> = {
  cash: "Cash (inside funds)",
  bonds: "Bonds & debt",
  other: "Derivatives & other",
  fund: "Funds not split",
};

/** How many companies without an S&P sector get an SEC lookup; the long tail stays unclassified. */
export const MAX_PROFILE_LOOKUPS = 40;

const regionNames = (() => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    return null;
  }
})();

export function countryName(iso: string): string {
  if (iso === "US") return "United States";
  try {
    return regionNames?.of(iso) ?? iso;
  } catch {
    return iso;
  }
}

const label = (r: ExposureRow) => r.ticker ?? r.name;

const spSector = (r: ExposureRow, sp: SectorLookup) =>
  (r.cik !== null ? sp.byCik.get(r.cik) : undefined) ?? (r.ticker ? sp.byTicker.get(r.ticker) : undefined);

/** Companies whose sector or country needs the SEC profile, largest first. */
export function profileTargets(exposure: Exposure, sp: SectorLookup): number[] {
  const out: number[] = [];
  for (const r of exposure.rows) {
    if (r.kind !== "company" || r.cik === null) continue;
    if (!spSector(r, sp) || !r.country) out.push(r.cik);
    if (out.length >= MAX_PROFILE_LOOKUPS) break;
  }
  return out;
}

/** Groups by key; companies are listed in the tooltip, buckets aren't. Empty or net-short groups are dropped. */
function rollUp(entries: { key: string; value: number; row: ExposureRow }[], base: number): BreakdownSlice[] {
  const groups = new Map<string, { value: number; rows: ExposureRow[] }>();
  for (const e of entries) {
    const g = groups.get(e.key) ?? { value: 0, rows: [] };
    g.value += e.value;
    g.rows.push(e.row);
    groups.set(e.key, g);
  }
  return [...groups.entries()]
    .filter(([, g]) => g.value > 0)
    .map(([key, g]) => ({
      key,
      label: key,
      value: g.value,
      pct: base > 0 ? (g.value / base) * 100 : 0,
      top: g.rows
        .filter((r) => r.kind === "company")
        .sort((a, b) => b.value - a.value)
        .slice(0, 3)
        .map((r) => ({ label: label(r), pct: base > 0 ? (r.value / base) * 100 : 0 })),
    }))
    .sort((a, b) => b.value - a.value);
}

export function classify(
  exposure: Exposure,
  sp: SectorLookup,
  profiles: Map<number, CompanyProfile>
): Breakdowns {
  const sectorEntries: { key: string; value: number; row: ExposureRow }[] = [];
  const countryEntries: { key: string; value: number; row: ExposureRow }[] = [];
  const coverage = { sp: 0, sec: 0, none: 0 };
  let stockValue = 0;

  for (const r of exposure.rows) {
    if (r.kind !== "company") {
      sectorEntries.push({ key: NON_STOCK[r.kind], value: r.value, row: r });
      continue;
    }
    stockValue += r.value;
    const profile = r.cik !== null ? profiles.get(r.cik) : undefined;

    const fromSp = spSector(r, sp);
    const fromSec = fromSp ? null : sicToSector(profile?.sic);
    if (fromSp) coverage.sp += r.value;
    else if (fromSec) coverage.sec += r.value;
    else coverage.none += r.value;
    const country = r.country ? countryName(r.country) : profile?.country ?? UNKNOWN_COUNTRY;
    const foreign = country !== "United States" && country !== UNKNOWN_COUNTRY;
    sectorEntries.push({
      key: fromSp ?? fromSec ?? (foreign ? INTERNATIONAL_UNCLASSIFIED : UNCLASSIFIED),
      value: r.value,
      row: r,
    });

    countryEntries.push({ key: country, value: r.value, row: r });
  }

  const pctOf = (v: number) => (stockValue > 0 ? (v / stockValue) * 100 : 0);
  return {
    sectors: rollUp(sectorEntries, exposure.total),
    countries: rollUp(countryEntries, stockValue),
    stockValue,
    sectorCoverage: { sp: pctOf(coverage.sp), sec: pctOf(coverage.sec), none: pctOf(coverage.none) },
  };
}
