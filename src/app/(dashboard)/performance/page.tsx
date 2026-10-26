import Link from "next/link";
import { redirect } from "next/navigation";
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 space-y-6 text-gray-900">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Performance</h1>
          <div className="flex gap-4 text-sm">
            <Link href="/returns" className="text-primary-600 hover:underline">
              Returns
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

        {data && (
          <>
            <p className="text-sm text-gray-600">
              Returns are <span className="font-medium text-gray-900">time-weighted</span>, so when you
              deposited doesn&apos;t help or hurt them, which makes them comparable to an index. Benchmarks
              include reinvested dividends (SPY, QQQ and VTI total return). Account values are rebuilt from
              your transactions and Yahoo Finance prices, before taxes.
            </p>

            {data.failures.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                Left out because their data couldn&apos;t be loaded:{" "}
                {data.failures.map((f) => `${f.accountName} (${f.message})`).join("; ")}.
              </div>
            )}

            <PerformanceExplorer data={data} />
          </>
        )}
      </div>
    </div>
  );
}
