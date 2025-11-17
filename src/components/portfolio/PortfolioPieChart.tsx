"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import type { PortfolioHolding, PieChartData } from "@/lib/types";

interface PortfolioPieChartProps {
  holdings: PortfolioHolding[];
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
  "#FFC658",
  "#FF6B9D",
  "#8DD1E1",
  "#D084D0",
];

export function PortfolioPieChart({ holdings }: PortfolioPieChartProps) {
  if (holdings.length === 0) {
    return (
      <div className="flex items-center justify-center h-80">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  // Calculate total value
  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);

  // Prepare chart data
  const chartData: PieChartData[] = holdings.map((holding, index) => ({
    name: holding.ticker,
    value: holding.currentValue,
    percentage: (holding.currentValue / totalValue) * 100,
    color: COLORS[index % COLORS.length],
  }));

  // Custom label renderer
  const renderLabel = (entry: PieChartData) => {
    return `${entry.name} (${entry.percentage.toFixed(1)}%)`;
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as PieChartData;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-md">
          <p className="font-semibold text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            Value: ${data.value.toFixed(2)}
          </p>
          <p className="text-sm text-gray-600">
            Allocation: {data.percentage.toFixed(2)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
