import { formatMoney, formatPercent } from "@/lib/utils/format";
import type { CombinedTickerReturn, TickerReturn } from "@/lib/returns/compute";
import { ReturnCell } from "./ReturnCell";

type Variant = "open" | "closed";

const OPEN_GRID =
  "grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr_0.8fr_1fr_0.9fr] gap-3 items-center min-w-[820px]";
const CLOSED_GRID =
  "grid grid-cols-[1.1fr_1fr_1fr_1fr_1fr_0.8fr_1fr_1.6fr] gap-3 items-center min-w-[860px]";

const gainClass = (v: number | null) =>
  v === null ? "text-gray-500" : v >= 0 ? "text-emerald-600" : "text-rose-600";

function Cells({ t, label, variant }: { t: TickerReturn; label: string; variant: Variant }) {
  const total = (
    <span className={`text-right ${gainClass(t.gain)}`}>
      {t.gain !== null && t.invested > 0 ? formatPercent((t.gain / t.invested) * 100) : "—"}
    </span>
  );
  const annualized = (
    <span className="text-right">
      <ReturnCell
        value={t.xirr}
        shortHistory={t.shortHistory}
        unreconciledUnits={t.unreconciledUnits}
      />
    </span>
  );
  const gain = (
    <span className={`text-right ${gainClass(t.gain)}`}>{formatMoney(t.gain, "USD")}</span>
  );

  if (variant === "closed") {
    return (
      <>
        <span className="font-medium truncate">{label}</span>
        <span className="text-right">{formatMoney(t.invested, "USD")}</span>
        <span className="text-right">{formatMoney(t.proceeds, "USD")}</span>
        <span className="text-right">{formatMoney(t.dividends, "USD")}</span>
        {gain}
        {total}
        {annualized}
        <span className="text-right text-gray-600">
          {t.since ?? "—"}
          {t.until && t.until !== t.since ? ` → ${t.until}` : ""}
        </span>
      </>
    );
  }

  return (
    <>
      <span className="font-medium truncate">{label}</span>
      <span className="text-right">{formatMoney(t.value, "USD")}</span>
      <span className="text-right">{formatMoney(t.invested - t.proceeds, "USD")}</span>
      <span className="text-right">{formatMoney(t.dividends, "USD")}</span>
      {gain}
      {total}
      {annualized}
      <span className="text-right text-gray-600">{t.since ?? "—"}</span>
    </>
  );
}

function Header({ variant, grid }: { variant: Variant; grid: string }) {
  const totalTitle = "Gain divided by total money invested; not annualized";
  return (
    <div className={`${grid} py-2 text-xs font-medium uppercase tracking-wider text-gray-500`}>
      <span>Ticker</span>
      {variant === "closed" ? (
        <>
          <span className="text-right" title="Total money spent buying">Invested</span>
          <span className="text-right" title="Total money received from selling">Sold for</span>
          <span className="text-right">Dividends</span>
        </>
      ) : (
        <>
          <span className="text-right">Value</span>
          <span className="text-right" title="Money spent buying minus money received from selling">
            Net invested
          </span>
          <span className="text-right" title="Dividends received, cash or reinvested. Already included in Gain.">
            Dividends
          </span>
        </>
      )}
      <span className="text-right" title="Total profit in dollars, not per share">Gain</span>
      <span className="text-right" title={totalTitle}>Total return</span>
      <span className="text-right">Annualized</span>
      <span className="text-right">{variant === "closed" ? "Held" : "Since"}</span>
    </div>
  );
}

export function TickerReturns({
  items,
  variant = "open",
}: {
  items: CombinedTickerReturn[];
  variant?: Variant;
}) {
  if (items.length === 0) return <p className="text-sm text-gray-500">None.</p>;
  const grid = variant === "closed" ? CLOSED_GRID : OPEN_GRID;

  return (
    <div className="overflow-x-auto px-5 pb-5 text-sm text-gray-900 sm:px-6">
      <Header variant={variant} grid={grid} />
      {items.map((t) => (
        <details key={t.ticker} className="group border-t border-gray-100">
          <summary className={`${grid} num cursor-pointer list-none py-3 transition-colors hover:bg-gray-50/70`}>
            <Cells
              t={t}
              variant={variant}
              label={t.byAccount.length > 1 ? `${t.ticker} ▸ ${t.byAccount.length} accts` : t.ticker}
            />
          </summary>
          <div className="num mb-2 rounded-xl bg-gray-50">
            {t.byAccount.map((a) => (
              <div key={a.accountId} className={`${grid} py-1.5 pl-4 text-xs`}>
                <Cells t={a} variant={variant} label={a.accountName ?? ""} />
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
