import Link from "next/link";
import { redirect } from "next/navigation";
import { ScreenerTable } from "@/components/screener/ScreenerTable";
import { StockSearch } from "@/components/screener/StockSearch";
import { SyncButton } from "@/components/screener/SyncButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { parseCriteria } from "@/lib/screener/params";
import { PRESETS, runScreen } from "@/lib/screener/screen";
import { SP500 } from "@/lib/screener/sp500";
import { hasFundamentals, type StoredData } from "@/lib/screener/types";
import { checkOwner } from "@/lib/snaptrade/owner";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SECTORS = [...new Set(SP500.map((c) => c.sector))].sort();
const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900";

export default async function ScreenerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const owner = await checkOwner();
  const { data, error } = await supabase
    .from("stock_fundamentals")
    .select("data, fetched_at");

  const rows = (data ?? []).map((r) => r.data as StoredData);
  const stocks = rows.filter(hasFundamentals);
  const locked = rows.length - stocks.length;
  const loadedAt = (data ?? []).map((r) => r.fetched_at as string).sort().at(-1);
  const criteria = parseCriteria(params);
  const results = runScreen(stocks, criteria);
  const hasCriteria = Object.keys(criteria).length > 0;

  // Form defaults mirror the active criteria (percent fields as whole numbers).
  const pctVal = (v?: number) => (v === undefined ? "" : String(Math.round(v * 100)));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock screener"
        description="Filter S&P 500 stocks on the fundamentals Lynch, Buffett and Greenblatt look at. A shortlist to research, not a buy list."
        actions={owner.ok ? <SyncButton remaining={Math.max(0, SP500.length - rows.length)} /> : undefined}
      />

      {error && (
        <Notice tone="error">
          Couldn&apos;t read cached fundamentals. Run migration{" "}
          <code>002_stock_fundamentals.sql</code> in Supabase.
        </Notice>
      )}

      {!error && stocks.length < SP500.length && (
        <Notice tone="warning">
          {stocks.length} of {SP500.length} stocks have fundamentals
          {loadedAt && ` (latest ${new Date(loadedAt).toLocaleDateString()})`}.
          {locked > 0 &&
            ` ${locked} are without data from the provider and are left out of results.`}
        </Notice>
      )}

      <div className="max-w-md">
        <StockSearch />
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(PRESETS).map(([key, p]) => (
          <Link
            key={key}
            href={`/screener?preset=${key}`}
            title={p.blurb}
            className="rounded-full border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 hover:border-gray-400"
          >
            {p.label}
          </Link>
        ))}
      </div>

      <Card title="Criteria" subtitle="Missing data fails a filter, so a stock never passes on numbers we don't have.">
        <form method="get" className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ["maxPe", "Max P/E", criteria.maxPe],
            ["maxPeg", "Max PEG", criteria.maxPeg],
            ["maxDe", "Max debt/equity", criteria.maxDebtToEquity],
            ["minRoic", "Min ROIC %", pctVal(criteria.minRoic)],
            ["minRoe", "Min ROE %", pctVal(criteria.minRoe)],
            ["minEpsCagr", "Min EPS growth %/yr", pctVal(criteria.minEpsCagr)],
            ["minRev5", "Min revenue growth 5y %", pctVal(criteria.minRevCagr5y)],
            ["minRev10", "Min revenue growth 10y %", pctVal(criteria.minRevCagr10y)],
            ["minFcf", "Min FCF yield %", pctVal(criteria.minFcfYield)],
            ["minMargin", "Min net margin %", pctVal(criteria.minNetMargin)],
          ].map(([name, label, value]) => (
            <label key={name as string} className="text-xs font-medium text-gray-600">
              {label}
              <input
                name={name as string}
                type="number"
                step="any"
                defaultValue={value as string | number | undefined}
                className={`${inputClass} mt-1`}
              />
            </label>
          ))}
          <label className="text-xs font-medium text-gray-600">
            Sector
            <select name="sector" defaultValue={criteria.sector ?? ""} className={`${inputClass} mt-1`}>
              <option value="">Any</option>
              {SECTORS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <div className="col-span-2 flex items-end gap-2">
            <Button type="submit" size="sm">Screen</Button>
            <Link href="/screener" className="px-2 py-1.5 text-sm text-gray-500 hover:underline">
              Reset
            </Link>
          </div>
        </form>
      </Card>

      <Card
        flush
        title={hasCriteria ? `${results.length} matching` : `All ${results.length} loaded stocks`}
        subtitle="Click a column header to sort. Starts with PEG, lowest first."
      >
        <ScreenerTable results={results} />
      </Card>
    </div>
  );
}
