import { SP500, type Constituent } from "./sp500";

/** Brokers write BRK.B; our universe uses the dash form. */
export const normalizeSymbol = (ticker: string): string =>
  ticker.trim().toUpperCase().replace(/\./g, "-");

const BY_SYMBOL = new Map(SP500.map((c) => [c.symbol, c]));

export const findConstituent = (ticker: string): Constituent | undefined =>
  BY_SYMBOL.get(normalizeSymbol(ticker));

/** Best matches for a ticker or company-name query: exact ticker, ticker prefix, name prefix, word prefix, then substring. */
export function searchStocks(query: string, limit = 6): Constituent[] {
  const q = normalizeSymbol(query);
  if (!q) return [];
  // Names never contain dashes from our normalisation, so match them with the raw query.
  const raw = query.trim().toUpperCase();

  const scored: [number, Constituent][] = [];
  for (const c of SP500) {
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
