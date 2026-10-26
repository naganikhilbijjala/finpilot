import { redirect } from "next/navigation";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { PerformanceExplorer } from "@/components/performance/PerformanceExplorer";
import { loadPerformance, type PerformanceData } from "@/lib/returns/loadPerformance";
import { isSnaptradeConfigured } from "@/lib/snaptrade/client";
import { describeError } from "@/lib/snaptrade/errors";
import { checkOwner } from "@/lib/snaptrade/owner";

// Brokerage data must be fresh per request, never statically rendered.
export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  const owner = await checkOwner();
  if (!owner.ok && owner.status === 401) redirect("/login");

  let data: PerformanceData | null = null;
  let error: string | null = null;

  if (!owner.ok) {
    error = owner.message;
  } else if (!isSnaptradeConfigured()) {
    error =
      "SnapTrade isn't configured. Set SNAPTRADE_CLIENT_ID and SNAPTRADE_CONSUMER_KEY in .env.local and restart the server.";
  } else {
    try {
      data = await loadPerformance();
    } catch (err) {
      console.error("Performance load failed:", describeError(err));
      error = `Could not build performance. ${
        err instanceof Error && !/status code|RESPONSE HEADERS/.test(err.message)
          ? err.message
          : describeError(err)
      }.`;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance"
        description={
          <>
            Returns are <span className="font-medium text-gray-700">time-weighted</span>, so when you
            deposited doesn&apos;t help or hurt them, which makes them comparable to an index.
            Benchmarks include reinvested dividends (SPY, QQQ and VTI total return). Account values
            are rebuilt from your transactions and Yahoo Finance prices, before taxes.
          </>
        }
      />

      {error && <Notice tone="error">{error}</Notice>}

      {data && (
        <>
          {data.failures.length > 0 && (
            <Notice tone="warning">
              Left out because their data couldn&apos;t be loaded:{" "}
              {data.failures.map((f) => `${f.accountName} (${f.message})`).join("; ")}.
            </Notice>
          )}

          <PerformanceExplorer data={data} />
        </>
      )}
    </div>
  );
}
