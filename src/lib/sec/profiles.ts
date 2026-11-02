import "server-only";
import { unstable_cache } from "next/cache";
import { memo } from "@/lib/cache/memo";
import { secFetch } from "./client";
import { parseSubmissions, type CompanyProfile } from "./submissions";

const HOUR = 60 * 60;

// Filings arrive through the day, so a company's list is refreshed every few
// hours. Public data only, so it is safe in the shared persistent cache.
const fetchProfile = unstable_cache(
  async (cik: number): Promise<CompanyProfile> => {
    const id = String(cik).padStart(10, "0");
    const res = await secFetch(`https://data.sec.gov/submissions/CIK${id}.json`);
    return parseSubmissions(await res.json());
  },
  ["sec-submissions-v1"],
  { revalidate: 3 * HOUR }
);

const profiles = memo<CompanyProfile>(30 * 60 * 1000);

export const loadProfile = (cik: number) => profiles.get(String(cik), () => fetchProfile(cik));

/** Profiles for many companies; one that fails is simply missing from the map. */
export async function loadProfiles(ciks: number[]): Promise<Map<number, CompanyProfile>> {
  const unique = [...new Set(ciks)];
  const out = new Map<number, CompanyProfile>();
  const settled = await Promise.allSettled(unique.map((cik) => loadProfile(cik)));
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") out.set(unique[i], r.value);
    else console.error(`SEC profile failed for CIK ${unique[i]}:`, r.reason);
  });
  return out;
}
