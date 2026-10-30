"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CATEGORY_LABELS } from "@/lib/screener/metrics";
import type { ScreenResult } from "@/lib/screener/screen";
import type { Fundamentals } from "@/lib/screener/types";

const pct = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : `${(v * 100).toFixed(1)}%`;
const x = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : v.toFixed(1);

type SortValue = string | number | null | undefined;

interface Column {
  key: string;
  label: string;
  title?: string;
  /** First-click direction: lower-is-better ratios start ascending, the rest descending. */
  firstDir: "asc" | "desc";
  value: (s: Fundamentals) => SortValue;
  render: (s: Fundamentals) => string;
  align?: "left" | "right";
}

const COLUMNS: Column[] = [
  { key: "type", label: "Type", firstDir: "asc", align: "left", value: (s) => CATEGORY_LABELS[s.category], render: (s) => CATEGORY_LABELS[s.category] },
  { key: "pe", label: "P/E", firstDir: "asc", value: (s) => s.pe, render: (s) => x(s.pe) },
  { key: "peg", label: "PEG", firstDir: "asc", value: (s) => s.peg, render: (s) => x(s.peg) },
  { key: "eps", label: "EPS growth/yr", firstDir: "desc", value: (s) => s.epsCagr5y, render: (s) => pct(s.epsCagr5y) },
  { key: "rev5", label: "Rev 5y", firstDir: "desc", value: (s) => s.revenueCagr5y, render: (s) => pct(s.revenueCagr5y) },
  { key: "rev10", label: "Rev 10y", title: "From SEC filings; empty when there are under 10 years of history", firstDir: "desc", value: (s) => s.revenueCagr10y, render: (s) => pct(s.revenueCagr10y) },
  { key: "de", label: "D/E", firstDir: "asc", value: (s) => s.debtToEquity, render: (s) => x(s.debtToEquity) },
  { key: "roic", label: "ROIC", firstDir: "desc", value: (s) => s.roic, render: (s) => pct(s.roic) },
  { key: "fcf", label: "FCF yield", firstDir: "desc", value: (s) => s.fcfYield, render: (s) => pct(s.fcfYield) },
];

const STOCK: Pick<Column, "key" | "label" | "firstDir" | "value"> = {
  key: "symbol",
  label: "Stock",
  firstDir: "asc",
  value: (s) => s.symbol,
};

export function compareBy(
  value: (s: Fundamentals) => SortValue,
  dir: "asc" | "desc"
): (a: Fundamentals, b: Fundamentals) => number {
  return (a, b) => {
    const va = value(a) ?? null;
    const vb = value(b) ?? null;
    // Empty values sort last in either direction.
    if (va === null && vb === null) return a.symbol.localeCompare(b.symbol);
    if (va === null) return 1;
    if (vb === null) return -1;
    const cmp = typeof va === "string" ? va.localeCompare(vb as string) : va - (vb as number);
    return (dir === "asc" ? cmp : -cmp) || a.symbol.localeCompare(b.symbol);
  };
}

function SortHeader({
  col,
  active,
  dir,
  onSort,
  className,
}: {
  col: Pick<Column, "key" | "label" | "title">;
  active: boolean;
  dir: "asc" | "desc";
  onSort: (key: string) => void;
  className: string;
}) {
  return (
    <th
      className={className}
      title={col.title}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(col.key)}
        className={`inline-flex items-center gap-1 uppercase tracking-wider hover:text-gray-900 ${
          active ? "text-gray-900" : ""
        }`}
      >
        {col.label}
        <span className="w-2 text-[10px] leading-none" aria-hidden>
          {active ? (dir === "asc" ? "▲" : "▼") : ""}
        </span>
      </button>
    </th>
  );
}

export function ScreenerTable({ results }: { results: ScreenResult[] }) {
  // Default: PEG, lowest first (cheapest relative to growth).
  const [sortKey, setSortKey] = useState("peg");
  const [dir, setDir] = useState<"asc" | "desc">("asc");

  const rows = useMemo(() => {
    const col = sortKey === STOCK.key ? STOCK : COLUMNS.find((c) => c.key === sortKey)!;
    return results.map((r) => r.stock).sort(compareBy(col.value, dir));
  }, [results, sortKey, dir]);

  function onSort(key: string) {
    if (key === sortKey) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    const col = key === STOCK.key ? STOCK : COLUMNS.find((c) => c.key === key)!;
    setSortKey(key);
    setDir(col.firstDir);
  }

  if (results.length === 0) {
    return <p className="px-5 py-6 text-sm text-gray-500 sm:px-6">No stocks match these criteria.</p>;
  }

  const head = "py-3 px-3 text-xs font-medium text-gray-500";

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-gray-900">
        <thead className="text-left">
          <tr>
            <SortHeader col={STOCK} active={sortKey === STOCK.key} dir={dir} onSort={onSort} className={`${head} pl-5 pr-3 sm:pl-6`} />
            {COLUMNS.map((c, i) => (
              <SortHeader
                key={c.key}
                col={c}
                active={sortKey === c.key}
                dir={dir}
                onSort={onSort}
                className={`${head} ${c.align === "left" ? "" : "text-right"} ${i === COLUMNS.length - 1 ? "pr-5 sm:pr-6" : ""}`}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.symbol} className="num border-t border-gray-100 transition-colors hover:bg-gray-50/70">
              <td className="py-3 pl-5 pr-3 sm:pl-6">
                <Link href={`/screener/${s.symbol}`} className="font-medium text-primary-600 hover:underline">
                  {s.symbol}
                </Link>
                <div className="max-w-48 truncate text-xs text-gray-500">{s.name}</div>
              </td>
              {COLUMNS.map((c, i) => (
                <td
                  key={c.key}
                  className={`py-3 px-3 ${c.align === "left" ? "text-xs text-gray-600" : "text-right"} ${
                    i === COLUMNS.length - 1 ? "pr-5 sm:pr-6" : ""
                  }`}
                >
                  {c.render(s)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
