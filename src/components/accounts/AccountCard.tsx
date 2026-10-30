import { TickerLink } from "@/components/screener/TickerLink";
import { Card } from "@/components/ui/Card";
import { formatMoney, formatPercent } from "@/lib/utils/format";
import type { AccountSnapshot } from "@/lib/snaptrade/types";
import {
  STOCK_CONCENTRATION_LIMIT_PCT,
  accountSharePct,
  isConcentrated,
} from "@/lib/snaptrade/concentration";

const pnlColor = (v: number | null) =>
  v === null ? "text-gray-500" : v >= 0 ? "text-emerald-600" : "text-rose-600";

export function AccountCard({ snapshot }: { snapshot: AccountSnapshot }) {
  const { account, positions } = snapshot;

  return (
    <Card
      title={account.name}
      subtitle={`${account.institution} · ${account.maskedNumber}`}
      action={
        <div className="text-right">
          <div className="num text-xl font-semibold tracking-tight text-gray-900">
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
            <thead className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <tr>
                <th className="py-3 pr-3">Ticker</th>
                <th className="py-3 px-3 text-right">Units</th>
                <th className="py-3 px-3 text-right">Avg cost</th>
                <th className="py-3 px-3 text-right">Price</th>
                <th className="py-3 px-3 text-right">Value</th>
                <th className="py-3 px-3 text-right">% of account</th>
                <th className="py-3 pl-3 text-right">Unrealized</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => {
                const pct = accountSharePct(p, snapshot);
                const flagged = isConcentrated(p, pct);
                return (
                  <tr
                    key={p.ticker}
                    className={`num border-t border-gray-100 transition-colors ${
                      flagged ? "bg-amber-50" : "hover:bg-gray-50/70"
                    }`}
                  >
                    <td className="py-3 pr-3">
                      <div className="font-medium text-gray-900">
                        <TickerLink ticker={p.ticker} />
                      </div>
                      {p.description && (
                        <div className="text-xs text-gray-500 truncate max-w-48">
                          {p.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">{p.units}</td>
                    <td className="py-3 px-3 text-right">
                      {formatMoney(p.averageCost, p.currency)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {formatMoney(p.price, p.currency)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {formatMoney(p.marketValue, p.currency)}
                    </td>
                    <td
                      className={`py-3 px-3 text-right ${flagged ? "font-medium text-amber-700" : ""}`}
                      title={
                        flagged
                          ? `Above the ${STOCK_CONCENTRATION_LIMIT_PCT}% single-stock guideline`
                          : undefined
                      }
                    >
                      {pct === null ? "—" : `${pct.toFixed(1)}%`}
                      {flagged && " ⚠"}
                    </td>
                    <td
                      className={`py-3 pl-3 text-right ${pnlColor(p.unrealizedPnl)}`}
                    >
                      <div>{formatMoney(p.unrealizedPnl, p.currency)}</div>
                      <div className="text-xs">{formatPercent(p.unrealizedPct)}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
