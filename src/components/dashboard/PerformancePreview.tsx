import { PerformanceExplorer } from "@/components/performance/PerformanceExplorer";
import { Notice } from "@/components/ui/Notice";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { loadPerformance } from "@/lib/returns/loadPerformance";
import { describeError } from "@/lib/snaptrade/errors";

/** The interactive chart from the Performance page, without the detail table. */
export async function PerformancePreview() {
  let data;
  try {
    data = await loadPerformance();
  } catch (err) {
    console.error("Performance load failed:", describeError(err));
    return (
      <Notice tone="warning">
        Performance isn&apos;t available right now.{" "}
        {err instanceof Error && !/status code|RESPONSE HEADERS/.test(err.message)
          ? err.message
          : describeError(err)}
        .
      </Notice>
    );
  }

  return (
    <div>
      <SectionHeading title="Performance" href="/performance" linkLabel="Full performance" />
      <PerformanceExplorer data={data} compact />
    </div>
  );
}
