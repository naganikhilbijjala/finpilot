import Link from "next/link";
import { HoldingsTable } from "@/components/portfolio/HoldingsTable";
import { PortfolioPieChart } from "@/components/portfolio/PortfolioPieChart";
import { PortfolioSummary } from "@/components/portfolio/PortfolioSummary";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ChartIcon, PlusIcon, UploadIcon } from "@/components/ui/Icons";
import { Notice } from "@/components/ui/Notice";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { computePortfolioAnalytics } from "@/lib/portfolio/analytics";
import { createClient } from "@/lib/supabase/server";

/**
 * Portfolio built from manually entered or CSV-imported transactions.
 * `quietWhenEmpty` hides the empty state for users who have a brokerage
 * connected, since the rest of the dashboard already has content.
 */
export async function ManualPortfolio({
  userId,
  quietWhenEmpty = false,
}: {
  userId: string;
  quietWhenEmpty?: boolean;
}) {
  let analytics;
  try {
    const supabase = await createClient();
    analytics = await computePortfolioAnalytics(supabase, userId);
  } catch (err) {
    console.error("Portfolio analytics failed:", err);
    return (
      <Notice tone="error">
        {err instanceof Error ? err.message : "Failed to load portfolio data"}
      </Notice>
    );
  }

  if (analytics.holdings.length === 0) {
    if (quietWhenEmpty) return null;
    return (
      <Card>
        <div className="mx-auto max-w-md py-10 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
            <ChartIcon className="h-7 w-7" />
          </span>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">Start tracking your portfolio</h3>
          <p className="mt-1.5 text-sm text-gray-500">
            Add your first stock transaction, or import your history from Fidelity or Robinhood to
            see value, gains and annualized returns.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/portfolio/add">
              <Button>
                <PlusIcon className="h-4 w-4" /> Add a transaction
              </Button>
            </Link>
            <Link href="/portfolio/import">
              <Button variant="outline">
                <UploadIcon className="h-4 w-4" /> Import CSV
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <SectionHeading title="Manual portfolio" />
        <PortfolioSummary analytics={analytics} />
      </div>
      <Card title="Allocation" subtitle="Distribution by current value">
        <PortfolioPieChart holdings={analytics.holdings} />
      </Card>
      <Card
        title="Holdings"
        subtitle={`Last updated ${new Date(analytics.lastUpdated).toLocaleString()}`}
        flush
      >
        <HoldingsTable holdings={analytics.holdings} />
      </Card>
    </div>
  );
}
