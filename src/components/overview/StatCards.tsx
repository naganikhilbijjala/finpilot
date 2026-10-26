import { formatMoney, formatPercent } from "@/lib/utils/format";
import type { Overview } from "@/lib/snaptrade/aggregate";

function Stat({
  label,
  value,
  sub,
  subClass = "text-gray-500",
}: {
  label: string;
  value: string;
  sub?: string;
  subClass?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
      {sub && <div className={`mt-1 text-sm ${subClass}`}>{sub}</div>}
    </div>
  );
}

export function StatCards({ o }: { o: Overview }) {
  const gainClass =
    o.unrealizedPnl >= 0 ? "text-green-600" : "text-red-600";
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Stat
        label="Net worth"
        value={formatMoney(o.netWorth, o.currency)}
        sub={`${o.accounts.length} account${o.accounts.length === 1 ? "" : "s"}`}
      />
      <Stat
        label="Invested"
        value={formatMoney(o.invested, o.currency)}
        sub={`${o.holdings.length} holding${o.holdings.length === 1 ? "" : "s"}`}
      />
      <Stat
        label="Cash"
        value={formatMoney(o.cash, o.currency)}
        sub={`${o.cashPct.toFixed(1)}% of net worth`}
      />
      <Stat
        label="Unrealized gain"
        value={formatMoney(o.unrealizedPnl, o.currency)}
        sub={`${formatPercent(o.unrealizedPct)} on cost`}
        subClass={gainClass}
      />
    </div>
  );
}
