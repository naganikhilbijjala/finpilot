"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TickerLink } from "@/components/screener/TickerLink";
import { Card } from "@/components/ui/Card";
import { consensus, edge } from "@/lib/investors/consensus";
import type { Manager } from "@/lib/investors/managers";
import type { ManagerReport } from "@/lib/investors/report";
import { EdgeBadge } from "./EdgeBadge";
import { pct, quarterLabel, shortDate } from "./format";

type Status =
  | { state: "loading" }
  | { state: "waiting"; until: number }
  | { state: "ok"; report: ManagerReport }
  | { state: "error"; message: string };
type SortKey = "10" | "5" | "3" | "1" | "name";

// One at a time: a cold report reads dozens of SEC files, and parallel calls can
// land on separate servers that each pace themselves, together exceeding the SEC's
// 10 requests a second. Cached reports return instantly, so this costs little.
const CONCURRENCY = 1;
const CONSENSUS_PAGE = 30;
const RATE_LIMIT_RETRIES = 4;
/** Big filers (Jane Street's 13F is ~9 MB a quarter) take several 40-second rounds the first time. */
const STILL_LOADING_RETRIES = 20;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchReport(cik: number, onWait: (until: number) => void): Promise<ManagerReport> {
  let rounds = 0;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`/api/investors/${cik}`);
    if (res.ok) return res.json();
    const body = await res.json().catch(() => null);
    if (body?.error === "STILL_LOADING" && rounds++ < STILL_LOADING_RETRIES) {
      attempt--; // progress, not a failure
      await sleep(1000);
      continue;
    }
    if (res.status === 429 && attempt < RATE_LIMIT_RETRIES) {
      // Filings fetched before the limit hit are cached, so each retry picks up where it stopped.
      const seconds = Number(res.headers.get("retry-after")) || 60;
      const until = Date.now() + seconds * 1000;
      onWait(until);
      await sleep(seconds * 1000);
      continue;
    }
    // One quick retry covers a cold start that ran out of time.
    if (attempt === 0 && res.status >= 500) {
      await sleep(3000);
      continue;
    }
    throw new Error(body?.message ?? `HTTP ${res.status}`);
  }
}

function Returns({ report, years }: { report: ManagerReport | undefined; years: number }) {
  const w = report?.clone?.windows.find((x) => x.years === years);
  if (!w) return <span className="text-xs text-gray-400">{report ? "n/a" : ""}</span>;
  return (
    <div className="space-y-1">
      <div className="num font-semibold text-gray-900">{pct(w.cloneAnnual)}/yr</div>
      <EdgeBadge value={edge(report, years)} />
    </div>
  );
}

export function InvestorsBoard({ managers, owned }: { managers: Manager[]; owned: Record<string, number> }) {
  const [status, setStatus] = useState<Record<number, Status>>(() =>
    Object.fromEntries(managers.map((m) => [m.cik, { state: "loading" } as Status]))
  );
  const [sort, setSort] = useState<SortKey>("5");
  const [onlyAhead, setOnlyAhead] = useState(false);
  const [hideOwned, setHideOwned] = useState(false);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const queue = [...managers];
    const worker = async () => {
      for (let m = queue.shift(); m; m = queue.shift()) {
        const cik = m.cik;
        let next: Status;
        try {
          next = {
            state: "ok",
            report: await fetchReport(cik, (until) => {
              if (!cancelled) setStatus((s) => ({ ...s, [cik]: { state: "waiting", until } }));
            }),
          };
        } catch (err) {
          next = { state: "error", message: err instanceof Error ? err.message : "Couldn't load" };
        }
        if (!cancelled) setStatus((s) => ({ ...s, [cik]: next }));
      }
    };
    void Promise.all(Array.from({ length: CONCURRENCY }, worker));
    return () => {
      cancelled = true;
    };
  }, [managers]);

  const reportOf = (cik: number) => {
    const s = status[cik];
    return s?.state === "ok" ? s.report : undefined;
  };
  const loaded = managers.filter((m) => {
    const state = status[m.cik]?.state;
    return state === "ok" || state === "error";
  }).length;
  const waiting = managers.some((m) => status[m.cik]?.state === "waiting");

  const sorted = useMemo(() => {
    if (sort === "name") return [...managers].sort((a, b) => a.name.localeCompare(b.name));
    const years = Number(sort);
    const key = (m: Manager) => {
      const s = status[m.cik];
      return edge(s?.state === "ok" ? s.report : undefined, years) ?? -Infinity;
    };
    return [...managers].sort((a, b) => key(b) - key(a));
  }, [managers, status, sort]);

  const ahead = managers.filter((m) => (edge(reportOf(m.cik), 5) ?? -1) > 0);
  const rows = useMemo(() => {
    const pool = (onlyAhead ? ahead : managers)
      .map((manager) => ({ manager, report: reportOf(manager.cik) }))
      .filter((e): e is { manager: Manager; report: ManagerReport } => Boolean(e.report));
    const all = consensus(pool, owned, onlyAhead ? Math.min(2, pool.length) : 2);
    return hideOwned ? all.filter((r) => r.ownedPct === null) : all;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, onlyAhead, hideOwned, owned, managers]);

  const hasOwned = Object.keys(owned).length > 0;
  const rank = new Map(rows.map((r, i) => [r.ticker, i + 1]));
  const q = query.trim().toLowerCase();
  const matching = q ? rows.filter((r) => r.ticker.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)) : rows;
  const visibleRows = q || showAll ? matching : matching.slice(0, CONSENSUS_PAGE);

  return (
    <div className="space-y-6">
      <Card
        flush
        title="How their portfolios would have done"
        subtitle="Copying each manager's 13F on the day it was published, held until the next one, with dividends. The badge is the gap to the S&P 500 (SPY) over the same period."
        action={
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort managers"
            className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          >
            <option value="10">Best vs S&P, 10 years</option>
            <option value="5">Best vs S&P, 5 years</option>
            <option value="3">Best vs S&P, 3 years</option>
            <option value="1">Best vs S&P, 1 year</option>
            <option value="name">Name</option>
          </select>
        }
      >
        {loaded < managers.length && (
          <p className="px-5 text-xs text-gray-500 sm:px-6">
            Loaded {loaded} of {managers.length}.{" "}
            {waiting
              ? "The SEC asked us to slow down, so the next manager will resume in about a minute (nothing is lost)."
              : "The first visit of the day reads ten years of filings for each manager; after that it's instant."}
          </p>
        )}
        <div className="overflow-x-auto px-5 pb-5 sm:px-6">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <tr>
                <th className="py-2 pr-3">Manager</th>
                <th className="px-3 py-2">1 year</th>
                <th className="px-3 py-2">3 years</th>
                <th className="px-3 py-2">5 years</th>
                <th className="px-3 py-2">10 years</th>
                <th className="min-w-[12rem] px-3 py-2">Biggest holdings</th>
                <th className="py-2 pl-3">Latest 13F</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((m) => {
                const s = status[m.cik];
                const report = s?.state === "ok" ? s.report : undefined;
                return (
                  <tr key={m.cik} className="border-t border-gray-100 align-top transition-colors hover:bg-gray-50/70">
                    <td className="py-3 pr-3">
                      <Link href={`/investors/${m.cik}`} className="font-semibold text-gray-900 hover:text-primary-700">
                        {m.name}
                      </Link>
                      <div className="text-xs text-gray-500">
                        {m.person} · {m.style}
                      </div>
                    </td>
                    {s?.state === "loading" ? (
                      <td colSpan={6} className="px-3 py-3">
                        <div className="h-8 animate-pulse rounded-lg bg-gray-100" />
                      </td>
                    ) : s?.state === "waiting" ? (
                      <td colSpan={6} className="px-3 py-3 text-xs text-amber-800">
                        SEC rate limit reached; retrying at{" "}
                        {new Date(s.until).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </td>
                    ) : s?.state === "error" ? (
                      <td colSpan={6} className="px-3 py-3 text-xs text-rose-700">
                        Couldn&apos;t load: {s.message}
                      </td>
                    ) : (
                      <>
                        <td className="px-3 py-3">
                          <Returns report={report} years={1} />
                        </td>
                        <td className="px-3 py-3">
                          <Returns report={report} years={3} />
                        </td>
                        <td className="px-3 py-3">
                          <Returns report={report} years={5} />
                        </td>
                        <td className="px-3 py-3">
                          <Returns report={report} years={10} />
                        </td>
                        <td className="num px-3 py-3 text-xs text-gray-600">
                          {report?.holdings.slice(0, 4).map((h) => (
                            <span key={h.cusip} className="mr-2 inline-block whitespace-nowrap">
                              <span className="font-semibold text-gray-900">{h.ticker ?? h.name}</span> {h.pct.toFixed(0)}%
                            </span>
                          ))}
                        </td>
                        <td className="whitespace-nowrap py-3 pl-3 text-xs text-gray-600">
                          {report && (
                            <>
                              <div className="font-medium text-gray-900">{quarterLabel(report.reportDate)}</div>
                              filed {shortDate(report.filedAt)}
                            </>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        flush
        title="Most owned across these managers"
        subtitle="Stocks at least two of them hold in their latest 13F (top 40 positions each), most widely held first."
      >
        <div className="flex flex-wrap items-center gap-2 px-5 sm:px-6">
          {[
            { on: false, label: `All managers` },
            { on: true, label: `Only those ahead of the S&P over 5 years (${ahead.length})` },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              aria-pressed={onlyAhead === o.on}
              onClick={() => setOnlyAhead(o.on)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                onlyAhead === o.on ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {o.label}
            </button>
          ))}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a stock"
            aria-label="Find a stock"
            className="w-40 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          />
          {hasOwned && (
            <label className="ml-auto flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={hideOwned}
                onChange={(e) => setHideOwned(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Hide stocks I already own
            </label>
          )}
        </div>
        <div className="overflow-x-auto px-5 pb-5 pt-2 sm:px-6">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <tr>
                <th className="w-8 py-2 pr-2">#</th>
                <th className="py-2 pr-3">Stock</th>
                <th className="px-3 py-2">Held by</th>
                <th className="px-3 py-2 text-right">Avg weight</th>
                {hasOwned && <th className="py-2 pl-3 text-right">You</th>}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => (
                <tr key={r.ticker} className="border-t border-gray-100 align-top">
                  <td className="num py-3 pr-2 text-xs text-gray-400">{rank.get(r.ticker)}</td>
                  <td className="py-3 pr-3">
                    <div className="font-semibold text-gray-900">
                      <TickerLink ticker={r.ticker} />
                    </div>
                    <div className="max-w-[14rem] truncate text-xs text-gray-500">{r.name}</div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-gray-900">{r.holders.length} managers</div>
                    <div className="num max-w-[22rem] text-xs text-gray-500">
                      {r.holders.map((h) => `${h.name} ${h.pct.toFixed(1)}%`).join(" · ")}
                    </div>
                  </td>
                  <td className="num px-3 py-3 text-right font-semibold text-gray-900">{r.avgPct.toFixed(1)}%</td>
                  {hasOwned && (
                    <td className="py-3 pl-3 text-right">
                      {r.ownedPct === null ? (
                        <span className="whitespace-nowrap rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
                          Not owned
                        </span>
                      ) : (
                        <span className="num text-xs text-gray-600">{r.ownedPct.toFixed(2)}%</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {visibleRows.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500">
              {q
                ? `None of the loaded managers' top 40 positions include "${query.trim()}" alongside another manager.`
                : loaded < managers.length
                  ? "Waiting for the managers to load…"
                  : "No stock is shared by two of them."}
            </p>
          )}
          {!q && matching.length > CONSENSUS_PAGE && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50"
              >
                {showAll ? "Show top 30" : `Show all ${matching.length}`}
              </button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
