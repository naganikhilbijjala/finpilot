import { StatCard } from "@/components/ui/StatCard";
import { ChartIcon, LayersIcon, WalletIcon, SparkIcon } from "@/components/ui/Icons";
import { formatMoney, formatPercent } from "@/lib/utils/format";
import type { Overview } from "@/lib/snaptrade/aggregate";

export function StatCards({ o }: { o: Overview }) {
  const gainTone = o.unrealizedPnl >= 0 ? "positive" : "negative";
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        accent
        label="Net worth"
        icon={<WalletIcon className="h-4 w-4" />}
        value={formatMoney(o.netWorth, o.currency)}
        sub={`${o.accounts.length} account${o.accounts.length === 1 ? "" : "s"}`}
      />
      <StatCard
        label="Invested"
        icon={<ChartIcon className="h-4 w-4" />}
        value={formatMoney(o.invested, o.currency)}
        sub={`${o.holdings.length} holding${o.holdings.length === 1 ? "" : "s"}`}
      />
      <StatCard
        label="Cash"
        icon={<LayersIcon className="h-4 w-4" />}
        value={formatMoney(o.cash, o.currency)}
        sub={`${o.cashPct.toFixed(1)}% of net worth`}
      />
      <StatCard
        label="Unrealized gain"
        icon={<SparkIcon className="h-4 w-4" />}
        value={formatMoney(o.unrealizedPnl, o.currency)}
        sub={`${formatPercent(o.unrealizedPct)} on cost`}
        tone={gainTone}
      />
    </div>
  );
}
