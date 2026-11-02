// "Most owned across these managers": stocks several of them hold, with how
// much of each portfolio they take and whether you already own them.

import type { Manager } from "./managers";
import type { ManagerReport } from "./report";

export interface ConsensusHolder {
  cik: number;
  name: string;
  pct: number;
}

export interface ConsensusRow {
  ticker: string;
  name: string;
  holders: ConsensusHolder[];
  /** Average weight among the managers who hold it. */
  avgPct: number;
  /** Your look-through exposure, or null if you don't own it. */
  ownedPct: number | null;
}

/** Copied-portfolio return minus the S&P 500's, per year, over `years`; null if too little history. */
export function edge(report: ManagerReport | undefined, years: number): number | null {
  const w = report?.clone?.windows.find((x) => x.years === years);
  return w ? w.cloneAnnual - w.benchAnnual : null;
}

export function consensus(
  entries: { manager: Manager; report: ManagerReport }[],
  owned: Record<string, number>,
  minHolders = 2
): ConsensusRow[] {
  const rows = new Map<string, { name: string; holders: ConsensusHolder[] }>();
  for (const { manager, report } of entries) {
    const seen = new Set<string>();
    for (const h of report.holdings) {
      if (!h.ticker || seen.has(h.ticker)) continue;
      seen.add(h.ticker);
      const row = rows.get(h.ticker) ?? { name: h.name, holders: [] };
      row.holders.push({ cik: manager.cik, name: manager.name, pct: h.pct });
      rows.set(h.ticker, row);
    }
  }
  return [...rows.entries()]
    .filter(([, r]) => r.holders.length >= minHolders)
    .map(([ticker, r]) => ({
      ticker,
      name: r.name,
      holders: r.holders.sort((a, b) => b.pct - a.pct),
      avgPct: r.holders.reduce((s, h) => s + h.pct, 0) / r.holders.length,
      ownedPct: owned[ticker] ?? null,
    }))
    .sort((a, b) => b.holders.length - a.holders.length || b.avgPct - a.avgPct);
}
