"use client";

import { formatXIRR } from "@/lib/utils/xirr";
import { Card } from "@/components/ui/Card";
import type { PortfolioAnalytics } from "@/lib/types";

interface PortfolioSummaryProps {
  analytics: PortfolioAnalytics;
}

export function PortfolioSummary({ analytics }: PortfolioSummaryProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  const isPositive = analytics.totalAbsoluteGain >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Value */}
      <Card>
        <div>
          <p className="text-sm font-medium text-gray-600">Total Value</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatCurrency(analytics.totalCurrentValue)}
          </p>
        </div>
      </Card>

      {/* Total Invested */}
      <Card>
        <div>
          <p className="text-sm font-medium text-gray-600">Total Invested</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatCurrency(analytics.totalInvested)}
          </p>
        </div>
      </Card>

      {/* Total Gain/Loss */}
      <Card>
        <div>
          <p className="text-sm font-medium text-gray-600">Total Gain/Loss</p>
          <p
            className={`text-2xl font-bold mt-1 ${
              isPositive ? "text-green-600" : "text-red-600"
            }`}
          >
            {formatCurrency(analytics.totalAbsoluteGain)}
          </p>
          <p
            className={`text-sm mt-1 ${
              isPositive ? "text-green-600" : "text-red-600"
            }`}
          >
            {formatPercentage(analytics.totalPercentageGain)}
          </p>
        </div>
      </Card>

      {/* Overall XIRR */}
      <Card>
        <div>
          <p className="text-sm font-medium text-gray-600">Overall XIRR</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatXIRR(analytics.overallXIRR)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Annualized Return</p>
        </div>
      </Card>
    </div>
  );
}
