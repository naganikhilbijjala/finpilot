"use client";

import { useMemo, useState } from "react";
import { categoryColor } from "@/components/charts/theme";
import { TickerLink } from "@/components/screener/TickerLink";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { ChartIcon, LayersIcon, PercentIcon, WalletIcon } from "@/components/ui/Icons";
import type { Exposure, ExposureRow } from "@/lib/exposure/lookthrough";
import { STOCK_CONCENTRATION_LIMIT_PCT } from "@/lib/snaptrade/concentration";
import { formatMoney } from "@/lib/utils/format";
import { ExposureDonut, type Slice } from "./ExposureDonut";

const TOP_SLICES = 10;
const PAGE = 25;
const REST_COLOR = "#cbd5e1";

const money = (v: number, currency: string | null) => formatMoney(v, currency).replace(/\.\d+$/, "");
const label = (r: ExposureRow) => r.ticker ?? r.name;

export function ExposureView({ exposure, currency }: { exposure: Exposure; currency: string | null }) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const { rows, total, funds } = exposure;

  // Direct holdings share a colour; each fund gets its own, largest first.
  const sourceColor = useMemo(() => {
    const map = new Map<string | null, string>([[null, categoryColor(0)]]);
    funds.forEach((f, i) => map.set(f.ticker, categoryColor(i + 1)));
    return (fund: string | null) => map.get(fund) ?? REST_COLOR;
  }, [funds]);

  const companies = rows.filter((r) => r.kind === "company");
  const top = companies[0];
  const top10 = companies.slice(0, 10).reduce((s, r) => s + r.pct, 0);

  const slices: Slice[] = useMemo(() => {
    const head: Slice[] = rows.slice(0, TOP_SLICES).map((r, i) => ({
      key: r.key,
      label: label(r),
      value: r.value,
      pct: r.pct,
      color: categoryColor(i),
    }));
    const rest = rows.slice(TOP_SLICES);
    if (rest.length) {
      head.push({
        key: "rest",
        label: `${rest.length} others`,
        value: rest.reduce((s, r) => s + r.value, 0),
        pct: rest.reduce((s, r) => s + r.pct, 0),
        color: REST_COLOR,
      });
    }
    return head;
  }, [rows]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? rows.filter((r) => r.name.toLowerCase().includes(q) || r.ticker?.toLowerCase().includes(q))
    : rows;
  const visible = showAll || q ? filtered : filtered.slice(0, PAGE);
  const rank = new Map(rows.map((r, i) => [r.key, i + 1]));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          accent
          label="Largest exposure"
          icon={<PercentIcon className="h-4 w-4" />}
          value={top ? `${top.ticker ?? top.name} ${top.pct.toFixed(1)}%` : "—"}
          sub={top ? money(top.value, currency) : undefined}
        />
        <StatCard
          label="Top 10 companies"
          icon={<ChartIcon className="h-4 w-4" />}
          value={`${top10.toFixed(1)}%`}
          sub="of invested money"
        />
        <StatCard
          label="Companies owned"
          icon={<LayersIcon className="h-4 w-4" />}
          value={companies.length.toLocaleString()}
          sub="directly or through funds"
        />
        <StatCard
          label="Funds looked through"
          icon={<WalletIcon className="h-4 w-4" />}
          value={`${funds.filter((f) => f.status !== "unavailable").length} of ${funds.length}`}
          sub={`${money(total, currency)} invested`}
        />
      </div>

      <Card
        title="Exposure by stock"
        subtitle="Each fund is split into the companies it holds and added to the shares you own directly"
      >
        <ExposureDonut slices={slices} currency={currency} />
      </Card>

      <Card
        title="Every company you own"
        subtitle="Percent of your invested money (cash excluded). Bars show where the exposure comes from."
        flush
        action={
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search company or ticker"
            aria-label="Search companies"
            className="w-56 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          />
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-5 text-xs text-gray-600 sm:px-6">
          {[null, ...funds.map((f) => f.ticker)].map((s) => (
            <span key={s ?? "direct"} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: sourceColor(s) }} />
              {s ?? "Held directly"}
            </span>
          ))}
        </div>
        <div className="overflow-x-auto px-5 pb-5 sm:px-6">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <tr>
                <th className="w-10 py-2 pr-2">#</th>
                <th className="py-2 pr-3">Company</th>
                <th className="px-3 py-2 text-right">Share</th>
                <th className="px-3 py-2 text-right">Value</th>
                <th className="min-w-[16rem] py-2 pl-3">Where it comes from</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const over = r.kind === "company" && r.pct > STOCK_CONCENTRATION_LIMIT_PCT;
                return (
                  <tr key={r.key} className="border-t border-gray-100 align-middle transition-colors hover:bg-gray-50/70">
                    <td className="num py-3 pr-2 text-xs text-gray-400">{rank.get(r.key)}</td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2 font-semibold text-gray-900">
                        {r.ticker ? <TickerLink ticker={r.ticker} /> : <span className="font-medium">{r.name}</span>}
                        {r.kind === "fund" && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                            fund, not split
                          </span>
                        )}
                        {over && (
                          <span
                            className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800"
                            title={`More than ${STOCK_CONCENTRATION_LIMIT_PCT}% of your invested money`}
                          >
                            Over {STOCK_CONCENTRATION_LIMIT_PCT}%
                          </span>
                        )}
                      </div>
                      {r.ticker && <div className="max-w-[18rem] truncate text-xs text-gray-500">{r.name}</div>}
                    </td>
                    <td className="num px-3 py-3 text-right font-semibold text-gray-900">{r.pct.toFixed(2)}%</td>
                    <td className="num px-3 py-3 text-right text-gray-700">{money(r.value, currency)}</td>
                    <td className="py-3 pl-3">
                      <div className="flex h-2 overflow-hidden rounded-full bg-gray-100">
                        {r.sources.map((s) => (
                          <div
                            key={s.fund ?? "direct"}
                            style={{ width: `${(s.value / r.value) * 100}%`, background: sourceColor(s.fund) }}
                          />
                        ))}
                      </div>
                      <div className="num mt-1 truncate text-xs text-gray-500">
                        {r.sources
                          .map((s) => `${s.fund ?? "Direct"} ${((s.value / total) * 100).toFixed(2)}%`)
                          .join(" · ")}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {visible.length === 0 && <p className="py-8 text-center text-sm text-gray-500">No matches.</p>}
          {!q && !showAll && filtered.length > PAGE && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50"
              >
                Show all {filtered.length.toLocaleString()}
              </button>
            </div>
          )}
        </div>
      </Card>

      <Card title="Funds looked through" subtitle="Holdings come from each fund's latest quarterly SEC filing (Form N-PORT)">
        <ul className="divide-y divide-gray-100 text-sm">
          {funds.map((f) => (
            <li key={f.ticker} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: sourceColor(f.ticker) }} />
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900">{f.ticker}</div>
                  <div className="text-xs text-gray-500">
                    {f.status === "unavailable"
                      ? "Holdings unavailable, counted as one position"
                      : `${f.holdingsCount.toLocaleString()} holdings as of ${f.asOf ?? "unknown"}${
                          f.proxyFor ? ` · using ${f.proxyFor}'s holdings (same index)` : ""
                        }`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="num text-gray-700">{money(f.value, currency)}</span>
                {f.status !== "unavailable" && (
                  <span
                    className="num rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                    title="Share of the fund matched to a known company; the rest is listed under its own name"
                  >
                    {f.matchedPct.toFixed(0)}% matched
                  </span>
                )}
              </div>
            </li>
          ))}
          {funds.length === 0 && <li className="py-3 text-gray-500">You don&apos;t hold any funds; everything above is held directly.</li>}
        </ul>
      </Card>
    </div>
  );
}
