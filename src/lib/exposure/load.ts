import "server-only";
import { filterSnapshot } from "@/lib/groups/groups";
import { userAgent } from "@/lib/screener/edgar";
import { buildOverview } from "@/lib/snaptrade/aggregate";
import { fetchSnapshot } from "@/lib/snaptrade/snapshot";
import type { SnapshotFailure } from "@/lib/snaptrade/types";
import { computeExposure, type Exposure, type FundInput } from "./lookthrough";
import { buildCompanyIndex, normalizeTicker, type CompanyIndex } from "./names";
import { parseNport, type NportFiling } from "./nport";

/**
 * Unit investment trusts (SPY, MDY) file no N-PORT. Each tracks the same
 * index as a registered ETF, whose holdings stand in for it.
 */
const PROXIES: Record<string, string> = {
  SPY: "IVV",
  SPLG: "IVV",
  MDY: "IJH",
};

const DAY = 24 * 60 * 60 * 1000;
const RETRY_AFTER_FAILURE = 10 * 60 * 1000;

export class MissingSecAgentError extends Error {}

async function secFetch(url: string): Promise<Response> {
  const res = await fetch(url, {
    headers: { "User-Agent": userAgent(), Accept: "application/json, application/xml, text/xml" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`SEC ${res.status} for ${new URL(url).pathname}`);
  return res;
}

/** Caches one value per key; failures expire quickly so outages self-heal. */
function cached<T>(ttl: number) {
  const store = new Map<string, { at: number; ok: boolean; value: Promise<T> }>();
  return (key: string, load: () => Promise<T>): Promise<T> => {
    const hit = store.get(key);
    if (hit && Date.now() - hit.at < (hit.ok ? ttl : RETRY_AFTER_FAILURE)) return hit.value;
    const entry = { at: Date.now(), ok: true, value: load() };
    entry.value.catch(() => {
      entry.ok = false;
    });
    store.set(key, entry);
    return entry.value;
  };
}

const companies = cached<CompanyIndex>(DAY);
const seriesMap = cached<Map<string, string>>(DAY);
const filings = cached<NportFiling>(DAY / 2);

const loadCompanyIndex = () =>
  companies("all", async () =>
    buildCompanyIndex(await (await secFetch("https://www.sec.gov/files/company_tickers.json")).json())
  );

/** Fund ticker -> SEC series id, from the SEC's mutual fund and ETF ticker file. */
const loadSeriesMap = () =>
  seriesMap("all", async () => {
    const body = (await (await secFetch("https://www.sec.gov/files/company_tickers_mf.json")).json()) as {
      fields?: string[];
      data?: unknown[][];
    };
    const seriesCol = body.fields?.indexOf("seriesId") ?? -1;
    const symbolCol = body.fields?.indexOf("symbol") ?? -1;
    const map = new Map<string, string>();
    if (seriesCol < 0 || symbolCol < 0) throw new Error("SEC fund ticker file changed shape");
    for (const row of body.data ?? []) {
      const symbol = row[symbolCol];
      const series = row[seriesCol];
      if (typeof symbol === "string" && typeof series === "string") {
        map.set(normalizeTicker(symbol), series);
      }
    }
    return map;
  });

/** Latest N-PORT holdings for a fund series. */
const loadFiling = (seriesId: string) =>
  filings(seriesId, async () => {
    const feed = await (
      await secFetch(
        `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${seriesId}&type=NPORT-P&dateb=&owner=include&count=1&output=atom`
      )
    ).text();
    const href = feed.match(/<filing-href>([^<]+)<\/filing-href>/)?.[1];
    if (!href) throw new Error(`No N-PORT filing found for series ${seriesId}`);
    const folder = href.slice(0, href.lastIndexOf("/"));
    const filing = parseNport(await (await secFetch(`${folder}/primary_doc.xml`)).text());
    if (filing.seriesId && filing.seriesId !== seriesId) {
      throw new Error(`N-PORT for ${seriesId} described ${filing.seriesId}`);
    }
    return filing;
  });

const FUND_KINDS = /etf|fund|mutual|oef|cef|uit/i;

export interface LoadedExposure {
  exposure: Exposure;
  currency: string | null;
  fetchedAt: string;
  /** Brokerage accounts left out because they couldn't be loaded. */
  failures: SnapshotFailure[];
  /** Funds whose holdings couldn't be fetched, with the reason. */
  fundErrors: { ticker: string; message: string }[];
}

export async function loadExposure(include?: (accountId: string) => boolean): Promise<LoadedExposure> {
  if (!process.env.SEC_USER_AGENT?.trim()) {
    throw new MissingSecAgentError(
      'Set SEC_USER_AGENT (for example "finpilot you@example.com") so fund holdings can be read from SEC EDGAR'
    );
  }

  const all = await fetchSnapshot();
  const snapshot = include ? filterSnapshot(all, include) : all;
  const overview = buildOverview(snapshot);
  const [index, series] = await Promise.all([loadCompanyIndex(), loadSeriesMap()]);

  const kinds = new Map<string, string>();
  for (const { positions } of snapshot.accounts) {
    for (const p of positions) if (p.kind) kinds.set(p.ticker, p.kind);
  }

  const positions = overview.holdings.map((h) => {
    const t = normalizeTicker(h.ticker);
    const kind = kinds.get(h.ticker) ?? "";
    return {
      ticker: h.ticker,
      description: h.description,
      marketValue: h.marketValue,
      isOption: kind === "option",
      isFund: series.has(t) || t in PROXIES || FUND_KINDS.test(kind),
    };
  });

  const funds = new Map<string, FundInput | null>();
  const fundErrors: LoadedExposure["fundErrors"] = [];
  await Promise.all(
    positions
      .filter((p) => p.isFund)
      .map(async (p) => {
        const t = normalizeTicker(p.ticker);
        const proxy = PROXIES[t];
        const seriesId = series.get(proxy ?? t);
        if (!seriesId) {
          funds.set(p.ticker, null);
          fundErrors.push({ ticker: p.ticker, message: "The SEC has no holdings filing for this fund" });
          return;
        }
        try {
          funds.set(p.ticker, { filing: await loadFiling(seriesId), proxyFor: proxy });
        } catch (err) {
          console.error(`N-PORT load failed for ${p.ticker}:`, err);
          funds.set(p.ticker, null);
          fundErrors.push({
            ticker: p.ticker,
            message: err instanceof Error ? err.message : "Couldn't load its holdings",
          });
        }
      })
  );

  return {
    exposure: computeExposure(positions, funds, index),
    currency: overview.currency,
    fetchedAt: overview.fetchedAt,
    failures: overview.failures,
    fundErrors,
  };
}
