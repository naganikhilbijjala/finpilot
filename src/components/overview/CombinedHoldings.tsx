import { categoryColor } from "@/components/charts/theme";
import { formatMoney, formatPercent } from "@/lib/utils/format";
import type { Overview } from "@/lib/snaptrade/aggregate";

const pnlColor = (v: number | null) =>
  v === null ? "text-gray-500" : v >= 0 ? "text-emerald-600" : "text-rose-600";

export function CombinedHoldings({
  o,
  limit,
}: {
  o: Overview;
  /** Show only the largest N holdings. */
  limit?: number;
}) {
  if (o.holdings.length === 0) {
    return <p className="text-sm text-gray-500">No holdings found.</p>;
  }
  const { top1, top5Pct } = o.concentration;
  const rows = limit ? o.holdings.slice(0, limit) : o.holdings;

  return (
    <div className="space-y-4 text-gray-900">
      <div className="flex flex-wrap gap-3 px-5 sm:px-6">
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
          Largest: <span className="font-semibold text-gray-900">{top1?.ticker} ({top1?.pct.toFixed(1)}%)</span>
        </span>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
          Top 5 together: <span className="font-semibold text-gray-900">{top5Pct.toFixed(1)}%</span> of invested
        </span>
      </div>
      <div className="overflow-x-auto px-5 pb-2 sm:px-6">
        <table className="min-w-full text-sm">
          <thead className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
            <tr>
              <th className="py-2 pr-3">Holding</th>
              <th className="px-3 py-2 text-right">Value</th>
              <th className="w-44 px-3 py-2">Share</th>
              <th className="py-2 pl-3 text-right">Unrealized</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((h, i) => (
              <tr key={h.ticker} className="border-t border-gray-100 align-middle transition-colors hover:bg-gray-50/70">
                <td className="py-3 pr-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white"
                      style={{ background: categoryColor(i) }}
                    >
                      {h.ticker.slice(0, 4)}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold">{h.ticker}</div>
                      <div className="max-w-[16rem] truncate text-xs text-gray-500">
                        {h.accounts
                          .map((a) => `${a.accountName} ${a.units.toFixed(3).replace(/\.?0+$/, "")}`)
                          .join(" · ")}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="num px-3 py-3 text-right font-medium">
                  {formatMoney(h.marketValue, o.currency)}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-primary-500"
                        style={{ width: `${Math.min(100, h.shareOfInvested)}%` }}
                      />
                    </div>
                    <span className="num w-12 text-right text-xs text-gray-600">
                      {h.shareOfInvested.toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className={`num py-3 pl-3 text-right ${pnlColor(h.unrealizedPnl)}`}>
                  <div className="font-medium">{formatMoney(h.unrealizedPnl, o.currency)}</div>
                  <div className="text-xs">{formatPercent(h.unrealizedPct)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
