import { formatMoney, formatPercent } from "@/lib/utils/format";
import type { HoldingAgg } from "@/lib/snaptrade/aggregate";

function List({
  title,
  items,
  currency,
  positive,
}: {
  title: string;
  items: HoldingAgg[];
  currency: string | null;
  positive: boolean;
}) {
  const max = Math.max(...items.map((h) => Math.abs(h.unrealizedPnl ?? 0)), 1);
  const bar = positive ? "bg-green-500" : "bg-red-500";
  const text = positive ? "text-green-600" : "text-red-600";

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-900 mb-3">{title}</h4>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">None.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((h) => (
            <li key={h.ticker}>
              <div className="flex justify-between text-sm text-gray-900">
                <span className="font-medium">{h.ticker}</span>
                <span className={text}>
                  {formatMoney(h.unrealizedPnl, currency)}{" "}
                  <span className="text-xs">({formatPercent(h.unrealizedPct)})</span>
                </span>
              </div>
              <div className="mt-1 h-2 rounded bg-gray-100">
                <div
                  className={`h-2 rounded ${bar}`}
                  style={{ width: `${(Math.abs(h.unrealizedPnl ?? 0) / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Movers({
  gainers,
  losers,
  currency,
}: {
  gainers: HoldingAgg[];
  losers: HoldingAgg[];
  currency: string | null;
}) {
  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <List title="Top gainers" items={gainers} currency={currency} positive />
      <List title="Top losers" items={losers} currency={currency} positive={false} />
    </div>
  );
}
