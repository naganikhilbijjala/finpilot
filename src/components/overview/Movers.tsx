import { ArrowDownIcon, ArrowUpIcon } from "@/components/ui/Icons";
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
  const tone = positive
    ? { bar: "from-emerald-400 to-emerald-600", text: "text-emerald-600", chip: "bg-emerald-50 text-emerald-700" }
    : { bar: "from-rose-400 to-rose-600", text: "text-rose-600", chip: "bg-rose-50 text-rose-700" };
  const Arrow = positive ? ArrowUpIcon : ArrowDownIcon;

  return (
    <div>
      <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
        <span className={`flex h-6 w-6 items-center justify-center rounded-md ${tone.chip}`}>
          <Arrow className="h-3.5 w-3.5" strokeWidth={2.5} />
        </span>
        {title}
      </h4>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">None.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((h) => (
            <li key={h.ticker}>
              <div className="flex items-baseline justify-between gap-3 text-sm text-gray-900">
                <span className="font-semibold">{h.ticker}</span>
                <span className={`num ${tone.text}`}>
                  {formatMoney(h.unrealizedPnl, currency)}{" "}
                  <span className="text-xs opacity-80">({formatPercent(h.unrealizedPct)})</span>
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${tone.bar}`}
                  style={{ width: `${Math.max(2, (Math.abs(h.unrealizedPnl ?? 0) / max) * 100)}%` }}
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
