import { redirect } from "next/navigation";
import { InvestorsBoard } from "@/components/investors/InvestorsBoard";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { MANAGERS } from "@/lib/investors/managers";
import { loadOwnedTickers } from "@/lib/investors/owned";
import { hasSecAgent } from "@/lib/sec/client";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function InvestorsPage() {
  if (!(await getCurrentUser())) redirect("/login");
  const owned = await loadOwnedTickers();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Top investors"
        description="What well-known managers own, from the 13F every fund over $100M files each quarter, and how you would have done copying them."
      />
      {!hasSecAgent() ? (
        <Notice tone="error">Set SEC_USER_AGENT (for example &quot;finpilot you@example.com&quot;) to read 13F filings.</Notice>
      ) : (
        <>
          <Notice>
            Read these as a source of ideas, not a scoreboard. A 13F shows only US stocks, ETFs and options: no shorts,
            cash, bonds or foreign shares, so managers marked &ldquo;has shorts&rdquo; ran a different portfolio from what
            you see. Filings arrive up to 45 days after the quarter ends, and a manager who beat the S&amp;P over the
            last five years isn&apos;t more likely to beat it over the next five.
          </Notice>
          <InvestorsBoard managers={MANAGERS} owned={owned} />
        </>
      )}
    </div>
  );
}
