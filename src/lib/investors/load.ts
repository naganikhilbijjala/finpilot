import "server-only";
import { unstable_cache } from "next/cache";
import { memo } from "@/lib/cache/memo";
import { fetchNportDocument, loadCompanyIndex, loadSeriesMap } from "@/lib/exposure/load";
import { fetchPriceHistories } from "@/lib/market/history";
import { secFetch } from "@/lib/sec/client";
import { yearsBefore } from "./clone";
import { findManager } from "./managers";
import { buildReport, positionsToPrice, type ManagerReport, type Quarter } from "./report";
import { buildCusipMap, resolveSecurity, type CusipMap } from "./securities";
import { infoTableFile, parseInfoTable, toPositions, type Position } from "./thirteenf";

const HOUR = 60 * 60;
const DAY = 24 * HOUR;
/** Five years of copied returns need the filing published just before the window opens. */
const HISTORY_YEARS = 5;
const EXTRA_DAYS = 120;
/** Positions kept per filing; the long tail barely moves a copied portfolio. */
const MAX_POSITIONS = 150;
const BENCHMARK = "SPY";

interface FilingRef {
  accession: string;
  filedAt: string;
  reportDate: string;
}

const isoToday = () => new Date().toISOString().slice(0, 10);
const daysBefore = (iso: string, days: number) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10);

/** 13F-HR filings (amendments skipped), newest first, with the filer's name. */
async function listFilings(cik: number): Promise<{ filer: string; filings: FilingRef[] }> {
  const id = String(cik).padStart(10, "0");
  const body = (await (await secFetch(`https://data.sec.gov/submissions/CIK${id}.json`)).json()) as {
    name?: string;
    filings?: { recent?: Record<string, string[]>; files?: { name: string; filingTo: string }[] };
  };
  const since = daysBefore(yearsBefore(isoToday(), HISTORY_YEARS), EXTRA_DAYS);
  const pages = [body.filings?.recent ?? {}];
  // Busy filers push older filings into extra pages.
  for (const file of body.filings?.files ?? []) {
    if (file.filingTo < since) continue;
    pages.push((await (await secFetch(`https://data.sec.gov/submissions/${file.name}`)).json()) as Record<string, string[]>);
  }

  const byPeriod = new Map<string, FilingRef>();
  for (const page of pages) {
    const forms = page.form ?? [];
    for (let i = 0; i < forms.length; i++) {
      if (forms[i] !== "13F-HR") continue;
      const ref = { accession: page.accessionNumber[i], filedAt: page.filingDate[i], reportDate: page.reportDate[i] };
      if (ref.filedAt < since) continue;
      // One per quarter: a late duplicate for the same period replaces the earlier one.
      const existing = byPeriod.get(ref.reportDate);
      if (!existing || ref.filedAt > existing.filedAt) byPeriod.set(ref.reportDate, ref);
    }
  }
  return {
    filer: body.name ?? `CIK ${cik}`,
    filings: [...byPeriod.values()].sort((a, b) => b.filedAt.localeCompare(a.filedAt)),
  };
}

type CompactPosition = [cusip: string, name: string, value: number, shares: number];

// A filed 13F never changes, so its table can be cached for a long time.
const fetchTable = unstable_cache(
  async (cik: number, accession: string): Promise<CompactPosition[]> => {
    const folder = `https://www.sec.gov/Archives/edgar/data/${cik}/${accession.replace(/-/g, "")}`;
    const index = (await (await secFetch(`${folder}/index.json`)).json()) as {
      directory?: { item?: { name: string }[] };
    };
    const file = infoTableFile((index.directory?.item ?? []).map((i) => i.name));
    if (!file) throw new Error(`No information table in 13F ${accession}`);
    const positions = toPositions(parseInfoTable(await (await secFetch(`${folder}/${file}`)).text()));
    return positions.slice(0, MAX_POSITIONS).map((p) => [p.cusip, p.name, p.value, p.shares]);
  },
  ["sec-13f-table-v1"],
  { revalidate: 30 * DAY }
);

/** CUSIP -> SEC company id from a total-market fund (VTI), refreshed weekly. */
const fetchCusipPairs = unstable_cache(
  async (): Promise<[string, number][]> => {
    const [index, series] = await Promise.all([loadCompanyIndex(), loadSeriesMap()]);
    const seriesId = series.get("VTI");
    if (!seriesId) throw new Error("VTI is missing from the SEC fund list");
    const map = buildCusipMap((await fetchNportDocument(seriesId)).holdings, index);
    return [...map].map(([cusip, company]) => [cusip, company.cik]);
  },
  ["sec-cusip-map-v1"],
  { revalidate: 7 * DAY }
);

const cusipMemo = memo<CusipMap>(DAY * 1000);
async function loadCusipMap(): Promise<CusipMap> {
  return cusipMemo.get("vti", async () => {
    const [pairs, index] = await Promise.all([fetchCusipPairs(), loadCompanyIndex()]);
    const byCik = new Map([...index.byTicker.values()].map((c) => [c.cik, c]));
    const map: CusipMap = new Map();
    for (const [cusip, cik] of pairs) {
      const company = byCik.get(cik);
      if (company) map.set(cusip, company);
    }
    return map;
  });
}

/** Drops SEC state suffixes and title-cases shouting names: "MOODYS CORP /DE/" -> "Moodys Corp". */
function readable(title: string): string {
  const t = title.replace(/\s*\/[A-Z]{2,3}\/?\s*$/, "").trim();
  if (t !== t.toUpperCase()) return t;
  return t.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

async function buildManagerReport(cik: number): Promise<ManagerReport> {
  const { filer, filings } = await listFilings(cik);
  if (filings.length === 0) throw new Error("No 13F filings in the last five years");
  const [index, cusips] = await Promise.all([loadCompanyIndex(), loadCusipMap()]);

  const tables = await Promise.all(filings.map((f) => fetchTable(cik, f.accession)));
  const quarters: Quarter[] = filings.map((f, i) => ({
    filedAt: f.filedAt,
    reportDate: f.reportDate,
    positions: tables[i].map(([cusip, name, value, shares]): Quarter["positions"][number] => {
      const position: Position = { cusip, name, value, shares };
      const company = resolveSecurity(cusips, index, cusip, name);
      return { ...position, ticker: company?.ticker ?? null, displayName: company ? readable(company.title) : readable(name) };
    }),
  }));

  const tickers = new Set<string>([BENCHMARK]);
  for (const q of quarters) for (const p of positionsToPrice(q)) tickers.add(p.ticker as string);
  // One shared start date (first of the month) so managers reuse each other's cached prices.
  const from = `${daysBefore(yearsBefore(isoToday(), HISTORY_YEARS), EXTRA_DAYS).slice(0, 7)}-01`;
  const { histories } = await fetchPriceHistories([...tickers], from, 6);
  const bench = histories.get(BENCHMARK);
  if (!bench) throw new Error("Couldn't load S&P 500 prices");

  return buildReport({ cik, filer, quarters, prices: histories, bench: bench.points });
}

const cachedReport = unstable_cache(buildManagerReport, ["investor-report-v1"], { revalidate: 12 * HOUR });
const reports = memo<ManagerReport>(HOUR * 1000);

export class UnknownManagerError extends Error {}

export function loadManagerReport(cik: number): Promise<ManagerReport> {
  if (!findManager(cik)) return Promise.reject(new UnknownManagerError(`Unknown manager ${cik}`));
  return reports.get(String(cik), () => cachedReport(cik));
}
