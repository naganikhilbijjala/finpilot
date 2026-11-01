// Matches the issuer names in fund filings ("NVIDIA Corp", "Alphabet Inc")
// to SEC registrants, so a company counts once whether it is held directly or
// inside several funds, and share classes (GOOGL/GOOG) collapse together.

import { decodeXml } from "./nport";

export interface Company {
  cik: number;
  /** Primary ticker: the first one the SEC lists for the company. */
  ticker: string;
  title: string;
}

export interface CompanyIndex {
  byTicker: Map<string, Company>;
  byName: Map<string, Company>;
  byTokens: Map<string, Company>;
}

// Legal-form and filler words that differ between how funds and the SEC
// write the same company.
const NOISE = new Set([
  "INC", "INCORPORATED", "CORP", "CORPORATION", "CO", "COS", "COMPANY", "COMPANIES",
  "LTD", "LIMITED", "PLC", "HOLDING", "HOLDINGS", "GROUP", "NV", "SA", "AG", "LP",
  "LLC", "THE", "CL", "CLASS", "COM", "NEW", "DEL", "DE", "SE", "AS", "ASA", "AB",
  "SPA", "BHD", "AND",
]);

// Names too different to normalise: fund filing key -> SEC ticker.
const ALIASES: Record<string, string> = {
  BLACKROCKFUNDING: "BLK",
};

export const normalizeTicker = (t: string) => t.trim().toUpperCase().replace(/[./ ]/g, "-");

function tokens(name: string): string[] {
  let n = decodeXml(name).toUpperCase();
  n = n.replace(/\s*\/.*$/, ""); // "TJX Cos Inc/The", "VERTEX PHARMACEUTICALS INC / MA"
  // Dotted abbreviations: "N.V." -> "NV", "S.P.A." -> "SPA".
  for (let prev = ""; prev !== n; ) {
    prev = n;
    n = n.replace(/\b([A-Z])\.(?=[A-Z]\b)/g, "$1");
  }
  n = n.replace(/'/g, "").replace(/&/g, " ");
  n = n.replace(/\bCLASS [A-Z]\b|\bCL [A-Z]\b/g, " ");
  return n
    .split(/[^A-Z0-9]+/)
    .filter((w) => w && !NOISE.has(w));
}

/** Order-sensitive key with spacing removed: "Exxon Mobil" == "ExxonMobil". */
export const nameKey = (name: string) => tokens(name).join("");
/** Order-insensitive key: "Charles Schwab Corp" == "SCHWAB CHARLES CORP". */
const tokenKey = (name: string) => [...tokens(name)].sort().join(" ");

/** Builds the index from the SEC's company_tickers.json. */
export function buildCompanyIndex(json: unknown): CompanyIndex {
  const index: CompanyIndex = { byTicker: new Map(), byName: new Map(), byTokens: new Map() };
  if (!json || typeof json !== "object") return index;

  const primary = new Map<number, Company>();
  for (const entry of Object.values(json as Record<string, unknown>)) {
    const e = entry as { cik_str?: unknown; ticker?: unknown; title?: unknown };
    const cik = Number(e?.cik_str);
    if (typeof e?.ticker !== "string" || typeof e?.title !== "string" || !Number.isFinite(cik)) continue;
    const company = primary.get(cik) ?? { cik, ticker: normalizeTicker(e.ticker), title: e.title };
    primary.set(cik, company);
    index.byTicker.set(normalizeTicker(e.ticker), company);
  }
  for (const company of primary.values()) {
    const key = nameKey(company.title);
    if (key && !index.byName.has(key)) index.byName.set(key, company);
    const tk = tokenKey(company.title);
    if (tk && !index.byTokens.has(tk)) index.byTokens.set(tk, company);
  }
  return index;
}

export function resolveCompany(index: CompanyIndex, issuerName: string): Company | null {
  const key = nameKey(issuerName);
  if (!key) return null;
  const alias = ALIASES[key];
  if (alias) return index.byTicker.get(alias) ?? null;
  return index.byName.get(key) ?? index.byTokens.get(tokenKey(issuerName)) ?? null;
}
