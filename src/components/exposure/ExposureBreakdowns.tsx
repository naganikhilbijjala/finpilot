import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { loadBreakdowns } from "@/lib/exposure/breakdown";
import { INTERNATIONAL_UNCLASSIFIED } from "@/lib/exposure/classify";
import type { Exposure } from "@/lib/exposure/lookthrough";
import { BreakdownBars } from "./BreakdownBars";

export function BreakdownsSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
      <CardSkeleton height="h-80" />
      <CardSkeleton height="h-80" />
    </div>
  );
}

/** Sector and country roll-ups; streams in after the rest of the page. */
export async function ExposureBreakdowns({ exposure, currency }: { exposure: Exposure; currency: string | null }) {
  let data;
  try {
    data = await loadBreakdowns(exposure);
  } catch (err) {
    console.error("Sector/country breakdown failed:", err);
    return <Notice tone="warning">Sector and country breakdowns aren&apos;t available right now.</Notice>;
  }

  const us = data.countries.find((c) => c.key === "United States")?.pct ?? 0;
  const known = 100 - (data.countries.find((c) => c.key === "Unknown")?.pct ?? 0);
  const { sp, sec } = data.sectorCoverage;
  const foreignUnknown = data.sectors.find((s) => s.key === INTERNATIONAL_UNCLASSIFIED);

  return (
    <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
      <Card
        title="By sector"
        subtitle={`Percent of invested money. ${sp.toFixed(0)}% of stocks use S&P's sector${
          sec >= 0.5 ? `, ${sec.toFixed(0)}% the SEC industry code` : ""
        }.`}
      >
        <BreakdownBars slices={data.sectors} currency={currency} />
        {foreignUnknown && (
          <p className="mt-4 text-xs text-gray-500">
            &ldquo;{INTERNATIONAL_UNCLASSIFIED}&rdquo; is overseas companies (mostly from international funds) that
            aren&apos;t registered with the SEC, so no industry is on file for them.
          </p>
        )}
      </Card>
      <Card
        title="By country"
        subtitle={`Where the companies are based, as a percent of your stocks. ${(known - us).toFixed(1)}% outside the US.`}
      >
        <BreakdownBars slices={data.countries} currency={currency} limit={10} />
      </Card>
    </div>
  );
}
