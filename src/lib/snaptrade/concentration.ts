import type { AccountSnapshot, PositionView } from "./types";

/** Single stocks above this share of an account get flagged. ETFs are exempt. */
export const STOCK_CONCENTRATION_LIMIT_PCT = 10;

/** Share of the account's total value (cash included); null when unknowable. */
export function accountSharePct(
  position: PositionView,
  snapshot: AccountSnapshot
): number | null {
  const total = snapshot.account.totalValue;
  if (position.marketValue === null || total === null || total <= 0) return null;
  return (position.marketValue / total) * 100;
}

/** Only individual stocks are flagged; funds are diversified by construction. */
export const isConcentrated = (position: PositionView, pct: number | null): boolean =>
  position.kind === "stock" && pct !== null && pct > STOCK_CONCENTRATION_LIMIT_PCT;
