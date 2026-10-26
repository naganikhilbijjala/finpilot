import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountDonut } from "@/components/overview/AccountDonut";
import { AccountHealth } from "@/components/overview/AccountHealth";
import { CashBreakdown } from "@/components/overview/CashBreakdown";
import { CombinedHoldings } from "@/components/overview/CombinedHoldings";
import { Movers } from "@/components/overview/Movers";
import { StatCards } from "@/components/overview/StatCards";
import { Card } from "@/components/ui/Card";
import { buildOverview, type Overview } from "@/lib/snaptrade/aggregate";
import { isSnaptradeConfigured } from "@/lib/snaptrade/client";
import { describeError } from "@/lib/snaptrade/errors";
import { checkOwner } from "@/lib/snaptrade/owner";
import { fetchSnapshot } from "@/lib/snaptrade/snapshot";

// Brokerage data must be fresh per request, never statically rendered.
export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const owner = await checkOwner();
  if (!owner.ok && owner.status === 401) redirect("/login");

  let overview: Overview | null = null;
  let error: string | null = null;

  if (!owner.ok) {
    error = owner.message;
  } else if (!isSnaptradeConfigured()) {
    error =
      "SnapTrade isn't configured. Set SNAPTRADE_CLIENT_ID and SNAPTRADE_CONSUMER_KEY in .env.local and restart the server.";
  } else {
    try {
      overview = buildOverview(await fetchSnapshot());
    } catch (err) {
      console.error("SnapTrade snapshot failed:", describeError(err));
      error = `Could not fetch accounts from SnapTrade. ${describeError(err)}.`;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 space-y-6 text-gray-900">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Overview</h1>
          <div className="flex gap-4 text-sm">
            <Link href="/returns" className="text-primary-600 hover:underline">
              Returns
            </Link>
            <Link href="/accounts" className="text-primary-600 hover:underline">
              Account details
            </Link>
            <Link href="/dashboard" className="text-primary-600 hover:underline">
              ← Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {overview && (
          <>
            <p className="text-sm text-gray-500">
              Retrieved {new Date(overview.fetchedAt).toLocaleString()}. Prices
              may be delayed depending on the brokerage.
            </p>

            {overview.failures.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                {overview.failures.length} account
                {overview.failures.length === 1 ? "" : "s"} couldn&apos;t be
                loaded and {overview.failures.length === 1 ? "is" : "are"} left
                out of these totals:{" "}
                {overview.failures.map((f) => f.accountName).join(", ")}.
              </div>
            )}
            {overview.excludedAccounts.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                Left out of totals because they use a different currency:{" "}
                {overview.excludedAccounts
                  .map((a) => `${a.name} (${a.currency})`)
                  .join(", ")}
                .
              </div>
            )}
            {overview.unpricedCount > 0 && (
              <div className="p-4 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-700">
                {overview.unpricedCount} position
                {overview.unpricedCount === 1 ? "" : "s"} (such as options) have
                no price and aren&apos;t valued here.
              </div>
            )}

            <StatCards o={overview} />

            <div className="grid gap-6 lg:grid-cols-2">
              <Card title="Net worth by account">
                <AccountDonut accounts={overview.accounts} currency={overview.currency} />
              </Card>
              <Card title="Cash vs invested">
                <CashBreakdown o={overview} />
              </Card>
            </div>

            <Card
              title="Holdings across all accounts"
              subtitle="The same ticker is combined across accounts"
            >
              <CombinedHoldings o={overview} />
            </Card>

            <Card title="Gainers and losers" subtitle="Unrealized, since purchase">
              <Movers
                gainers={overview.gainers}
                losers={overview.losers}
                currency={overview.currency}
              />
            </Card>

            <Card title="Account health">
              <AccountHealth o={overview} />
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
