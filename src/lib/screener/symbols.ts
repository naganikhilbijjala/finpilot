import type { Constituent } from "./sp500";
import { PRESET_UNIVERSE } from "./universe";

/** Brokers write BRK.B; our universe uses the dash form. */
export const normalizeSymbol = (ticker: string): string =>
  ticker.trim().toUpperCase().replace(/\./g, "-");

// Index per universe array so lookups stay O(1) without rebuilding on every call.
const INDEXES = new WeakMap<Constituent[], Map<string, Constituent>>();
function indexOf(universe: Constituent[]): Map<string, Constituent> {
  let idx = INDEXES.get(universe);
  if (!idx) {
    idx = new Map(universe.map((c) => [c.symbol, c]));
    INDEXES.set(universe, idx);
  }
  return idx;
}

export const findConstituent = (
  ticker: string,
  universe: Constituent[] = PRESET_UNIVERSE
): Constituent | undefined => indexOf(universe).get(normalizeSymbol(ticker));

/** Plausible US ticker: 1-5 letters, optionally a share-class suffix (BRK-B). */
export const looksLikeTicker = (query: string): boolean =>
  /^[A-Z]{1,5}(-[A-Z])?$/.test(normalizeSymbol(query));

/** Best matches for a ticker or company-name query: exact ticker, ticker prefix, name prefix, word prefix, then substring. */
export function searchStocks(
  query: string,
  limit = 6,
  universe: Constituent[] = PRESET_UNIVERSE
): Constituent[] {
  const q = normalizeSymbol(query);
  if (!q) return [];
  const raw = query.trim().toUpperCase();

  const scored: [number, Constituent][] = [];
  for (const c of universe) {
    const name = c.name.toUpperCase();
    let score: number | null = null;
    if (c.symbol === q) score = 0;
    else if (c.symbol.startsWith(q)) score = 1;
    else if (name.startsWith(raw)) score = 2;
    else if (name.split(/[\s.,()&-]+/).some((w) => w.startsWith(raw))) score = 3;
    else if (name.includes(raw)) score = 4;
    else if (c.symbol.includes(q)) score = 5;
    if (score !== null) scored.push([score, c]);
  }

  return scored
    .sort((a, b) => a[0] - b[0] || a[1].symbol.length - b[1].symbol.length || a[1].symbol.localeCompare(b[1].symbol))
    .slice(0, limit)
    .map(([, c]) => c);
}
