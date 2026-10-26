import { redirect } from "next/navigation";
import { AccountCard } from "@/components/accounts/AccountCard";
import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { isSnaptradeConfigured } from "@/lib/snaptrade/client";
import { checkOwner } from "@/lib/snaptrade/owner";
import { describeError } from "@/lib/snaptrade/errors";
import { fetchSnapshot } from "@/lib/snaptrade/snapshot";
import type { SnapshotResult } from "@/lib/snaptrade/types";

// Brokerage data must be fresh per request, never statically rendered.
export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const owner = await checkOwner();
  if (!owner.ok && owner.status === 401) redirect("/login");

  let snapshot: SnapshotResult | null = null;
  let error: string | null = null;

  if (!owner.ok) {
    error = owner.message;
  } else if (!isSnaptradeConfigured()) {
    error =
      "SnapTrade isn't configured. Set SNAPTRADE_CLIENT_ID and SNAPTRADE_CONSUMER_KEY in .env.local and restart the server.";
  } else {
    try {
      snapshot = await fetchSnapshot();
    } catch (err) {
      console.error("SnapTrade snapshot failed:", describeError(err));
      error = `Could not fetch accounts from SnapTrade. ${describeError(err)}.`;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Brokerage accounts"
        description={
          snapshot
            ? `Retrieved ${new Date(snapshot.fetchedAt).toLocaleString()}. Prices may be delayed depending on the brokerage.`
            : "Positions in each connected account."
        }
      />

      {error && <Notice tone="error">{error}</Notice>}

      {snapshot && (
        <>
          {snapshot.failures.map((f) => (
            <Notice key={f.accountId} tone="warning">
              Couldn&apos;t load <span className="font-medium">{f.accountName}</span>: {f.message}
            </Notice>
          ))}

          {snapshot.accounts.length === 0 && snapshot.failures.length === 0 ? (
            <Card>
              <p className="text-sm text-gray-600">
                No brokerage accounts found on your SnapTrade account.
              </p>
            </Card>
          ) : (
            snapshot.accounts.map((s) => <AccountCard key={s.account.id} snapshot={s} />)
          )}
        </>
      )}
    </div>
  );
}
