import "server-only";
import { loadExposure } from "@/lib/exposure/load";
import { resolvePageView } from "@/lib/groups/views";
import { isSnaptradeConfigured } from "@/lib/snaptrade/client";
import { isOwnerEmail } from "@/lib/snaptrade/owner";
import { getCurrentUser } from "@/lib/supabase/server";

/**
 * Ticker -> percent of your invested money (looking through funds), for
 * marking which of a manager's picks you already own. Empty when the brokerage
 * isn't connected or can't be read; the investors pages work without it.
 */
export async function loadOwnedTickers(): Promise<Record<string, number>> {
  const user = await getCurrentUser();
  if (!isOwnerEmail(user?.email) || !isSnaptradeConfigured()) return {};
  try {
    const { include } = await resolvePageView("investments", "investments");
    const { exposure } = await loadExposure(include);
    const owned: Record<string, number> = {};
    for (const r of exposure.rows) if (r.kind === "company" && r.ticker) owned[r.ticker] = r.pct;
    return owned;
  } catch (err) {
    console.error("Couldn't load your holdings for the investors page:", err);
    return {};
  }
}
