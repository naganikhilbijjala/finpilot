import { AccountDonut } from "@/components/overview/AccountDonut";
import { Movers } from "@/components/overview/Movers";
import { StatCards } from "@/components/overview/StatCards";
import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { buildOverview } from "@/lib/snaptrade/aggregate";
import { isSnaptradeConfigured } from "@/lib/snaptrade/client";
import { describeError } from "@/lib/snaptrade/errors";
import { fetchSnapshot } from "@/lib/snaptrade/snapshot";

/** Net worth, allocation and movers: the at-a-glance half of the Overview page. */
export async function BrokerageOverview() {
  if (!isSnaptradeConfigured()) {
    return (
      <Notice tone="warning">
        SnapTrade isn&apos;t configured. Set SNAPTRADE_CLIENT_ID and SNAPTRADE_CONSUMER_KEY in
        .env.local and restart the server.
      </Notice>
    );
  }

  let overview;
  try {
    overview = buildOverview(await fetchSnapshot());
  } catch (err) {
    console.error("SnapTrade snapshot failed:", describeError(err));
    return (
      <Notice tone="error">
        Could not fetch accounts from SnapTrade. {describeError(err)}.
      </Notice>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <SectionHeading title="Brokerage overview" href="/overview" linkLabel="Full overview" />
        <StatCards o={overview} />
      </div>

      {overview.failures.length > 0 && (
        <Notice tone="warning">
          {overview.failures.length} account{overview.failures.length === 1 ? "" : "s"} couldn&apos;t
          be loaded and {overview.failures.length === 1 ? "is" : "are"} left out of these totals:{" "}
          {overview.failures.map((f) => f.accountName).join(", ")}.
        </Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Net worth by account" subtitle="Hover a slice to see its share">
          <AccountDonut accounts={overview.accounts} currency={overview.currency} />
        </Card>
        <Card title="Gainers and losers" subtitle="Unrealized, since purchase">
          <Movers
            gainers={overview.gainers.slice(0, 3)}
            losers={overview.losers.slice(0, 3)}
            currency={overview.currency}
          />
        </Card>
      </div>
    </div>
  );
}
