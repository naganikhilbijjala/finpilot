import { CATEGORY_LABELS } from "@/lib/screener/metrics";
import type { ScreenResult } from "@/lib/screener/screen";

const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(1)}%`);
const x = (v: number | null) => (v === null ? "—" : v.toFixed(1));

export function ScreenerTable({ results }: { results: ScreenResult[] }) {
  if (results.length === 0) {
    return <p className="px-5 py-6 text-sm text-gray-500 sm:px-6">No stocks match these criteria.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-gray-900">
        <thead className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
          <tr>
            <th className="py-3 pl-5 pr-3 sm:pl-6">Stock</th>
            <th className="py-3 px-3">Type</th>
            <th className="py-3 px-3 text-right">P/E</th>
            <th className="py-3 px-3 text-right">PEG</th>
            <th className="py-3 px-3 text-right">EPS growth/yr</th>
            <th className="py-3 px-3 text-right">D/E</th>
            <th className="py-3 px-3 text-right">ROIC</th>
            <th className="py-3 px-3 text-right">FCF yield</th>
            <th className="py-3 pl-3 pr-5 text-right sm:pr-6">Shares YoY</th>
          </tr>
        </thead>
        <tbody>
          {results.map(({ stock: s }) => (
            <tr key={s.symbol} className="num border-t border-gray-100 transition-colors hover:bg-gray-50/70">
              <td className="py-3 pl-5 pr-3 sm:pl-6">
                <div className="font-medium">{s.symbol}</div>
                <div className="max-w-48 truncate text-xs text-gray-500">{s.name}</div>
              </td>
              <td className="py-3 px-3 text-xs text-gray-600">{CATEGORY_LABELS[s.category]}</td>
              <td className="py-3 px-3 text-right">{x(s.pe)}</td>
              <td className="py-3 px-3 text-right">{x(s.peg)}</td>
              <td className="py-3 px-3 text-right">{pct(s.epsCagr5y)}</td>
              <td className="py-3 px-3 text-right">{x(s.debtToEquity)}</td>
              <td className="py-3 px-3 text-right">{pct(s.roic)}</td>
              <td className="py-3 px-3 text-right">{pct(s.fcfYield)}</td>
              <td className="py-3 pl-3 pr-5 text-right sm:pr-6">{pct(s.shareCountChange)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
