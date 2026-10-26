import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountReturns } from "@/components/returns/AccountReturns";
import { TickerReturns } from "@/components/returns/TickerReturns";
import { Card } from "@/components/ui/Card";
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 space-y-6 text-gray-900">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Returns</h1>
          <div className="flex gap-4 text-sm">
            <Link href="/performance" className="text-primary-600 hover:underline">
              Performance
            </Link>
            <Link href="/overview" className="text-primary-600 hover:underline">
              Overview
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

        {loaded && result && (
          <>
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">Annualized</span> is XIRR, a
              money-weighted rate that accounts for when you added and removed money. It
              equals CAGR when there is a single purchase. Calculated{" "}
              {new Date(result.asOf).toLocaleString()}.
            </p>

            {loaded.failures.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                Left out of every figure below because their data couldn&apos;t be
                loaded:{" "}
                {loaded.failures.map((f) => `${f.accountName} (${f.message})`).join("; ")}.
              </div>
            )}
            {hasGap && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                Rows marked <span className="font-medium">units differ</span> hold a
                different share count than the recorded purchases add up to. That is
                usually a stock split, and the return is still correct because it values
                what you hold. If those shares arrived without a purchase, the return is
                overstated.
              </div>
            )}

            <Card
              title="By account"
              subtitle="Based on deposits and withdrawals plus current value. Dividends and interest are already part of Gain; they're broken out for reference."
            >
              <AccountReturns portfolio={result.portfolio} accounts={result.accounts} />
            </Card>

            <Card
              title="By ticker"
              subtitle="Buys, sells, dividends and reinvestments, pooled across accounts. Click a ticker for the account split."
            >
              <TickerReturns items={result.open} />
            </Card>

            <Card
              title="Closed positions"
              subtitle="Fully sold; gains are realized. Gain is the total profit in dollars (sale proceeds + dividends - purchases), not per share."
            >
              <TickerReturns items={result.closed} variant="closed" />
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
