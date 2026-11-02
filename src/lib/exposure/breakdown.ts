import "server-only";
import { PRESET_UNIVERSE } from "@/lib/screener/universe";
import { loadProfiles } from "@/lib/sec/profiles";
import { classify, profileTargets, type Breakdowns, type SectorLookup } from "./classify";
import type { Exposure } from "./lookthrough";
import { normalizeTicker } from "./names";

// The screener's S&P 500 and 400 lists carry official GICS sectors and cover
// most of the market's value, so they classify the bulk of any fund.
const SP: SectorLookup = {
  byCik: new Map(PRESET_UNIVERSE.filter((c) => c.cik !== null).map((c) => [c.cik as number, c.sector])),
  byTicker: new Map(PRESET_UNIVERSE.map((c) => [normalizeTicker(c.symbol), c.sector])),
};

export async function loadBreakdowns(exposure: Exposure): Promise<Breakdowns> {
  const profiles = await loadProfiles(profileTargets(exposure, SP));
  return classify(exposure, SP, profiles);
}
