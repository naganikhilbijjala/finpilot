import Link from "next/link";
import { ArrowRightIcon, UsersIcon } from "@/components/ui/Icons";
import { filterSnapshot, viewPredicate, type EmergencyTarget, type View } from "@/lib/groups/groups";
import { resolvePageView } from "@/lib/groups/views";
import { buildOverview } from "@/lib/snaptrade/aggregate";
import { isSnaptradeConfigured } from "@/lib/snaptrade/client";
import { fetchSnapshot } from "@/lib/snaptrade/snapshot";
import { formatMoney, formatPercent } from "@/lib/utils/format";

const whole = (v: number, currency: string | null) => formatMoney(v, currency).replace(/\.\d+$/, "");

function CardShell({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-gray-200/80 bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-elevated"
    >
      {children}
      <span className="mt-auto inline-flex items-center gap-1 pt-4 text-xs font-medium text-primary-600">
        View details <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

/** One card per account group: your investments, emergency fund, and each person you manage money for. */
export async function GroupCards() {
  if (!isSnaptradeConfigured()) return null;
  let scope;
  let snapshot;
  try {
    [scope, snapshot] = await Promise.all([resolvePageView(undefined, "investments"), fetchSnapshot()]);
  } catch {
    // BrokerageOverview below reports SnapTrade errors; don't show them twice.
    return null;
  }
  const { views, settings } = scope;

  if (views.length < 2) {
    return (
      <Link
        href="/settings/accounts"
        className="group flex items-center gap-4 rounded-2xl border border-dashed border-primary-200 bg-primary-50/50 p-5 transition-colors hover:bg-primary-50"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary-600 shadow-sm">
          <UsersIcon />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900">Have an emergency fund or manage someone else&apos;s money?</p>
          <p className="text-sm text-gray-600">
            Group your accounts so only your own money counts toward your net worth and returns.
          </p>
        </div>
        <ArrowRightIcon className="h-5 w-5 shrink-0 text-primary-600 transition-transform group-hover:translate-x-0.5" />
      </Link>
    );
  }

  const goal = settings.target.monthlyExpenses * settings.target.months;
  const cards: GroupCardData[] = views
    .filter((v) => v.kind === "investments" || v.kind === "emergency" || v.kind === "managed")
    .map((view) => {
      const o = buildOverview(filterSnapshot(snapshot, viewPredicate(view, settings.assignments)));
      return {
        view,
        currency: o.currency,
        value: o.netWorth,
        unrealizedPnl: o.unrealizedPnl,
        unrealizedPct: o.unrealizedPct,
        accountCount: o.accounts.length,
      };
    });
  return <GroupCardList cards={cards} goal={goal} target={settings.target} />;
}

export interface GroupCardData {
  view: View;
  currency: string | null;
  value: number;
  unrealizedPnl: number;
  unrealizedPct: number | null;
  accountCount: number;
}

export function GroupCardList({
  cards,
  goal,
  target,
}: {
  cards: GroupCardData[];
  goal: number;
  target: EmergencyTarget;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(({ view, ...o }) => {
        const href = `/overview?view=${encodeURIComponent(view.key)}`;
        const accounts = `${o.accountCount} account${o.accountCount === 1 ? "" : "s"}`;

        if (view.kind === "emergency") {
          const pct = goal > 0 ? Math.min(100, (o.value / goal) * 100) : 100;
          const monthsCovered =
            target.monthlyExpenses > 0 ? o.value / target.monthlyExpenses : null;
          const funded = o.value >= goal;
          return (
            <CardShell key={view.key} href={href}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">Emergency fund</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    funded ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
                  }`}
                >
                  {funded ? "Fully funded" : `${whole(goal - o.value, o.currency)} to go`}
                </span>
              </div>
              <div className="num mt-2 text-2xl font-semibold tracking-tight text-gray-900">
                {whole(o.value, o.currency)}
                <span className="text-base font-normal text-gray-400"> / {whole(goal, o.currency)}</span>
              </div>
              <div
                className="mt-3 h-2.5 overflow-hidden rounded-full bg-gray-100"
                role="progressbar"
                aria-valuenow={Math.round(pct)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Emergency fund progress"
              >
                <div
                  className={`h-full rounded-full ${funded ? "bg-emerald-500" : "bg-amber-400"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="num mt-2 text-sm text-gray-500">
                {monthsCovered === null
                  ? accounts
                  : `${monthsCovered.toFixed(1)} of ${target.months} months of expenses covered`}
              </p>
            </CardShell>
          );
        }

        const managed = view.kind === "managed";
        const gainTone = o.unrealizedPnl >= 0 ? "text-emerald-600" : "text-rose-600";
        return (
          <CardShell key={view.key} href={href}>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium text-gray-500">
                {managed ? `Managed for ${view.label}` : view.label}
              </span>
              {managed && (
                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  Not in your net worth
                </span>
              )}
            </div>
            <div className="num mt-2 text-2xl font-semibold tracking-tight text-gray-900">
              {whole(o.value, o.currency)}
            </div>
            <p className="num mt-1 text-sm">
              <span className={gainTone}>
                {o.unrealizedPnl >= 0 ? "+" : ""}
                {whole(o.unrealizedPnl, o.currency)} ({formatPercent(o.unrealizedPct)})
              </span>
              <span className="text-gray-500"> unrealized · {accounts}</span>
            </p>
          </CardShell>
        );
      })}
    </div>
  );
}
