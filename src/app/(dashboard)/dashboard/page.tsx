import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BrokerageOverview } from "@/components/dashboard/BrokerageOverview";
import { ManualPortfolio } from "@/components/dashboard/ManualPortfolio";
import { PerformancePreview } from "@/components/dashboard/PerformancePreview";
import { Button } from "@/components/ui/Button";
import { PlusIcon, UploadIcon } from "@/components/ui/Icons";
import { PageHeader } from "@/components/ui/PageHeader";
import { CardSkeleton, StatsSkeleton } from "@/components/ui/Skeleton";
import { isOwnerEmail } from "@/lib/snaptrade/owner";
import { createClient } from "@/lib/supabase/server";

// Brokerage data must be fresh per request, never statically rendered.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isOwner = isOwnerEmail(user.email);
  const name = user.email?.split("@")[0] ?? "there";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${name}. Here's where your money stands.`}
        actions={
          <>
            <Link href="/portfolio/import">
              <Button variant="outline">
                <UploadIcon className="h-4 w-4" /> Import CSV
              </Button>
            </Link>
            <Link href="/portfolio/add">
              <Button>
                <PlusIcon className="h-4 w-4" /> Add transaction
              </Button>
            </Link>
          </>
        }
      />

      {isOwner && (
        <>
          <Suspense
            fallback={
              <div className="space-y-6">
                <StatsSkeleton />
                <div className="grid gap-6 lg:grid-cols-2">
                  <CardSkeleton />
                  <CardSkeleton />
                </div>
              </div>
            }
          >
            <BrokerageOverview />
          </Suspense>

          <Suspense fallback={<CardSkeleton height="h-96" />}>
            <PerformancePreview />
          </Suspense>
        </>
      )}

      <Suspense fallback={isOwner ? null : <StatsSkeleton />}>
        <ManualPortfolio userId={user.id} quietWhenEmpty={isOwner} />
      </Suspense>
    </div>
  );
}
