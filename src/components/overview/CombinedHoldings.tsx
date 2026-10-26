import { formatMoney, formatPercent } from "@/lib/utils/format";
import type { Overview } from "@/lib/snaptrade/aggregate";

const pnlColor = (v: number | null) =>
  v === null ? "text-gray-500" : v >= 0 ? "text-green-600" : "text-red-600";

export function CombinedHoldings({ o }: { o: Overview }) {
  if (o.holdings.length === 0) {
    return <p className="text-sm text-gray-500">No holdings found.</p>;
  }
  const { top1, top5Pct } = o.concentration;

  return (
    <div className="space-y-4 text-gray-900">
      <p className="text-sm text-gray-600">
        Largest holding:{" "}
        <span className="font-medium text-gray-900">
          {top1?.ticker} ({top1?.pct.toFixed(1)}%)
        </span>{" "}
        · Top 5 together:{" "}
        <span className="font-medium text-gray-900">{top5Pct.toFixed(1)}%</span>{" "}
        of invested
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-gray-600 font-medium">
            <tr>
              <th className="py-2 pr-3">Holding</th>
              <th className="py-2 px-3 text-right">Value</th>
              <th className="py-2 px-3 w-40">Share</th>
              <th className="py-2 pl-3 text-right">Unrealized</th>
            </tr>
          </thead>
          <tbody>
            {o.holdings.map((h) => (
              <tr key={h.ticker} className="border-t border-gray-100 align-top">
                <td className="py-2 pr-3">
                  <div className="font-medium">{h.ticker}</div>
                  <div className="text-xs text-gray-500">
                    {h.accounts
                      .map((a) => `${a.accountName} ${a.units.toFixed(3).replace(/\.?0+$/, "")}`)
                      .join(" · ")}
                  </div>
                </td>
                <td className="py-2 px-3 text-right">
                  {formatMoney(h.marketValue, o.currency)}
                </td>
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 rounded bg-gray-100">
                      <div
                        className="h-2 rounded bg-blue-600"
                        style={{ width: `${Math.min(100, h.shareOfInvested)}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-xs text-gray-600">
                      {h.shareOfInvested.toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className={`py-2 pl-3 text-right ${pnlColor(h.unrealizedPnl)}`}>
                  <div>{formatMoney(h.unrealizedPnl, o.currency)}</div>
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
