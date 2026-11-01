import { redirect } from "next/navigation";
import { ViewSwitcher } from "@/components/groups/ViewSwitcher";
import { resolvePageView, type ResolvedView } from "@/lib/groups/views";
import { AccountDonut } from "@/components/overview/AccountDonut";
import { AccountHealth } from "@/components/overview/AccountHealth";
import { CashBreakdown } from "@/components/overview/CashBreakdown";
import { CombinedHoldings } from "@/components/overview/CombinedHoldings";
import { Movers } from "@/components/overview/Movers";
import { StatCards } from "@/components/overview/StatCards";
import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { buildOverview, type Overview } from "@/lib/snaptrade/aggregate";
import { isSnaptradeConfigured } from "@/lib/snaptrade/client";
import { describeError } from "@/lib/snaptrade/errors";
import { checkOwner } from "@/lib/snaptrade/owner";
import { filterSnapshot } from "@/lib/groups/groups";
import { fetchSnapshot } from "@/lib/snaptrade/snapshot";

// Brokerage data must be fresh per request, never statically rendered.
export const dynamic = "force-dynamic";

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ view?: string | string[] }> }) {
  const owner = await checkOwner();
  if (!owner.ok && owner.status === 401) redirect("/login");

  let overview: Overview | null = null;
  let scope: ResolvedView | null = null;
  let error: string | null = null;

  if (!owner.ok) {
    error = owner.message;
  } else if (!isSnaptradeConfigured()) {
    error =
      "SnapTrade isn't configured. Set SNAPTRADE_CLIENT_ID and SNAPTRADE_CONSUMER_KEY in .env.local and restart the server.";
  } else {
    try {
      scope = await resolvePageView((await searchParams).view, "mine");
      overview = buildOverview(filterSnapshot(await fetchSnapshot(), scope.include));
    } catch (err) {
      console.error("SnapTrade snapshot failed:", describeError(err));
      error = `Could not fetch accounts from SnapTrade. ${describeError(err)}.`;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        actions={scope && <ViewSwitcher views={scope.views} active={scope.view.key} />}
        description={
          overview
            ? `Retrieved ${new Date(overview.fetchedAt).toLocaleString()}. Prices may be delayed depending on the brokerage.`
            : "Everything you own across your brokerage accounts."
        }
      />

      {error && <Notice tone="error">{error}</Notice>}

      {overview && (
        <>
          {overview.failures.length > 0 && (
            <Notice tone="warning">
              {overview.failures.length} account
              {overview.failures.length === 1 ? "" : "s"} couldn&apos;t be loaded and{" "}
              {overview.failures.length === 1 ? "is" : "are"} left out of these totals:{" "}
              {overview.failures.map((f) => f.accountName).join(", ")}.
            </Notice>
          )}
          {overview.excludedAccounts.length > 0 && (
            <Notice tone="warning">
              Left out of totals because they use a different currency:{" "}
              {overview.excludedAccounts.map((a) => `${a.name} (${a.currency})`).join(", ")}.
            </Notice>
          )}
          {overview.unpricedCount > 0 && (
            <Notice>
              {overview.unpricedCount} position{overview.unpricedCount === 1 ? "" : "s"} (such as
              options) have no price and aren&apos;t valued here.
            </Notice>
          )}

          <StatCards
            o={overview}
            valueLabel={
              // "My investments" is your whole net worth only when there's no emergency fund group.
              scope?.view.kind === "mine" ||
              (scope?.view.kind === "investments" && !scope.views.some((v) => v.kind === "mine"))
                ? "Net worth"
                : "Total value"
            }
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Net worth by account" subtitle="Hover a slice to see its share">
              <AccountDonut accounts={overview.accounts} currency={overview.currency} />
            </Card>
            <Card title="Cash vs invested">
              <CashBreakdown o={overview} />
            </Card>
          </div>

          <Card
            title="Holdings across all accounts"
            subtitle="The same ticker is combined across accounts"
            flush
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

          <Card title="Account health" subtitle="Connection and sync status per account">
            <AccountHealth o={overview} />
          </Card>
        </>
      )}
    </div>
  );
}
