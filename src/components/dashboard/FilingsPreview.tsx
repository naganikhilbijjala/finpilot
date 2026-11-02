import { FilingItem } from "@/components/filings/FilingItem";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { resolvePageView } from "@/lib/groups/views";
import { hasSecAgent } from "@/lib/sec/client";
import { loadFeed } from "@/lib/sec/loadFeed";

const SHOWN = 6;

/** The latest notable filings from companies you own, newest first. */
export async function FilingsPreview() {
  if (!hasSecAgent()) return null;
  let items;
  try {
    const { include } = await resolvePageView("investments", "investments");
    items = (await loadFeed(include, 30)).items;
  } catch (err) {
    // The full page shows the reason; the dashboard just leaves the section out.
    console.error("Filings preview failed:", err);
    return null;
  }

  const notable = items.filter((i) => i.importance !== "low").slice(0, SHOWN);

  return (
    <div>
      <SectionHeading title="From your companies' filings" href="/filings" linkLabel="All filings" />
      <Card>
        {notable.length > 0 ? (
          <ul className="-my-3 divide-y divide-gray-100">
            {notable.map((i) => (
              <FilingItem key={i.id} item={i} showDate />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">Nothing notable filed in the last 30 days.</p>
        )}
      </Card>
    </div>
  );
}
