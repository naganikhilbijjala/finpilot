import { TickerLink } from "@/components/screener/TickerLink";
import { Card } from "@/components/ui/Card";
import { ChartIcon, LayersIcon, PercentIcon, WalletIcon } from "@/components/ui/Icons";
import { Notice } from "@/components/ui/Notice";
import { StatCard } from "@/components/ui/StatCard";
import { edge } from "@/lib/investors/consensus";
import type { Manager } from "@/lib/investors/managers";
import type { Change, ManagerReport } from "@/lib/investors/report";
import { formatCompactMoney } from "@/lib/utils/format";
import { CloneChart } from "./CloneChart";
import { EdgeBadge } from "./EdgeBadge";
import { pct, quarterLabel, shortDate, signedPct } from "./format";

const CHANGE: Record<Change, { label: string; className: string }> = {
  new: { label: "New", className: "bg-primary-50 text-primary-700" },
  added: { label: "Added", className: "bg-emerald-50 text-emerald-700" },
  reduced: { label: "Trimmed", className: "bg-amber-50 text-amber-800" },
};

export function ManagerDetail({
  manager,
  report,
  owned,
}: {
  manager: Manager;
  report: ManagerReport;
  owned: Record<string, number>;
}) {
  const five = report.clone?.windows.find((w) => w.years === 5);
  const longest = report.clone?.windows[report.clone.windows.length - 1];
  const hasOwned = Object.keys(owned).length > 0;
  const shared = report.holdings.filter((h) => h.ticker && owned[h.ticker] !== undefined);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          accent
          label={longest ? `Copied, ${longest.years} yr` : "Copied return"}
          icon={<PercentIcon className="h-4 w-4" />}
          value={longest ? `${pct(longest.cloneAnnual)}/yr` : "—"}
          sub={longest ? `S&P 500 ${pct(longest.benchAnnual)}/yr` : "Not enough history"}
        />
        <StatCard
          label="Reported portfolio"
          icon={<WalletIcon className="h-4 w-4" />}
          value={formatCompactMoney(report.totalValue)}
          sub={`US stocks, ${quarterLabel(report.reportDate)}`}
        />
        <StatCard
          label="Positions"
          icon={<LayersIcon className="h-4 w-4" />}
          value={report.positionCount.toLocaleString()}
          sub={`Top 10 = ${report.holdings
            .slice(0, 10)
            .reduce((s, h) => s + h.pct, 0)
            .toFixed(0)}% of it`}
        />
        <StatCard
          label="Latest filing"
          icon={<ChartIcon className="h-4 w-4" />}
          value={shortDate(report.filedAt)}
          sub={`${report.quartersUsed} quarters used`}
        />
      </div>

      {report.clone ? (
        <Card
          title="Growth of $100 if you had copied them"
          subtitle="Bought at each 13F's weights the day it was published, held until the next one. Dividends included."
        >
          <CloneChart series={report.clone.series} name={manager.name} />
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {report.clone.windows.map((w) => (
              <div key={w.years} className="rounded-xl border border-gray-200/80 bg-gray-50/60 p-4">
                <div className="text-xs font-medium uppercase tracking-wider text-gray-500">{w.years} year{w.years > 1 && "s"}</div>
                <div className="num mt-1 text-lg font-semibold text-gray-900">
                  {signedPct(w.clone, 0)} <span className="text-sm font-normal text-gray-500">vs {signedPct(w.bench, 0)}</span>
                </div>
                <div className="mt-1">
                  <EdgeBadge value={edge(report, w.years)} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-gray-500">
            {Math.round(report.clone.coverage * 100)}% of each portfolio was copied on average: the largest positions up
            to 95% of its value or 40 stocks. {five ? "" : "Less than five years of filings are available. "}
          </p>
        </Card>
      ) : (
        <Notice tone="warning">Not enough price history to calculate a copied return.</Notice>
      )}

      <Card
        flush
        title={`Holdings in ${quarterLabel(report.reportDate)}`}
        subtitle={`Largest ${report.holdings.length} positions. Changes compare share counts with the previous quarter, adjusted for splits.${
          hasOwned ? ` You own ${shared.length} of them.` : ""
        }`}
      >
        <div className="overflow-x-auto px-5 pb-5 sm:px-6">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <tr>
                <th className="w-8 py-2 pr-2">#</th>
                <th className="py-2 pr-3">Stock</th>
                <th className="px-3 py-2 text-right">Weight</th>
                <th className="px-3 py-2 text-right">Value</th>
                <th className="px-3 py-2">Last quarter</th>
                {hasOwned && <th className="py-2 pl-3 text-right">You</th>}
              </tr>
            </thead>
            <tbody>
              {report.holdings.map((h, i) => (
                <tr key={h.cusip} className="border-t border-gray-100">
                  <td className="num py-3 pr-2 text-xs text-gray-400">{i + 1}</td>
                  <td className="py-3 pr-3">
                    <div className="font-semibold text-gray-900">{h.ticker ? <TickerLink ticker={h.ticker} /> : h.name}</div>
                    {h.ticker && <div className="max-w-[16rem] truncate text-xs text-gray-500">{h.name}</div>}
                  </td>
                  <td className="px-3 py-3">
                    <div className="num text-right font-semibold text-gray-900">{h.pct.toFixed(1)}%</div>
                    <div className="ml-auto mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-primary-500"
                        style={{ width: `${Math.min(100, (h.pct / report.holdings[0].pct) * 100)}%` }}
                      />
                    </div>
                  </td>
                  <td className="num px-3 py-3 text-right text-gray-700">{formatCompactMoney(h.value)}</td>
                  <td className="px-3 py-3">
                    {h.change ? (
                      <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${CHANGE[h.change].className}`}>
                        {CHANGE[h.change].label}
                        {h.change !== "new" && h.sharesChangePct !== null && ` ${h.sharesChangePct > 0 ? "+" : ""}${h.sharesChangePct.toFixed(0)}%`}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">No change</span>
                    )}
                  </td>
                  {hasOwned && (
                    <td className="num py-3 pl-3 text-right text-xs">
                      {h.ticker && owned[h.ticker] !== undefined ? (
                        <span className="text-gray-700">{owned[h.ticker].toFixed(2)}%</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {report.soldOut.length > 0 && (
        <Card title="Sold completely last quarter" subtitle="Weight they had in the previous 13F">
          <ul className="flex flex-wrap gap-2">
            {report.soldOut.map((s) => (
              <li key={`${s.ticker}-${s.name}`} className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                <span className="font-semibold text-gray-900">{s.ticker ? <TickerLink ticker={s.ticker} /> : s.name}</span>{" "}
                <span className="num text-xs">{s.prevPct.toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
