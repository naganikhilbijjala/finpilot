import { redirect } from "next/navigation";
import { FilingsFeed } from "@/components/filings/FilingsFeed";
import { ViewSwitcher } from "@/components/groups/ViewSwitcher";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { MissingSecAgentError } from "@/lib/exposure/load";
import { resolvePageView, type ResolvedView } from "@/lib/groups/views";
import { loadFeed, type LoadedFeed } from "@/lib/sec/loadFeed";
import { isSnaptradeConfigured } from "@/lib/snaptrade/client";
import { describeError } from "@/lib/snaptrade/errors";
import { checkOwner } from "@/lib/snaptrade/owner";

export const dynamic = "force-dynamic";

const DAYS = 120;

export default async function FilingsPage({ searchParams }: { searchParams: Promise<{ view?: string | string[] }> }) {
  const owner = await checkOwner();
  if (!owner.ok && owner.status === 401) redirect("/login");

  let data: LoadedFeed | null = null;
  let scope: ResolvedView | null = null;
  let error: string | null = null;

  if (!owner.ok) {
    error = owner.message;
  } else if (!isSnaptradeConfigured()) {
    error = "SnapTrade isn't configured. Set SNAPTRADE_CLIENT_ID and SNAPTRADE_CONSUMER_KEY and restart the server.";
  } else {
    try {
      scope = await resolvePageView((await searchParams).view, "investments");
      data = await loadFeed(scope.include, DAYS);
    } catch (err) {
      console.error("Filings feed failed:", err);
      error =
        err instanceof MissingSecAgentError ? `${err.message}.` : `Could not load filings. ${describeError(err)}.`;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company filings"
        actions={scope && <ViewSwitcher views={scope.views} active={scope.view.key} />}
        description={`What the companies you own told the SEC in the last ${DAYS} days: earnings, annual and quarterly reports, executive changes, deals and red flags. Covers every stock you hold directly plus the largest ones inside your funds.`}
      />
      {error && <Notice tone="error">{error}</Notice>}
      {data && (
        <>
          {data.failures.length > 0 && (
            <Notice tone="warning">
              Left out because they couldn&apos;t be loaded: {data.failures.map((f) => f.accountName).join(", ")}.
            </Notice>
          )}
          {data.missing.length > 0 && (
            <Notice tone="warning">
              Couldn&apos;t load filings for {data.missing.map((m) => m.ticker ?? m.name).join(", ")}. They&apos;ll be
              retried on the next visit.
            </Notice>
          )}
          <Notice>
            <span className="font-medium text-rose-700">Red</span> marks filings that usually matter most: restatements,
            auditor changes, bankruptcy, delisting notices, write-downs, takeovers and activist stakes. Links open the
            original filing on sec.gov.
          </Notice>
          <FilingsFeed items={data.items} followed={data.followed} />
        </>
      )}
    </div>
  );
}
