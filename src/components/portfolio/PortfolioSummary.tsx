"use client";

import { formatXIRR } from "@/lib/utils/xirr";
import { StatCard } from "@/components/ui/StatCard";
import { ChartIcon, PercentIcon, SparkIcon, WalletIcon } from "@/components/ui/Icons";
import type { PortfolioAnalytics } from "@/lib/types";

interface PortfolioSummaryProps {
  analytics: PortfolioAnalytics;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

const formatPercentage = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

export function PortfolioSummary({ analytics }: PortfolioSummaryProps) {
  const tone = analytics.totalAbsoluteGain >= 0 ? "positive" : "negative";

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        accent
        label="Total value"
        icon={<WalletIcon className="h-4 w-4" />}
        value={formatCurrency(analytics.totalCurrentValue)}
        sub="Current market value"
      />
      <StatCard
        label="Total invested"
        icon={<ChartIcon className="h-4 w-4" />}
        value={formatCurrency(analytics.totalInvested)}
        sub="Cost basis"
      />
      <StatCard
        label="Total gain / loss"
        icon={<SparkIcon className="h-4 w-4" />}
        value={formatCurrency(analytics.totalAbsoluteGain)}
        sub={formatPercentage(analytics.totalPercentageGain)}
        tone={tone}
      />
      <StatCard
        label="Overall XIRR"
        icon={<PercentIcon className="h-4 w-4" />}
        value={formatXIRR(analytics.overallXIRR)}
        sub="Annualized return"
      />
    </div>
  );
}
