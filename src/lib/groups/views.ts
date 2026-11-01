import "server-only";
import { fetchSnapshot } from "@/lib/snaptrade/snapshot";
import { listViews, resolveView, viewPredicate, type View, type ViewKey } from "./groups";
import { getGroupSettings, type GroupSettings } from "./settings";

export interface ResolvedView {
  view: View;
  views: View[];
  include: (accountId: string) => boolean;
  settings: GroupSettings;
}

/** The view a page should show, from its ?view= param and its default. */
export async function resolvePageView(
  requested: string | string[] | undefined,
  fallback: ViewKey
): Promise<ResolvedView> {
  const [settings, snapshot] = await Promise.all([getGroupSettings(), fetchSnapshot()]);
  const ids = [
    ...snapshot.accounts.map((s) => s.account.id),
    ...snapshot.failures.map((f) => f.accountId),
  ];
  const views = listViews(ids, settings.assignments);
  const view = resolveView(views, typeof requested === "string" ? requested : undefined, fallback);
  return { view, views, include: viewPredicate(view, settings.assignments), settings };
}
