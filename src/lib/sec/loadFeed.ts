import "server-only";
import { loadExposure } from "@/lib/exposure/load";
import type { SnapshotFailure } from "@/lib/snaptrade/types";
import { buildFeed, pickFollowed, type FeedItem, type Followed } from "./feed";
import { loadProfiles } from "./profiles";

export interface LoadedFeed {
  items: FeedItem[];
  followed: Followed[];
  /** Companies whose filings couldn't be loaded. */
  missing: Followed[];
  since: string;
  failures: SnapshotFailure[];
}

export async function loadFeed(
  include: ((accountId: string) => boolean) | undefined,
  days: number
): Promise<LoadedFeed> {
  const { exposure, failures } = await loadExposure(include);
  const followed = pickFollowed(exposure);
  const profiles = await loadProfiles(followed.map((f) => f.cik));
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  return {
    items: buildFeed(followed, profiles, since),
    followed,
    missing: followed.filter((f) => !profiles.has(f.cik)),
    since,
    failures,
  };
}
