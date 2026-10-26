import { TransactionForm } from "@/components/portfolio/TransactionForm";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

export default function AddTransactionPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Add transaction"
        description="Record a stock purchase to track its value, gain and annualized return."
      />

      <Card>
        <TransactionForm />
      </Card>

      <div className="rounded-2xl border border-primary-100 bg-primary-50/60 p-5">
        <h3 className="mb-2 text-sm font-semibold text-primary-900">Tips</h3>
        <ul className="list-inside list-disc space-y-1 text-sm text-primary-800">
          <li>Enter the exact ticker symbol as traded on the stock exchange</li>
          <li>Quantity can include fractional shares (e.g., 1.5 shares)</li>
          <li>Purchase price should be per share, not total cost</li>
          <li>Select the date and time when you made the purchase</li>
        </ul>
      </div>
    </div>
  );
}
