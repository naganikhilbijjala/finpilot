import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ManagerDetail } from "@/components/investors/ManagerDetail";
import { ArrowRightIcon } from "@/components/ui/Icons";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { loadManagerReport } from "@/lib/investors/load";
import { findManager } from "@/lib/investors/managers";
import { loadOwnedTickers } from "@/lib/investors/owned";
import type { ManagerReport } from "@/lib/investors/report";
import { hasSecAgent } from "@/lib/sec/client";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function loadReport(cik: number): Promise<{ report: ManagerReport | null; error: string | null }> {
  if (!hasSecAgent()) return { report: null, error: "Set SEC_USER_AGENT to read 13F filings" };
  try {
    return { report: await loadManagerReport(cik), error: null };
  } catch (err) {
    console.error(`Investor report ${cik} failed:`, err);
    return { report: null, error: err instanceof Error ? err.message : "Couldn't load this manager's filings" };
  }
}

export default async function ManagerPage({ params }: { params: Promise<{ cik: string }> }) {
  if (!(await getCurrentUser())) redirect("/login");
  const manager = findManager(Number((await params).cik));
  if (!manager) notFound();

  const [owned, result] = await Promise.all([loadOwnedTickers(), loadReport(manager.cik)]);
  const { report, error } = result;

  return (
    <div className="space-y-6">
      <Link href="/investors" className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700">
        <ArrowRightIcon className="h-4 w-4 rotate-180" /> All investors
      </Link>
      <PageHeader title={manager.name} description={`${manager.person} · ${manager.style}`} />
      {error && <Notice tone="error">{error}</Notice>}
      {report && <ManagerDetail manager={manager} report={report} owned={owned} />}
      <p className="text-xs text-gray-500">
        Source: Form 13F filings on{" "}
        <a
          className="underline hover:text-gray-700"
          href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${manager.cik}&type=13F-HR`}
          target="_blank"
          rel="noopener noreferrer"
        >
          sec.gov
        </a>
        . Not investment advice.
      </p>
    </div>
  );
}
