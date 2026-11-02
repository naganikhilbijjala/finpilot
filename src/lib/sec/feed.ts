// Turns raw SEC filings into a plain-English feed for the companies you own.

import type { Exposure } from "@/lib/exposure/lookthrough";
import { filingUrl, type CompanyFiling, type CompanyProfile } from "./submissions";

export type Importance = "high" | "normal" | "low";
export type FeedCategory = "earnings" | "reports" | "events" | "other";

export interface FeedItem {
  id: string;
  cik: number;
  ticker: string | null;
  company: string;
  form: string;
  filedAt: string;
  reportDate: string | null;
  title: string;
  /** Other things the same filing covers. */
  tags: string[];
  importance: Importance;
  category: FeedCategory;
  url: string;
  /** Your look-through exposure to the company, percent of invested money. */
  exposurePct: number;
  held: "direct" | "funds" | "both";
}

export interface Followed {
  cik: number;
  ticker: string | null;
  name: string;
  pct: number;
  held: FeedItem["held"];
}

interface ItemInfo {
  label: string;
  importance: Importance;
}

/** 8-K item numbers, worded for an investor rather than a lawyer. */
export const EIGHT_K_ITEMS: Record<string, ItemInfo> = {
  "1.01": { label: "Signed a major agreement", importance: "normal" },
  "1.02": { label: "Ended a major agreement", importance: "normal" },
  "1.03": { label: "Bankruptcy or receivership", importance: "high" },
  "1.04": { label: "Mine safety violation", importance: "normal" },
  "1.05": { label: "Cybersecurity incident", importance: "high" },
  "2.01": { label: "Completed an acquisition or sale", importance: "high" },
  "2.02": { label: "Earnings results", importance: "normal" },
  "2.03": { label: "Took on new debt", importance: "normal" },
  "2.04": { label: "Debt repayment accelerated", importance: "high" },
  "2.05": { label: "Restructuring or layoffs", importance: "normal" },
  "2.06": { label: "Asset write-down", importance: "high" },
  "3.01": { label: "Delisting or listing-rule notice", importance: "high" },
  "3.02": { label: "Issued new shares privately", importance: "normal" },
  "3.03": { label: "Shareholder rights changed", importance: "normal" },
  "4.01": { label: "Changed auditor", importance: "high" },
  "4.02": { label: "Past results no longer reliable (restatement)", importance: "high" },
  "5.01": { label: "Change in control", importance: "high" },
  "5.02": { label: "Executive or board change", importance: "normal" },
  "5.03": { label: "Bylaws or fiscal year changed", importance: "low" },
  "5.07": { label: "Shareholder vote results", importance: "low" },
  "5.08": { label: "Director nomination deadline", importance: "low" },
  "7.01": { label: "Investor presentation or update", importance: "low" },
  "8.01": { label: "Other company announcement", importance: "low" },
};

const RANK: Record<Importance, number> = { high: 0, normal: 1, low: 2 };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};

type Described = Pick<FeedItem, "title" | "tags" | "importance" | "category">;

function describe8K(items: string[]): Described {
  const known = items
    .filter((i) => i !== "9.01")
    .map((i) => ({ code: i, ...(EIGHT_K_ITEMS[i] ?? { label: `Item ${i}`, importance: "low" as Importance }) }))
    // Most important first; earnings lead among equals because that's what people look for.
    .sort((a, b) => RANK[a.importance] - RANK[b.importance] || (b.code === "2.02" ? 1 : 0) - (a.code === "2.02" ? 1 : 0));
  if (known.length === 0) {
    return { title: "Current report", tags: [], importance: "low", category: "other" };
  }
  const [main, ...rest] = known;
  return {
    title: main.label,
    tags: rest.map((r) => r.label),
    importance: main.importance,
    category: items.includes("2.02") ? "earnings" : "events",
  };
}

export function describeFiling(f: Pick<CompanyFiling, "form" | "items" | "reportDate">): Described {
  const amended = f.form.endsWith("/A");
  const base = f.form.replace(/\/A$/, "");
  const period = f.reportDate ? ` through ${shortDate(f.reportDate)}` : "";
  let d: Described;
  switch (base) {
    case "8-K":
      d = describe8K(f.items);
      break;
    case "10-K":
    case "20-F":
    case "40-F":
      d = { title: `Annual report${period}`, tags: [], importance: "normal", category: "reports" };
      break;
    case "10-Q":
      d = { title: `Quarterly report${period}`, tags: [], importance: "normal", category: "reports" };
      break;
    case "6-K":
      d = { title: "Update from a foreign-listed company", tags: [], importance: "low", category: "other" };
      break;
    case "DEF 14A":
      d = { title: "Proxy for the shareholder meeting", tags: ["Pay, board votes"], importance: "low", category: "other" };
      break;
    case "SC 13D":
    case "SCHEDULE 13D":
      d = amended
        ? { title: "Activist investor updated their stake", tags: [], importance: "normal", category: "events" }
        : { title: "Investor took a 5%+ stake and may push for changes", tags: [], importance: "high", category: "events" };
      return d;
    default:
      d = { title: f.form, tags: [], importance: "low", category: "other" };
  }
  return amended ? { ...d, title: `${d.title} (amended)` } : d;
}

/**
 * Companies to follow: everything held directly plus the biggest companies
 * held through funds, since those move your money the most.
 */
export function pickFollowed(exposure: Exposure, { fromFunds = 15, max = 30 } = {}): Followed[] {
  const out: Followed[] = [];
  let extra = 0;
  for (const r of exposure.rows) {
    if (r.kind !== "company" || r.cik === null) continue;
    const direct = r.sources.some((s) => s.fund === null);
    const viaFunds = r.sources.some((s) => s.fund !== null);
    if (!direct) {
      if (extra >= fromFunds) continue;
      extra++;
    }
    out.push({
      cik: r.cik,
      ticker: r.ticker,
      name: r.name,
      pct: r.pct,
      held: direct && viaFunds ? "both" : direct ? "direct" : "funds",
    });
    if (out.length >= max) break;
  }
  return out;
}

export function buildFeed(followed: Followed[], profiles: Map<number, CompanyProfile>, since: string): FeedItem[] {
  const items: FeedItem[] = [];
  for (const c of followed) {
    const profile = profiles.get(c.cik);
    if (!profile) continue;
    for (const f of profile.filings) {
      if (f.filedAt < since) continue;
      items.push({
        id: `${c.cik}:${f.accession}`,
        cik: c.cik,
        ticker: c.ticker,
        company: c.name,
        form: f.form,
        filedAt: f.filedAt,
        reportDate: f.reportDate,
        url: filingUrl(c.cik, f),
        exposurePct: c.pct,
        held: c.held,
        ...describeFiling(f),
      });
    }
  }
  return items.sort(
    (a, b) =>
      b.filedAt.localeCompare(a.filedAt) || RANK[a.importance] - RANK[b.importance] || b.exposurePct - a.exposurePct
  );
}
