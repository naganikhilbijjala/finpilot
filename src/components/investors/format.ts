export const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`;
export const signedPct = (v: number, digits = 1) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(digits)}%`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const shortDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};
/** "2026-06-30" -> "Q2 2026" */
export const quarterLabel = (iso: string) => {
  const [y, m] = iso.split("-").map(Number);
  return `Q${Math.ceil(m / 3)} ${y}`;
};
