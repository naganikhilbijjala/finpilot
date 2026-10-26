import { formatMoney } from "@/lib/utils/format";
import type { Overview } from "@/lib/snaptrade/aggregate";

export function CashBreakdown({ o }: { o: Overview }) {
  return (
    <div className="space-y-4 text-gray-900">
      <p className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">{o.cashPct.toFixed(1)}%</span> of
        your net worth ({formatMoney(o.cash, o.currency)}) is cash or money market.
      </p>
      <ul className="space-y-3">
        {o.accounts.map((a) => {
          const total = a.totalValue > 0 ? a.totalValue : 1;
          const cashW = a.cash !== null ? Math.min(100, (a.cash / total) * 100) : 0;
          return (
            <li key={a.id}>
              <div className="flex justify-between text-sm">
                <span className="font-medium">{a.name}</span>
                <span className="text-gray-600">
                  {a.cash === null
                    ? "cash unknown"
                    : `${formatMoney(a.cash, o.currency)} cash (${(a.cashPct ?? 0).toFixed(1)}%)`}
                </span>
              </div>
              <div className="mt-1 flex h-2 overflow-hidden rounded bg-gray-100">
                <div className="bg-blue-600" style={{ width: `${100 - cashW}%` }} />
                <div className="bg-amber-400" style={{ width: `${cashW}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex gap-4 text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-blue-600" /> Invested
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-amber-400" /> Cash
        </span>
      </div>
    </div>
  );
}
