// Parses a Form 13F information table: the quarterly list of US-listed stocks,
// ETFs and options that every manager with $100M+ must file.

import { decodeXml } from "@/lib/exposure/nport";

export interface InfoTableRow {
  name: string;
  titleOfClass: string;
  cusip: string;
  /** Market value. Dollars since 2023; thousands of dollars before. */
  value: number;
  shares: number;
  /** SH for shares, PRN for bond principal. */
  shareType: string;
  /** "Put" or "Call" for option positions, otherwise null. */
  putCall: string | null;
}

/** One stock position, after merging the rows managers split across sub-advisers. */
export interface Position {
  cusip: string;
  name: string;
  value: number;
  shares: number;
}

// Filers may prefix every tag with a namespace (<ns1:infoTable>).
const tag = (block: string, name: string): string | null => {
  const m = block.match(new RegExp(`<(?:\\w+:)?${name}>([\\s\\S]*?)</(?:\\w+:)?${name}>`, "i"));
  return m ? decodeXml(m[1].trim()) : null;
};

export function parseInfoTable(xml: string): InfoTableRow[] {
  const rows: InfoTableRow[] = [];
  for (const m of xml.matchAll(/<(?:\w+:)?infoTable>([\s\S]*?)<\/(?:\w+:)?infoTable>/gi)) {
    const block = m[1];
    const cusip = tag(block, "cusip")?.toUpperCase();
    const value = Number(tag(block, "value"));
    if (!cusip || !Number.isFinite(value)) continue;
    rows.push({
      name: tag(block, "nameOfIssuer") ?? cusip,
      titleOfClass: tag(block, "titleOfClass") ?? "",
      cusip,
      value,
      shares: Number(tag(block, "sshPrnamt")) || 0,
      shareType: (tag(block, "sshPrnamtType") ?? "SH").toUpperCase(),
      putCall: tag(block, "putCall"),
    });
  }
  return rows;
}

/** Long stock positions only (options and bonds dropped), merged by CUSIP, largest first. */
export function toPositions(rows: InfoTableRow[]): Position[] {
  const byCusip = new Map<string, Position>();
  for (const r of rows) {
    if (r.putCall || r.shareType !== "SH" || r.value <= 0) continue;
    const p = byCusip.get(r.cusip) ?? { cusip: r.cusip, name: r.name, value: 0, shares: 0 };
    p.value += r.value;
    p.shares += r.shares;
    byCusip.set(r.cusip, p);
  }
  return [...byCusip.values()].sort((a, b) => b.value - a.value);
}

/** Picks the information table from a filing folder's file list. */
export function infoTableFile(names: string[]): string | null {
  const xml = names.filter((n) => /\.xml$/i.test(n) && !/^primary_doc\.xml$/i.test(n));
  return xml.find((n) => /info/i.test(n)) ?? xml[0] ?? null;
}
