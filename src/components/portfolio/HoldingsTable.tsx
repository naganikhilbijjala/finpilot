"use client";

import { useState } from "react";
import { formatXIRR } from "@/lib/utils/xirr";
import { formatCAGR } from "@/lib/utils/cagr";
import type { PortfolioHolding } from "@/lib/types";
import { HoldingDetails } from "./HoldingDetails";

interface HoldingsTableProps {
  holdings: PortfolioHolding[];
}

export function HoldingsTable({ holdings }: HoldingsTableProps) {
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);

  const toggleExpanded = (ticker: string) => {
    setExpandedTicker(expandedTicker === ticker ? null : ticker);
  };
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  if (holdings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No holdings yet. Add your first transaction to get started!</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ticker
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Quantity
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Avg Price
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Current Price
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Invested
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Current Value
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Gain/Loss
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Return
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {holdings.map((holding) => {
            const isPositive = holding.absoluteGain >= 0;
            const returnMetric = holding.xirr !== null
              ? formatXIRR(holding.xirr)
              : holding.cagr !== null
              ? formatCAGR(holding.cagr)
              : "N/A";
            const isExpanded = expandedTicker === holding.ticker;

            return (
              <>
                <tr
                  key={holding.ticker}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => toggleExpanded(holding.ticker)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {holding.ticker}
                        </div>
                        <div className="text-xs text-gray-500">
                          {holding.transactions.length} transaction(s)
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {holding.totalQuantity.toFixed(4)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {formatCurrency(holding.averagePrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {formatCurrency(holding.currentPrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {formatCurrency(holding.totalInvested)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                    {formatCurrency(holding.currentValue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div
                      className={`font-medium ${
                        isPositive ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(holding.absoluteGain)}
                    </div>
                    <div
                      className={`text-xs ${
                        isPositive ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatPercentage(holding.percentageGain)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                    {returnMetric}
                  </td>
                </tr>
                {isExpanded && (
                  <tr key={`${holding.ticker}-details`}>
                    <td colSpan={8} className="p-0">
                      <HoldingDetails
                        transactions={holding.transactions}
                        currentPrice={holding.currentPrice}
                      />
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
