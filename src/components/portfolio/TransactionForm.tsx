"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { TransactionFormData } from "@/lib/types";

export function TransactionForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<TransactionFormData>({
    ticker: "",
    quantity: 0,
    price: 0,
    purchased_at: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/portfolio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add transaction");
      }

      // Success - redirect to dashboard
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "ticker" ? value.toUpperCase() : value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Ticker Symbol"
        type="text"
        name="ticker"
        value={formData.ticker}
        onChange={handleChange}
        placeholder="e.g., AAPL, GOOGL, MSFT"
        required
        helperText="Enter the stock ticker symbol"
      />

      <Input
        label="Quantity"
        type="number"
        name="quantity"
        value={formData.quantity || ""}
        onChange={handleChange}
        placeholder="0"
        step="0.00000001"
        min="0.00000001"
        required
        helperText="Number of shares purchased"
      />

      <Input
        label="Purchase Price"
        type="number"
        name="price"
        value={formData.price || ""}
        onChange={handleChange}
        placeholder="0.00"
        step="0.01"
        min="0.01"
        required
        helperText="Price per share in USD"
      />

      <Input
        label="Purchase Date"
        type="date"
        name="purchased_at"
        value={formData.purchased_at}
        onChange={handleChange}
        required
        helperText="When did you purchase this stock?"
      />

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" loading={loading} className="flex-1">
          Add Transaction
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
