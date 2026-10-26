import { CsvImport } from "@/components/portfolio/CsvImport";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Import from broker"
        description="Upload an activity CSV and we'll add your purchases for you."
      />

      <Card>
        <CsvImport />
      </Card>

      <div className="rounded-2xl border border-primary-100 bg-primary-50/60 p-5">
        <h3 className="mb-2 text-sm font-semibold text-primary-900">How to export</h3>
        <ul className="list-inside list-disc space-y-1 text-sm text-primary-800">
          <li>
            <span className="font-medium">Fidelity:</span> Activity & Orders → History → pick a date
            range → Download
          </li>
          <li>
            <span className="font-medium">Robinhood:</span> Account → Reports and statements →
            generate an activity report (CSV)
          </li>
          <li>
            Only buys and dividend reinvestments are imported for now; sells, dividends and
            transfers are skipped
          </li>
          <li>Re-importing the same file won&apos;t create duplicates</li>
        </ul>
      </div>
    </div>
  );
}
