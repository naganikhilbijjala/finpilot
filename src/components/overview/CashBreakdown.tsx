import { CHART } from "@/components/charts/theme";
import { formatMoney } from "@/lib/utils/format";
import type { Overview } from "@/lib/snaptrade/aggregate";

export function CashBreakdown({ o }: { o: Overview }) {
  const investedPct = Math.max(0, 100 - o.cashPct);
  return (
    <div className="space-y-5 text-gray-900">
      <div>
        <div className="flex items-end justify-between">
          <div>
            <div className="num text-3xl font-semibold tracking-tight">
              {o.cashPct.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">
              {formatMoney(o.cash, o.currency)} in cash or money market
            </div>
          </div>
          <div className="text-right text-sm text-gray-500">
            <div className="num font-medium text-gray-900">{investedPct.toFixed(1)}%</div>
            invested
          </div>
        </div>
        <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-gray-100">
          <div
            className="rounded-l-full"
            style={{ width: `${investedPct}%`, background: CHART.primary }}
          />
          <div style={{ width: `${o.cashPct}%`, background: CHART.benchmark }} />
        </div>
        <div className="mt-2 flex gap-4 text-xs text-gray-600">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: CHART.primary }} /> Invested
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: CHART.benchmark }} /> Cash
          </span>
        </div>
      </div>

      <ul className="space-y-3 border-t border-gray-100 pt-4">
        {o.accounts.map((a) => {
          const total = a.totalValue > 0 ? a.totalValue : 1;
          const cashW = a.cash !== null ? Math.min(100, (a.cash / total) * 100) : 0;
          return (
            <li key={a.id}>
              <div className="flex justify-between gap-3 text-sm">
                <span className="truncate font-medium">{a.name}</span>
                <span className="num shrink-0 text-gray-500">
                  {a.cash === null
                    ? "cash unknown"
                    : `${formatMoney(a.cash, o.currency)} (${(a.cashPct ?? 0).toFixed(1)}%)`}
                </span>
              </div>
              <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div style={{ width: `${100 - cashW}%`, background: CHART.primary }} />
                <div style={{ width: `${cashW}%`, background: CHART.benchmark }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
