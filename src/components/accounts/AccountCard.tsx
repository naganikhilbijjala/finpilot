import { Card } from "@/components/ui/Card";
import { formatMoney, formatPercent } from "@/lib/utils/format";
import type { AccountSnapshot } from "@/lib/snaptrade/types";

const pnlColor = (v: number | null) =>
  v === null ? "text-gray-500" : v >= 0 ? "text-green-600" : "text-red-600";

export function AccountCard({ snapshot }: { snapshot: AccountSnapshot }) {
  const { account, positions } = snapshot;

  return (
    <Card
      title={account.name}
      subtitle={`${account.institution} · ${account.maskedNumber}`}
      action={
        <div className="text-right">
          <div className="text-xl font-semibold text-gray-900">
            {formatMoney(account.totalValue, account.currency)}
          </div>
          <div className="text-xs text-gray-500">
            Cash {formatMoney(account.cash, account.currency)}
          </div>
        </div>
      }
    >
      {account.initialSyncCompleted === false && (
        <p className="mb-3 text-sm text-amber-700">
          The brokerage&apos;s initial sync hasn&apos;t finished, so data may be
          incomplete.
        </p>
      )}

      {positions.length === 0 ? (
        <p className="text-sm text-gray-500">No positions.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-gray-900">
            <thead className="text-left text-gray-600 font-medium">
              <tr>
                <th className="py-2 pr-3">Ticker</th>
                <th className="py-2 px-3 text-right">Units</th>
                <th className="py-2 px-3 text-right">Avg cost</th>
                <th className="py-2 px-3 text-right">Price</th>
                <th className="py-2 px-3 text-right">Value</th>
                <th className="py-2 pl-3 text-right">Unrealized</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <tr key={p.ticker} className="border-t border-gray-100">
                  <td className="py-2 pr-3">
                    <div className="font-medium text-gray-900">{p.ticker}</div>
                    {p.description && (
                      <div className="text-xs text-gray-500 truncate max-w-48">
                        {p.description}
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right">{p.units}</td>
                  <td className="py-2 px-3 text-right">
                    {formatMoney(p.averageCost, p.currency)}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {formatMoney(p.price, p.currency)}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {formatMoney(p.marketValue, p.currency)}
                  </td>
                  <td
                    className={`py-2 pl-3 text-right ${pnlColor(p.unrealizedPnl)}`}
                  >
                    <div>{formatMoney(p.unrealizedPnl, p.currency)}</div>
                    <div className="text-xs">{formatPercent(p.unrealizedPct)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
