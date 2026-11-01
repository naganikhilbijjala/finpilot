import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountCard } from "@/components/accounts/AccountCard";
import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { isSnaptradeConfigured } from "@/lib/snaptrade/client";
import { checkOwner } from "@/lib/snaptrade/owner";
import { describeError } from "@/lib/snaptrade/errors";
import { assignmentOf, GROUP_LABEL, managedKey } from "@/lib/groups/groups";
import { getGroupSettings } from "@/lib/groups/settings";
import { fetchSnapshot } from "@/lib/snaptrade/snapshot";
import { formatMoney } from "@/lib/utils/format";
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

  // Sections in a fixed order: yours first, then each person you manage for.
  const { assignments } = await getGroupSettings();
  const sections = new Map<string, { title: string; items: NonNullable<typeof snapshot>["accounts"] }>();
  for (const s of snapshot?.accounts ?? []) {
    const a = assignmentOf(s.account.id, assignments);
    const key = a.kind === "managed" && a.managedFor ? managedKey(a.managedFor) : a.kind;
    const title = a.kind === "managed" && a.managedFor ? `Managed for ${a.managedFor}` : GROUP_LABEL[a.kind];
    const section = sections.get(key) ?? { title, items: [] };
    section.items.push(s);
    sections.set(key, section);
  }
  const order = (k: string) => (k === "investments" ? 0 : k === "emergency" ? 1 : 2);
  const grouped = [...sections.entries()].sort((a, b) => order(a[0]) - order(b[0]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Brokerage accounts"
        description={
          snapshot
            ? `Retrieved ${new Date(snapshot.fetchedAt).toLocaleString()}. Prices may be delayed depending on the brokerage.`
            : "Positions in each connected account."
        }
        actions={
          <Link
            href="/settings/accounts"
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50"
          >
            Edit groups
          </Link>
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
            grouped.map(([key, { title, items }]) => (
              <section key={key} className="space-y-4">
                {grouped.length > 1 && (
                  <div className="flex items-baseline justify-between border-b border-gray-200 pb-2">
                    <h2 className="text-lg font-semibold tracking-tight text-gray-900">{title}</h2>
                    <span className="num text-sm text-gray-500">
                      {formatMoney(
                        items.reduce((sum, s) => sum + (s.account.totalValue ?? 0), 0),
                        items[0]?.account.currency
                      )}
                    </span>
                  </div>
                )}
                {items.map((s) => (
                  <AccountCard key={s.account.id} snapshot={s} />
                ))}
              </section>
            ))
          )}
        </>
      )}
    </div>
  );
}
