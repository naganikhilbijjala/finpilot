export type Broker = "fidelity" | "robinhood";

export interface ImportRow {
  ticker: string;
  quantity: number;
  price: number;
  purchased_at: string; // YYYY-MM-DD
}

export interface SkippedRow {
  line: number;
  reason: string;
}

export interface ParseResult {
  broker: Broker;
  rows: ImportRow[];
  skipped: SkippedRow[];
}

// Cash sweep / money market funds trade at $1 and would swamp the portfolio.
const CASH_SYMBOLS = new Set(["SPAXX", "FDRXX", "FZFXX", "FCASH", "CORE"]);
const TICKER_RE = /^[A-Z][A-Z0-9.-]{0,9}$/;

/** Minimal RFC 4180 parser: quoted fields, escaped quotes, newlines in quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** "$1,234.50" -> 1234.5, "($12.00)" -> -12, "" -> NaN */
function parseNumber(value: string | undefined): number {
  if (!value) return NaN;
  let s = value.trim();
  if (!s) return NaN;
  const negative = s.startsWith("(") && s.endsWith(")");
  s = s.replace(/[()$,\s]/g, "");
  const n = Number(s);
  return negative ? -n : n;
}

/** "MM/DD/YYYY" or "YYYY-MM-DD" -> "YYYY-MM-DD", or null if invalid. */
function parseDate(value: string | undefined): string | null {
  if (!value) return null;
  const s = value.trim();
  let y: number, m: number, d: number;

  let match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    m = Number(match[1]);
    d = Number(match[2]);
    y = Number(match[3]);
  } else if ((match = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) {
    y = Number(match[1]);
    m = Number(match[2]);
    d = Number(match[3]);
  } else {
    return null;
  }

  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s*\(\$\)\s*$/, "");
}

/** Find the header row (brokers sometimes prepend blank lines) and index its columns. */
function findHeader(
  rows: string[][],
  required: string[]
): { index: number; cols: Record<string, number> } | null {
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const cols: Record<string, number> = {};
    rows[i].forEach((h, idx) => {
      cols[normalizeHeader(h)] = idx;
    });
    if (required.every((r) => r in cols)) return { index: i, cols };
  }
  return null;
}

export function detectBroker(rows: string[][]): Broker | null {
  if (findHeader(rows, ["run date", "action", "symbol"])) return "fidelity";
  if (findHeader(rows, ["activity date", "instrument", "trans code"]))
    return "robinhood";
  return null;
}

function parseFidelity(rows: string[][]): ParseResult {
  const header = findHeader(rows, ["run date", "action", "symbol"])!;
  const { cols } = header;
  const result: ParseResult = { broker: "fidelity", rows: [], skipped: [] };

  for (let i = header.index + 1; i < rows.length; i++) {
    const r = rows[i];
    const line = i + 1;
    const date = parseDate(r[cols["run date"]]);
    // Blank lines and the legal disclaimer Fidelity appends have no valid date.
    if (!date) continue;

    const action = (r[cols["action"]] ?? "").trim().toUpperCase();
    const isBuy =
      action.startsWith("YOU BOUGHT") || action.startsWith("REINVESTMENT");
    if (!isBuy) {
      const kind = action.startsWith("YOU SOLD")
        ? "Sell (not supported yet)"
        : "Not a buy";
      result.skipped.push({ line, reason: `${kind}: ${action.slice(0, 40)}` });
      continue;
    }

    const ticker = (r[cols["symbol"]] ?? "").trim().toUpperCase().replace(/\*+$/, "");
    if (CASH_SYMBOLS.has(ticker)) {
      result.skipped.push({ line, reason: `Cash/money market fund: ${ticker}` });
      continue;
    }
    if (!TICKER_RE.test(ticker)) {
      result.skipped.push({ line, reason: `Unsupported symbol: ${ticker || "(blank)"}` });
      continue;
    }

    const quantity = parseNumber(r[cols["quantity"]]);
    const price = parseNumber(r[cols["price"]]);
    if (!(quantity > 0) || !(price > 0)) {
      result.skipped.push({ line, reason: "Missing or invalid quantity/price" });
      continue;
    }

    result.rows.push({ ticker, quantity, price, purchased_at: date });
  }
  return result;
}

function parseRobinhood(rows: string[][]): ParseResult {
  const header = findHeader(rows, ["activity date", "instrument", "trans code"])!;
  const { cols } = header;
  const result: ParseResult = { broker: "robinhood", rows: [], skipped: [] };

  for (let i = header.index + 1; i < rows.length; i++) {
    const r = rows[i];
    const line = i + 1;
    const date = parseDate(r[cols["activity date"]]);
    if (!date) continue; // blank/disclaimer lines

    const code = (r[cols["trans code"]] ?? "").trim().toUpperCase();
    if (code !== "BUY") {
      const kind = code === "SELL" ? "Sell (not supported yet)" : "Not a buy";
      result.skipped.push({ line, reason: `${kind}: ${code || "(blank)"}` });
      continue;
    }

    const ticker = (r[cols["instrument"]] ?? "").trim().toUpperCase();
    if (!TICKER_RE.test(ticker)) {
      result.skipped.push({ line, reason: `Unsupported symbol: ${ticker || "(blank)"}` });
      continue;
    }

    const quantity = parseNumber(r[cols["quantity"]]);
    const price = parseNumber(r[cols["price"]]);
    if (!(quantity > 0) || !(price > 0)) {
      result.skipped.push({ line, reason: "Missing or invalid quantity/price" });
      continue;
    }

    result.rows.push({ ticker, quantity, price, purchased_at: date });
  }
  return result;
}

export function parseBrokerCsv(text: string): ParseResult {
  const rows = parseCsv(text);
  const broker = detectBroker(rows);
  if (!broker) {
    throw new Error(
      "Unrecognized CSV format. Expected a Fidelity (Accounts History) or Robinhood (activity report) export."
    );
  }
  return broker === "fidelity" ? parseFidelity(rows) : parseRobinhood(rows);
}
