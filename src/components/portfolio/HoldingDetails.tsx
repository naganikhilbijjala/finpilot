"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PortfolioTransaction } from "@/lib/types";
import { EditTransactionModal } from "./EditTransactionModal";
import { DeleteConfirmModal } from "./DeleteConfirmModal";

interface HoldingDetailsProps {
  transactions: PortfolioTransaction[];
  currentPrice: number;
}

export function HoldingDetails({ transactions, currentPrice }: HoldingDetailsProps) {
  const router = useRouter();
  const [editingTransaction, setEditingTransaction] = useState<PortfolioTransaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<{ id: string; ticker: string } | null>(null);

  const handleSuccess = () => {
    router.refresh();
  };
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Sort transactions by date (most recent first)
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.purchased_at).getTime() - new Date(a.purchased_at).getTime()
  );

  return (
    <div className="bg-gray-50 px-6 py-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        Transaction History ({transactions.length} transaction{transactions.length !== 1 ? "s" : ""})
      </h3>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Purchase Date
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Purchase Price
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Cost
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Current Value
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Gain/Loss
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedTransactions.map((transaction) => {
              const totalCost = transaction.quantity * transaction.price;
              const currentValue = transaction.quantity * currentPrice;
              const gainLoss = currentValue - totalCost;
              const gainLossPercentage = ((gainLoss / totalCost) * 100);
              const isPositive = gainLoss >= 0;

              return (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(transaction.purchased_at)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                    {transaction.quantity.toFixed(4)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                    {formatCurrency(transaction.price)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                    {formatCurrency(totalCost)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                    {formatCurrency(currentValue)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                    <div
                      className={`font-medium ${
                        isPositive ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(gainLoss)}
                    </div>
                    <div
                      className={`text-xs ${
                        isPositive ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {isPositive ? "+" : ""}{gainLossPercentage.toFixed(2)}%
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTransaction(transaction);
                        }}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="Edit transaction"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingTransaction({
                            id: transaction.id,
                            ticker: transaction.ticker,
                          });
                        }}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        title="Delete transaction"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Statistics */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-3 rounded-lg shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Total Transactions</p>
          <p className="text-lg font-semibold text-gray-900">{transactions.length}</p>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Total Shares</p>
          <p className="text-lg font-semibold text-gray-900">
            {transactions.reduce((sum, t) => sum + t.quantity, 0).toFixed(4)}
          </p>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Total Invested</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(transactions.reduce((sum, t) => sum + (t.quantity * t.price), 0))}
          </p>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-sm">
          <p className="text-xs text-gray-500 mb-1">First Purchase</p>
          <p className="text-sm font-semibold text-gray-900">
            {new Date(
              Math.min(...transactions.map(t => new Date(t.purchased_at).getTime()))
            ).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
          </p>
        </div>
      </div>

      {/* Modals */}
      {editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          isOpen={!!editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSuccess={handleSuccess}
        />
      )}

      {deletingTransaction && (
        <DeleteConfirmModal
          isOpen={!!deletingTransaction}
          transactionId={deletingTransaction.id}
          ticker={deletingTransaction.ticker}
          onClose={() => setDeletingTransaction(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
