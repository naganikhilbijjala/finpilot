import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PortfolioSummary } from "@/components/portfolio/PortfolioSummary";
import { HoldingsTable } from "@/components/portfolio/HoldingsTable";
import { PortfolioPieChart } from "@/components/portfolio/PortfolioPieChart";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { PortfolioAnalytics } from "@/lib/types";

async function getPortfolioAnalytics(): Promise<PortfolioAnalytics> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/portfolio/analytics`,
    {
      cache: "no-store",
      headers: {
        Cookie: cookieStore.toString(),
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch portfolio analytics");
  }

  return response.json();
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let analytics: PortfolioAnalytics;
  let error: string | null = null;

  try {
    analytics = await getPortfolioAnalytics();
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load portfolio data";
    analytics = {
      holdings: [],
      totalInvested: 0,
      totalCurrentValue: 0,
      totalAbsoluteGain: 0,
      totalPercentageGain: 0,
      overallXIRR: null,
      lastUpdated: new Date().toISOString(),
    };
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">FinScope</h1>
              <p className="text-sm text-gray-600">Welcome, {user.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/portfolio/add">
                <Button>Add Transaction</Button>
              </Link>
              <form
                action={async () => {
                  "use server";
                  const supabase = await createClient();
                  await supabase.auth.signOut();
                  redirect("/login");
                }}
              >
                <Button type="submit" variant="outline">
                  Sign Out
                </Button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Portfolio Summary Cards */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Portfolio Overview
              </h2>
              <PortfolioSummary analytics={analytics} />
            </div>

            {analytics.holdings.length > 0 ? (
              <>
                {/* Pie Chart */}
                <Card title="Portfolio Allocation" subtitle="Distribution by current value">
                  <PortfolioPieChart holdings={analytics.holdings} />
                </Card>

                {/* Holdings Table */}
                <Card
                  title="Holdings"
                  subtitle={`Last updated: ${new Date(
                    analytics.lastUpdated
                  ).toLocaleString()}`}
                >
                  <HoldingsTable holdings={analytics.holdings} />
                </Card>
              </>
            ) : (
              <Card>
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  <h3 className="mt-2 text-lg font-medium text-gray-900">
                    No portfolio data
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by adding your first stock transaction
                  </p>
                  <div className="mt-6">
                    <Link href="/portfolio/add">
                      <Button>Add Your First Transaction</Button>
                    </Link>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
