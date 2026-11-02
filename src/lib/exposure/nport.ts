// Parses the holdings out of an SEC Form N-PORT primary document (XML).
// Every US-registered fund files one per quarter listing every position.

export interface NportHolding {
  name: string;
  cusip: string | null;
  /** Percent of the fund's net assets (7.5 = 7.5%). Negative for shorts. */
  pct: number;
  /** N-PORT asset category: EC equity, EP preferred, DBT debt, STIV short-term vehicle, DE derivative, RF registered fund... */
  assetCat: string | null;
  /** ISO 3166 two-letter country of the issuer, e.g. "US", "TW". */
  country: string | null;
}

export interface NportFiling {
  seriesId: string | null;
  seriesName: string | null;
  /** Date the holdings are as of (end of the reporting period). */
  asOf: string | null;
  holdings: NportHolding[];
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

export const decodeXml = (s: string): string =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });

const tag = (block: string, name: string): string | null => {
  const m = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? decodeXml(m[1].trim()) : null;
};

const countryCode = (raw: string | null): string | null =>
  raw && /^[A-Z]{2}$/.test(raw.toUpperCase()) ? raw.toUpperCase() : null;

export function parseNport(xml: string): NportFiling {
  const holdings: NportHolding[] = [];
  for (const m of xml.matchAll(/<invstOrSec>([\s\S]*?)<\/invstOrSec>/g)) {
    const block = m[1];
    const pct = Number(tag(block, "pctVal"));
    const name = tag(block, "name") ?? tag(block, "title");
    if (!name || !Number.isFinite(pct)) continue;
    const cusip = tag(block, "cusip");
    holdings.push({
      name,
      cusip: cusip && cusip !== "N/A" && cusip !== "000000000" ? cusip : null,
      pct,
      assetCat: tag(block, "assetCat"),
      country: countryCode(tag(block, "invCountry")),
    });
  }
  return {
    seriesId: tag(xml, "seriesId"),
    seriesName: tag(xml, "seriesName"),
    asOf: tag(xml, "repPdDate"),
    holdings,
  };
}
