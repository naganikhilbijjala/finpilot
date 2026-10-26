import { CsvImport } from "@/components/portfolio/CsvImport";
import { Card } from "@/components/ui/Card";

export default function ImportPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Import from Broker
        </h1>

        <Card>
          <CsvImport />
        </Card>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">How to export:</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>
              <span className="font-medium">Fidelity:</span> Activity & Orders →
              History → pick a date range → Download
            </li>
            <li>
              <span className="font-medium">Robinhood:</span> Account → Reports
              and statements → generate an activity report (CSV)
            </li>
            <li>
              Only buys and dividend reinvestments are imported for now; sells,
              dividends and transfers are skipped
            </li>
            <li>Re-importing the same file won&apos;t create duplicates</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
