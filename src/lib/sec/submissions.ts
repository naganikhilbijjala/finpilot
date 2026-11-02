// Parses data.sec.gov/submissions/CIK##########.json: a company's profile
// (industry code, address) and its recent filings. Kept small on purpose so
// each company fits easily in the persistent cache.

export interface CompanyFiling {
  form: string;
  /** YYYY-MM-DD the SEC received it. */
  filedAt: string;
  /** Period the filing covers or the date of the event, when given. */
  reportDate: string | null;
  /** 8-K item numbers such as "2.02" (results) or "5.02" (officer change). */
  items: string[];
  accession: string;
  document: string;
}

export interface CompanyProfile {
  cik: number;
  name: string;
  /** Four-digit Standard Industrial Classification code. */
  sic: string | null;
  industry: string | null;
  /** Country of the business address, e.g. "United States", "Taiwan". */
  country: string | null;
  filings: CompanyFiling[];
}

/** Forms worth showing an investor; insider (4), 13G and registration forms are left out. */
export const TRACKED_FORMS = new Set([
  "8-K",
  "8-K/A",
  "10-K",
  "10-K/A",
  "10-Q",
  "20-F",
  "40-F",
  "6-K",
  "DEF 14A",
  "SC 13D",
  "SC 13D/A",
  "SCHEDULE 13D",
  "SCHEDULE 13D/A",
]);

const KEEP_DAYS = 400;

const US_STATES = new Set(
  "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY PR".split(
    " "
  )
);

interface RawAddress {
  stateOrCountry?: string | null;
  isForeignLocation?: number | null;
  country?: string | null;
}

interface RawSubmissions {
  cik?: string | number;
  name?: string;
  sic?: string;
  sicDescription?: string;
  addresses?: { business?: RawAddress; mailing?: RawAddress };
  filings?: { recent?: Record<string, unknown[]> };
}

const titleCase = (s: string) => s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());

function countryOf(address: RawAddress | undefined): string | null {
  if (!address) return null;
  if (address.isForeignLocation === 1 && address.country) return address.country;
  const code = address.stateOrCountry?.toUpperCase();
  if (code && US_STATES.has(code)) return code === "PR" ? "Puerto Rico" : "United States";
  return address.country ?? null;
}

export function parseSubmissions(raw: unknown, today: Date = new Date()): CompanyProfile {
  const body = (raw ?? {}) as RawSubmissions;
  const recent = body.filings?.recent ?? {};
  const col = (name: string) => (Array.isArray(recent[name]) ? recent[name] : []);
  const forms = col("form");
  const filed = col("filingDate");
  const report = col("reportDate");
  const items = col("items");
  const accession = col("accessionNumber");
  const document = col("primaryDocument");

  const cutoff = new Date(today.getTime() - KEEP_DAYS * 86_400_000).toISOString().slice(0, 10);
  const filings: CompanyFiling[] = [];
  for (let i = 0; i < forms.length; i++) {
    const form = String(forms[i] ?? "");
    const filedAt = String(filed[i] ?? "");
    if (!TRACKED_FORMS.has(form) || !filedAt || filedAt < cutoff) continue;
    filings.push({
      form,
      filedAt,
      reportDate: report[i] ? String(report[i]) : null,
      items: String(items[i] ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      accession: String(accession[i] ?? ""),
      document: String(document[i] ?? ""),
    });
  }

  return {
    cik: Number(body.cik ?? 0),
    name: body.name ?? "",
    sic: body.sic || null,
    industry: body.sicDescription ? titleCase(body.sicDescription) : null,
    country: countryOf(body.addresses?.business) ?? countryOf(body.addresses?.mailing),
    filings,
  };
}

/** Link to the filing's main document on sec.gov. */
export function filingUrl(cik: number, f: Pick<CompanyFiling, "accession" | "document">): string {
  const folder = `https://www.sec.gov/Archives/edgar/data/${cik}/${f.accession.replace(/-/g, "")}`;
  return f.document ? `${folder}/${f.document}` : `${folder}/`;
}
