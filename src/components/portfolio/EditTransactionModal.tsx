"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { PortfolioTransaction } from "@/lib/types";

interface EditTransactionModalProps {
  transaction: PortfolioTransaction;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditTransactionModal({
  transaction,
  isOpen,
  onClose,
  onSuccess,
}: EditTransactionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    ticker: transaction.ticker,
    quantity: transaction.quantity,
    price: transaction.price,
    purchased_at: new Date(transaction.purchased_at).toISOString().slice(0, 10),
  });

  // Reset form when transaction changes
  useEffect(() => {
    setFormData({
      ticker: transaction.ticker,
      quantity: transaction.quantity,
      price: transaction.price,
      purchased_at: new Date(transaction.purchased_at).toISOString().slice(0, 10),
    });
    setError("");
  }, [transaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`/api/portfolio?id=${transaction.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update transaction");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "ticker" ? value.toUpperCase() : value,
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Edit Transaction
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Ticker Symbol"
              type="text"
              name="ticker"
              value={formData.ticker}
              onChange={handleChange}
              required
            />

            <Input
              label="Quantity"
              type="number"
              name="quantity"
              value={formData.quantity || ""}
              onChange={handleChange}
              step="0.00000001"
              min="0.00000001"
              required
            />

            <Input
              label="Purchase Price"
              type="number"
              name="price"
              value={formData.price || ""}
              onChange={handleChange}
              step="0.01"
              min="0.01"
              required
            />

            <Input
              label="Purchase Date"
              type="date"
              name="purchased_at"
              value={formData.purchased_at}
              onChange={handleChange}
              required
            />

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={loading} className="flex-1">
                Save Changes
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
