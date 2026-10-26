// View models: the only SnapTrade-derived shapes that leave the server.

export interface AccountView {
  id: string;
  name: string;
  institution: string;
  /** Last 4 characters only. */
  maskedNumber: string;
  totalValue: number | null;
  cash: number | null;
  currency: string | null;
  holdingsSyncedAt: string | null;
  initialSyncCompleted: boolean | null;
}

export interface PositionView {
  ticker: string;
  description: string | null;
  units: number;
  price: number | null;
  averageCost: number | null;
  marketValue: number | null;
  unrealizedPnl: number | null;
  unrealizedPct: number | null;
  currency: string | null;
  cashEquivalent: boolean;
}

export interface AccountSnapshot {
  account: AccountView;
  positions: PositionView[];
}

export interface SnapshotFailure {
  accountId: string;
  accountName: string;
  message: string;
}

export interface SnapshotResult {
  /** When this app retrieved the data (not a brokerage sync time). */
  fetchedAt: string;
  accounts: AccountSnapshot[];
  failures: SnapshotFailure[];
}

/** A brokerage activity reduced to the fields return calculations need. */
export interface ActivityView {
  id: string | null;
  /** ISO timestamp of the transaction. */
  date: string;
  /** SnapTrade's normalized type: BUY, SELL, DIVIDEND, REI, CONTRIBUTION, ... */
  type: string;
  ticker: string | null;
  units: number | null;
  price: number | null;
  /** Signed from the account's view: buys/withdrawals negative, sells/deposits positive. */
  amount: number | null;
  isOption: boolean;
}
