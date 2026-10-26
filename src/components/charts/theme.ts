/** Shared chart palette so every chart on a page speaks the same visual language. */
export const CHART = {
  primary: "#4f46e5",
  benchmark: "#f59e0b",
  positive: "#10b981",
  negative: "#f43f5e",
  grid: "#e2e8f0",
  axis: "#64748b",
  /** Categorical series, ordered so neighbouring slices stay distinguishable. */
  categorical: [
    "#4f46e5",
    "#10b981",
    "#f59e0b",
    "#0ea5e9",
    "#ec4899",
    "#8b5cf6",
    "#14b8a6",
    "#64748b",
  ],
} as const;

export const categoryColor = (i: number) =>
  CHART.categorical[i % CHART.categorical.length];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2025-03-14" -> "Mar 14" or "Mar 14, 2025" without timezone surprises. */
export function formatChartDate(iso: string, withYear = false): string {
  const [y, m, d] = iso.split("-").map(Number);
  const base = `${MONTHS[m - 1]} ${d}`;
  return withYear ? `${base}, ${y}` : base;
}

export function formatAxisDate(iso: string, spanDays: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (spanDays <= 120) return `${MONTHS[m - 1]} ${d}`;
  return `${MONTHS[m - 1]} '${String(y).slice(2)}`;
}
