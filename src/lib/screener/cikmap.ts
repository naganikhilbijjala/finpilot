/** Parses the SEC's company_tickers.json ({"0": {cik_str, ticker, title}, ...}) into ticker -> CIK. */
export function parseTickerMap(json: unknown): Map<string, number> {
  const map = new Map<string, number>();
  if (!json || typeof json !== "object") return map;
  for (const entry of Object.values(json as Record<string, unknown>)) {
    const e = entry as { cik_str?: unknown; ticker?: unknown };
    const cik = Number(e?.cik_str);
    if (typeof e?.ticker === "string" && Number.isFinite(cik)) {
      // Share classes: SEC writes BRK-B already, but normalise any dotted form.
      map.set(e.ticker.toUpperCase().replace(/\./g, "-"), cik);
    }
  }
  return map;
}
