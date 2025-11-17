import { TransactionForm } from "@/components/portfolio/TransactionForm";
import { Card } from "@/components/ui/Card";

export default function AddTransactionPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Add Stock Transaction
        </h1>

        <Card>
          <TransactionForm />
        </Card>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Tips:</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Enter the exact ticker symbol as traded on the stock exchange</li>
            <li>Quantity can include fractional shares (e.g., 1.5 shares)</li>
            <li>Purchase price should be per share, not total cost</li>
            <li>Select the date and time when you made the purchase</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
