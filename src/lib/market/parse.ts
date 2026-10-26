export interface PricePoint {
  /** YYYY-MM-DD (exchange date). */
  date: string;
  /** Split-adjusted close, not adjusted for dividends: the actual market price. */
  close: number;
  /** Close adjusted for splits and dividends: total-return basis. */
  adjclose: number;
}

export interface Split {
  date: string;
  /** Share multiplier: 10 for a 10-for-1 split, 0.5 for a 1-for-2 reverse split. */
  factor: number;
}

export interface PriceHistory {
  ticker: string;
  points: PricePoint[];
  splits: Split[];
}

interface YahooChart {
  chart?: {
    result?: Array<{
      meta?: { symbol?: string };
      timestamp?: number[];
      events?: {
        splits?: Record<string, { date?: number; numerator?: number; denominator?: number }>;
      };
      indicators?: {
        quote?: Array<{ close?: (number | null)[] }>;
        adjclose?: Array<{ adjclose?: (number | null)[] }>;
      };
    }> | null;
    error?: { description?: string } | null;
  };
}

const isoDate = (seconds: number) => new Date(seconds * 1000).toISOString().slice(0, 10);

/** Parses Yahoo's chart response. Throws if it holds no usable prices. */
export function parseYahooChart(json: unknown, ticker: string): PriceHistory {
  const chart = (json as YahooChart)?.chart;
  if (chart?.error) {
    throw new Error(`No price history for ${ticker}: ${chart.error.description ?? "error"}`);
  }
  const r = chart?.result?.[0];
  const ts = r?.timestamp;
  const close = r?.indicators?.quote?.[0]?.close;
  if (!r || !ts || !close) throw new Error(`No price history for ${ticker}`);
  const adj = r.indicators?.adjclose?.[0]?.adjclose;

  const points: PricePoint[] = [];
  for (let i = 0; i < ts.length; i++) {
    const c = close[i];
    if (c === null || c === undefined || !Number.isFinite(c) || c <= 0) continue;
    const a = adj?.[i];
    points.push({
      date: isoDate(ts[i]),
      close: c,
      adjclose: a !== null && a !== undefined && Number.isFinite(a) && a > 0 ? a : c,
    });
  }
  if (points.length === 0) throw new Error(`No price history for ${ticker}`);

  const splits: Split[] = Object.values(r.events?.splits ?? {})
    .filter((s) => s.date && s.numerator && s.denominator)
    .map((s) => ({ date: isoDate(s.date!), factor: s.numerator! / s.denominator! }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { ticker, points, splits };
}
