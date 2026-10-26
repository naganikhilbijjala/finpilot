import { redirect } from "next/navigation";
import { AccountReturns } from "@/components/returns/AccountReturns";
import { TickerReturns } from "@/components/returns/TickerReturns";
import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { ChartIcon, PercentIcon, SparkIcon, WalletIcon } from "@/components/ui/Icons";
import { formatMoney, formatPercent } from "@/lib/utils/format";
import { loadReturns, type LoadedReturns } from "@/lib/returns/load";
import { isSnaptradeConfigured } from "@/lib/snaptrade/client";
import { describeError } from "@/lib/snaptrade/errors";
import { checkOwner } from "@/lib/snaptrade/owner";

// Brokerage data must be fresh per request, never statically rendered.
export const dynamic = "force-dynamic";

export default async function ReturnsPage() {
  const owner = await checkOwner();
  if (!owner.ok && owner.status === 401) redirect("/login");

  let loaded: LoadedReturns | null = null;
  let error: string | null = null;

  if (!owner.ok) {
    error = owner.message;
  } else if (!isSnaptradeConfigured()) {
    error =
      "SnapTrade isn't configured. Set SNAPTRADE_CLIENT_ID and SNAPTRADE_CONSUMER_KEY in .env.local and restart the server.";
  } else {
    try {
      loaded = await loadReturns();
    } catch (err) {
      console.error("Returns load failed:", describeError(err));
      error = `Could not load returns from SnapTrade. ${describeError(err)}.`;
    }
  }

  const result = loaded?.result;
  const hasGap = result?.open.some((t) => Math.abs(t.unreconciledUnits) > 1e-4);

  const p = result?.portfolio;
  const gainTone = p?.gain == null ? "neutral" : p.gain >= 0 ? "positive" : "negative";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Returns"
        description={
          <>
            <span className="font-medium text-gray-700">Annualized</span> is XIRR, a money-weighted
            rate that accounts for when you added and removed money. It equals CAGR when there is a
            single purchase.
            {result && <> Calculated {new Date(result.asOf).toLocaleString()}.</>}
          </>
        }
      />

      {error && <Notice tone="error">{error}</Notice>}

      {loaded && result && p && (
        <>
          {loaded.failures.length > 0 && (
            <Notice tone="warning">
              Left out of every figure below because their data couldn&apos;t be loaded:{" "}
              {loaded.failures.map((f) => `${f.accountName} (${f.message})`).join("; ")}.
            </Notice>
          )}
          {hasGap && (
            <Notice tone="warning">
              Rows marked <span className="font-medium">units differ</span> hold a different share
              count than the recorded purchases add up to. That is usually a stock split, and the
              return is still correct because it values what you hold. If those shares arrived
              without a purchase, the return is overstated.
            </Notice>
          )}

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              accent
              label="Portfolio value"
              icon={<WalletIcon className="h-4 w-4" />}
              value={formatMoney(p.value, "USD")}
              sub={`${formatMoney(p.contributed - p.withdrawn, "USD")} net deposited`}
            />
            <StatCard
              label="Total gain"
              icon={<SparkIcon className="h-4 w-4" />}
              value={formatMoney(p.gain, "USD")}
              sub={
                p.gain !== null && p.contributed > 0
                  ? `${formatPercent((p.gain / p.contributed) * 100)} on deposits`
                  : undefined
              }
              tone={gainTone}
            />
            <StatCard
              label="Annualized (XIRR)"
              icon={<PercentIcon className="h-4 w-4" />}
              value={p.xirr === null ? "—" : formatPercent(p.xirr * 100)}
              tone={p.xirr === null ? "neutral" : p.xirr >= 0 ? "positive" : "negative"}
              sub={p.shortHistory ? "Under a year of history" : "Money-weighted"}
            />
            <StatCard
              label="Dividends & interest"
              icon={<ChartIcon className="h-4 w-4" />}
              value={formatMoney(p.dividends + p.interest, "USD")}
              sub="Already included in gain"
            />
          </div>

          <Card
            title="By account"
            subtitle="Based on deposits and withdrawals plus current value. Dividends and interest are already part of Gain; they're broken out for reference."
            flush
          >
            <AccountReturns portfolio={result.portfolio} accounts={result.accounts} />
          </Card>

          <Card
            title="By ticker"
            subtitle="Buys, sells, dividends and reinvestments, pooled across accounts. Click a ticker for the account split."
            flush
          >
            <TickerReturns items={result.open} />
          </Card>

          <Card
            title="Closed positions"
            subtitle="Fully sold; gains are realized. Gain is the total profit in dollars (sale proceeds + dividends - purchases), not per share."
            flush
          >
            <TickerReturns items={result.closed} variant="closed" />
          </Card>
        </>
      )}
    </div>
  );
}
