import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BreakdownsSkeleton, ExposureBreakdowns } from "@/components/exposure/ExposureBreakdowns";
import { ViewSwitcher } from "@/components/groups/ViewSwitcher";
import { resolvePageView, type ResolvedView } from "@/lib/groups/views";
import { ExposureView } from "@/components/exposure/ExposureView";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { loadExposure, MissingSecAgentError, type LoadedExposure } from "@/lib/exposure/load";
import { isSnaptradeConfigured } from "@/lib/snaptrade/client";
import { describeError } from "@/lib/snaptrade/errors";
import { checkOwner } from "@/lib/snaptrade/owner";

// Brokerage data must be fresh per request, never statically rendered.
export const dynamic = "force-dynamic";

export default async function ExposurePage({ searchParams }: { searchParams: Promise<{ view?: string | string[] }> }) {
  const owner = await checkOwner();
  if (!owner.ok && owner.status === 401) redirect("/login");

  let data: LoadedExposure | null = null;
  let scope: ResolvedView | null = null;
  let error: string | null = null;

  if (!owner.ok) {
    error = owner.message;
  } else if (!isSnaptradeConfigured()) {
    error =
      "SnapTrade isn't configured. Set SNAPTRADE_CLIENT_ID and SNAPTRADE_CONSUMER_KEY in .env.local and restart the server.";
  } else {
    try {
      scope = await resolvePageView((await searchParams).view, "investments");
      data = await loadExposure(scope.include);
    } catch (err) {
      console.error("Exposure load failed:", err);
      error =
        err instanceof MissingSecAgentError
          ? `${err.message}.`
          : `Could not build your exposure. ${describeError(err)}.`;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock exposure"
        actions={scope && <ViewSwitcher views={scope.views} active={scope.view.key} />}
        description="Your real ownership of each company once ETFs and mutual funds are split into what they hold, so NVDA bought directly and NVDA inside VOO or QQQ count together, plus the same view by sector and country."
      />

      {error && <Notice tone="error">{error}</Notice>}

      {data && (
        <>
          {data.failures.length > 0 && (
            <Notice tone="warning">
              Left out because they couldn&apos;t be loaded:{" "}
              {data.failures.map((f) => f.accountName).join(", ")}.
            </Notice>
          )}
          {data.fundErrors.length > 0 && (
            <Notice tone="warning">
              Not split into holdings, so each counts as one position:{" "}
              {data.fundErrors.map((f) => `${f.ticker} (${f.message})`).join("; ")}.
            </Notice>
          )}
          <Notice>
            Fund holdings are quarterly snapshots filed with the SEC up to two months after the
            quarter ends, so weights can drift from today&apos;s. Share classes such as GOOGL and
            GOOG are combined.
          </Notice>
          <ExposureView
            exposure={data.exposure}
            currency={data.currency}
            breakdowns={
              <Suspense fallback={<BreakdownsSkeleton />}>
                <ExposureBreakdowns exposure={data.exposure} currency={data.currency} />
              </Suspense>
            }
          />
        </>
      )}
    </div>
  );
}
