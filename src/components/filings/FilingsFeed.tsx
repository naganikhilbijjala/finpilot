"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import type { FeedCategory, FeedItem, Followed } from "@/lib/sec/feed";
import { FilingItem } from "./FilingItem";

type Filter = "all" | "important" | FeedCategory;

const FILTERS: { key: Filter; label: string; test: (i: FeedItem) => boolean }[] = [
  { key: "all", label: "All", test: () => true },
  { key: "important", label: "Important", test: (i) => i.importance === "high" },
  { key: "earnings", label: "Earnings", test: (i) => i.category === "earnings" },
  { key: "reports", label: "10-K & 10-Q", test: (i) => i.category === "reports" },
  { key: "events", label: "Company events", test: (i) => i.category === "events" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function dayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return `${DAYS[date.getUTCDay()]}, ${MONTHS[m - 1]} ${d}`;
}

export function FilingsFeed({ items, followed }: { items: FeedItem[]; followed: Followed[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [company, setCompany] = useState<string>("");
  const [hideRoutine, setHideRoutine] = useState(true);

  const visible = useMemo(() => {
    const test = FILTERS.find((f) => f.key === filter)!.test;
    return items.filter(
      (i) =>
        test(i) &&
        (!company || String(i.cik) === company) &&
        (!hideRoutine || filter !== "all" || company || i.importance !== "low")
    );
  }, [items, filter, company, hideRoutine]);

  const byDay = useMemo(() => {
    const groups: { day: string; items: FeedItem[] }[] = [];
    for (const i of visible) {
      const last = groups[groups.length - 1];
      if (last?.day === i.filedAt) last.items.push(i);
      else groups.push({ day: i.filedAt, items: [i] });
    }
    return groups;
  }, [visible]);

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.key, items.filter(f.test).length])) as Record<Filter, number>,
    [items]
  );
  const routine = filter === "all" && !company ? items.filter((i) => i.importance === "low").length : 0;

  return (
    <Card flush>
      <div className="flex flex-wrap items-center gap-2 px-5 sm:px-6">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === f.key ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {f.label} <span className="num opacity-70">{counts[f.key]}</span>
          </button>
        ))}
        <select
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          aria-label="Filter by company"
          className="ml-auto max-w-full rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
        >
          <option value="">All {followed.length} companies</option>
          {followed.map((f) => (
            <option key={f.cik} value={f.cik}>
              {f.ticker ?? f.name} ({f.pct.toFixed(1)}%)
            </option>
          ))}
        </select>
      </div>

      <div className="px-5 pb-5 sm:px-6">
        {byDay.map((g) => (
          <section key={g.day} className="mt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{dayLabel(g.day)}</h3>
            <ul className="divide-y divide-gray-100">
              {g.items.map((i) => (
                <FilingItem key={i.id} item={i} />
              ))}
            </ul>
          </section>
        ))}
        {visible.length === 0 && <p className="py-10 text-center text-sm text-gray-500">No filings match.</p>}
        {routine > 0 && (
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => setHideRoutine((h) => !h)}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50"
            >
              {hideRoutine ? `Show ${routine} routine filings` : "Hide routine filings"}
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
