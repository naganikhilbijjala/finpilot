import { PRESETS, type ScreenCriteria } from "./screen";
import type { LynchCategory } from "./types";

type Params = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function num(v: string | string[] | undefined, scale = 1): number | undefined {
  const s = first(v)?.trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n / scale : undefined;
}

const CATEGORIES: LynchCategory[] = [
  "fast_grower", "stalwart", "slow_grower", "cyclical", "turnaround",
];

/** A named preset wins; otherwise the form fields. Percent fields are entered as whole numbers. */
export function parseCriteria(params: Params): ScreenCriteria {
  const preset = first(params.preset);
  if (preset && PRESETS[preset]) return { ...PRESETS[preset].criteria };

  const category = first(params.category) as LynchCategory | undefined;
  const criteria: ScreenCriteria = {
    maxPe: num(params.maxPe),
    maxPeg: num(params.maxPeg),
    maxDebtToEquity: num(params.maxDe),
    minRoic: num(params.minRoic, 100),
    minRoe: num(params.minRoe, 100),
    minEpsCagr: num(params.minEpsCagr, 100),
    minFcfYield: num(params.minFcf, 100),
    minNetMargin: num(params.minMargin, 100),
    noDilution: first(params.noDilution) === "on" ? true : undefined,
    category: category && CATEGORIES.includes(category) ? category : undefined,
    sector: first(params.sector)?.trim() || undefined,
  };
  // Drop unset keys so "no criteria" is an empty object.
  return Object.fromEntries(
    Object.entries(criteria).filter(([, v]) => v !== undefined)
  ) as ScreenCriteria;
}
