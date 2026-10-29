import type {
  Account,
  AccountPosition,
  Balance,
} from "snaptrade-typescript-sdk";
import type { AccountUniversalActivity } from "snaptrade-typescript-sdk";
import type { AccountView, ActivityView, PositionView } from "./types";

/** Accepts numbers or numeric strings (the positions API returns strings). */
const num = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

// Contract multipliers aren't reported, so value/P&L stay unknown for these.
const DERIVATIVE_KINDS = new Set(["option", "future", "future_option", "cfd"]);

export function maskAccountNumber(value: string | null | undefined): string {
  const v = (value ?? "").trim();
  return v ? `••••${v.slice(-4)}` : "••••";
}

export function normalizeAccount(
  account: Account,
  balances?: Balance[] | null
): AccountView {
  const balance = balances?.[0];
  const syncStatus = account.sync_status?.holdings;

  return {
    id: account.id,
    name: account.name?.trim() || account.institution_name,
    institution: account.institution_name,
    maskedNumber: maskAccountNumber(account.number),
    totalValue: num(account.balance?.total?.amount),
    cash: num(balance?.cash),
    currency: account.balance?.total?.currency ?? balance?.currency?.code ?? null,
    holdingsSyncedAt: syncStatus?.last_successful_sync ?? null,
    initialSyncCompleted: syncStatus?.initial_sync_completed ?? null,
  };
}

/** Returns null for rows without a usable ticker or unit count. */
export function normalizePosition(position: AccountPosition): PositionView | null {
  const instrument = position.instrument;
  const ticker = instrument?.symbol?.trim();
  const units = num(position.units);
  if (!ticker || units === null || units === 0) return null;

  const derivative = DERIVATIVE_KINDS.has(instrument.kind);
  const price = num(position.price);
  // cost_basis is the average purchase price per share.
  const averageCost = num(position.cost_basis);

  const marketValue = !derivative && price !== null ? units * price : null;
  const unrealizedPnl =
    !derivative && price !== null && averageCost !== null
      ? (price - averageCost) * units
      : null;
  const costBasis = averageCost !== null ? averageCost * units : null;
  const unrealizedPct =
    unrealizedPnl !== null && costBasis !== null && costBasis !== 0
      ? (unrealizedPnl / Math.abs(costBasis)) * 100
      : null;

  return {
    ticker,
    description:
      "description" in instrument && typeof instrument.description === "string"
        ? instrument.description
        : null,
    kind: instrument.kind ? String(instrument.kind).toLowerCase() : null,
    units,
    price,
    averageCost,
    marketValue,
    unrealizedPnl,
    unrealizedPct,
    currency: position.currency ?? null,
    cashEquivalent: position.cash_equivalent === true,
  };
}

export function normalizePositions(
  positions: AccountPosition[] | null | undefined
): PositionView[] {
  return (positions ?? [])
    .map(normalizePosition)
    .filter((p): p is PositionView => p !== null)
    .sort((a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0));
}

/** Returns null when the activity has no usable date or type. */
export function normalizeActivity(
  activity: AccountUniversalActivity
): ActivityView | null {
  const date = activity.trade_date ?? null;
  const type = activity.type?.trim().toUpperCase();
  if (!date || !type || isNaN(new Date(date).getTime())) return null;

  return {
    id: activity.id ?? null,
    date,
    type,
    ticker: activity.symbol?.symbol?.trim() || null,
    units: num(activity.units),
    price: num(activity.price),
    amount: num(activity.amount),
    isOption: Boolean(activity.option_symbol),
  };
}
