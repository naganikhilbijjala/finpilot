import { redirect } from "next/navigation";
import { AccountGroupsForm, type AccountRow } from "@/components/groups/AccountGroupsForm";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { getGroupSettings } from "@/lib/groups/settings";
import { isSnaptradeConfigured } from "@/lib/snaptrade/client";
import { describeError } from "@/lib/snaptrade/errors";
import { checkOwner } from "@/lib/snaptrade/owner";
import { fetchSnapshot } from "@/lib/snaptrade/snapshot";

export const dynamic = "force-dynamic";

export default async function AccountGroupsPage() {
  const owner = await checkOwner();
  if (!owner.ok && owner.status === 401) redirect("/login");

  let accounts: AccountRow[] | null = null;
  let error: string | null = null;
  const settings = await getGroupSettings();

  if (!owner.ok) {
    error = owner.message;
  } else if (!isSnaptradeConfigured()) {
    error = "SnapTrade isn't configured, so there are no brokerage accounts to group yet.";
  } else {
    try {
      const snapshot = await fetchSnapshot();
      accounts = [
        ...snapshot.accounts.map(({ account }) => ({
          id: account.id,
          name: account.name,
          detail: `${account.institution} · ${account.maskedNumber}`,
          value: account.totalValue,
          currency: account.currency,
        })),
        ...snapshot.failures.map((f) => ({
          id: f.accountId,
          name: f.accountName,
          detail: "Couldn't load right now",
          value: null,
          currency: null,
        })),
      ];
    } catch (err) {
      error = `Could not fetch accounts from SnapTrade. ${describeError(err)}.`;
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Account groups"
        description="Separate your own investments, your emergency fund and accounts you manage for other people. Every page can then show one group at a time, and only your own money counts toward your net worth."
      />
      {!settings.available && (
        <Notice tone="warning">
          Groups can&apos;t be saved until the database table exists. Run{" "}
          <code className="rounded bg-amber-100 px-1">supabase/migrations/004_account_groups.sql</code> in
          the Supabase SQL editor.
        </Notice>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      {accounts && (
        <AccountGroupsForm accounts={accounts} assignments={settings.assignments} target={settings.target} />
      )}
    </div>
  );
}
