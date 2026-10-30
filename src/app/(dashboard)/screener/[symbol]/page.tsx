import { unstable_cache } from "next/cache";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { HistoryCharts } from "@/components/screener/HistoryCharts";
import { IncomeSankey } from "@/components/screener/IncomeSankey";
import { Card } from "@/components/ui/Card";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { fetchStatements } from "@/lib/screener/edgar";
import { CATEGORY_LABELS } from "@/lib/screener/metrics";
import { buildIncomeSankey } from "@/lib/screener/sankey";
import { SP500 } from "@/lib/screener/sp500";
import { hasFundamentals, type StoredData } from "@/lib/screener/types";
import { createClient } from "@/lib/supabase/server";
import { formatCompactMoney } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

// Filings change a few times a year; the SEC response is several MB, so cache the parsed result.
const getStatements = unstable_cache(
  (symbol: string, cik: number) => fetchStatements(symbol, cik),
  ["screener-statements"],
  { revalidate: 60 * 60 * 24 }
);

const pct = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : `${(v * 100).toFixed(1)}%`;
const x = (v: number | null | undefined) => (v === null || v === undefined ? "—" : v.toFixed(1));

export default async function StockPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol: raw } = await params;
  const symbol = decodeURIComponent(raw).toUpperCase();
  const constituent = SP500.find((c) => c.symbol === symbol);
  if (!constituent) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: row } = await supabase
    .from("stock_fundamentals")
    .select("data")
    .eq("symbol", symbol)
    .maybeSingle();
  const stored = row?.data as StoredData | undefined;
  const fundamentals = stored && hasFundamentals(stored) ? stored : null;

  let statements = null;
  let error: string | null = null;
  try {
    statements = await getStatements(symbol, constituent.cik);
  } catch (err) {
    console.error(`Statements load failed for ${symbol}:`, err);
    error = "Couldn't load filings from the SEC right now. Try again in a minute.";
  }

  const latest = statements?.latest ?? null;
  const sankey = latest ? buildIncomeSankey(latest) : null;
  const fy = latest ? new Date(latest.fiscalYearEnd).getUTCFullYear() : null;

  const metrics: [string, string][] = fundamentals
    ? [
        ["P/E", x(fundamentals.pe)],
        ["PEG", x(fundamentals.peg)],
        ["ROIC", pct(fundamentals.roic)],
        ["Debt / equity", x(fundamentals.debtToEquity)],
        ["EPS growth /yr (5y)", pct(fundamentals.epsCagr5y)],
        ["Revenue growth /yr (5y)", pct(fundamentals.revenueCagr5y)],
        ["Revenue growth /yr (10y)", pct(fundamentals.revenueCagr10y)],
        ["FCF yield", pct(fundamentals.fcfYield)],
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${symbol} · ${constituent.name}`}
        description={
          <>
            {constituent.sector}
            {fundamentals && ` · ${CATEGORY_LABELS[fundamentals.category]}`}
          </>
        }
        actions={
          <Link href="/screener" className="text-sm text-primary-600 hover:underline">
            ← Screener
          </Link>
        }
      />

      {error && <Notice tone="error">{error}</Notice>}

      {metrics.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {metrics.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-card">
              <div className="text-xs font-medium text-gray-500">{label}</div>
              <div className="num mt-1 text-lg font-semibold text-gray-900">{value}</div>
            </div>
          ))}
        </div>
      ) : (
        !error && (
          <Notice tone="info">
            No cached ratios for {symbol} yet. Load them from the Screener page.
          </Notice>
        )
      )}

      {latest && (
        <Card
          title={`Where each revenue dollar goes (FY${fy})`}
          subtitle={`Revenue ${formatCompactMoney(latest.revenue)} → net income ${formatCompactMoney(latest.netIncome)} (${((latest.netIncome / latest.revenue) * 100).toFixed(1)}% margin). From the company's 10-K.`}
        >
          {sankey ? (
            <IncomeSankey
              data={sankey}
              label={`${symbol} income statement for fiscal ${fy}: revenue to costs, expenses, tax and net income`}
            />
          ) : (
            <p className="text-sm text-gray-500">
              This company reported an operating loss, which a flow chart can&apos;t show. See the
              history below.
            </p>
          )}
        </Card>
      )}

      {statements && statements.history.length > 1 && (
        <Card title="10-year history" subtitle="Annual figures from SEC filings.">
          <HistoryCharts history={statements.history} />
        </Card>
      )}

      {statements && !latest && !error && (
        <Notice tone="warning">
          Couldn&apos;t find a full income statement for {symbol} in its SEC filings. Companies
          label their results differently, and some (for example a recently reorganized one)
          have no history under their current filing number.
        </Notice>
      )}

      <p className="text-xs text-gray-500">
        Financial data comes from the company&apos;s own SEC filings. This is research
        information, not investment advice.
      </p>
    </div>
  );
}
