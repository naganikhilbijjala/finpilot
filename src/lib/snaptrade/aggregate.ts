import type {
  PositionView,
  SnapshotFailure,
  SnapshotResult,
} from "./types";

export interface HoldingAccountSplit {
  accountId: string;
  accountName: string;
  units: number;
  marketValue: number | null;
}

export interface HoldingAgg {
  ticker: string;
  description: string | null;
  units: number;
  price: number | null;
  marketValue: number;
  /** Null when any contributing lot has no known cost. */
  costBasis: number | null;
  unrealizedPnl: number | null;
  unrealizedPct: number | null;
  /** Percent of total invested (non-cash) value. */
  shareOfInvested: number;
  accounts: HoldingAccountSplit[];
}

export interface AccountAgg {
  id: string;
  name: string;
  institution: string;
  maskedNumber: string;
  totalValue: number;
  cash: number | null;
  invested: number;
  /** Cash as a percent of the account total; null if cash is unknown. */
  cashPct: number | null;
  shareOfNetWorth: number;
  positionCount: number;
  initialSyncCompleted: boolean | null;
  holdingsSyncedAt: string | null;
}

export interface Overview {
  currency: string | null;
  netWorth: number;
  invested: number;
  cash: number;
  cashPct: number;
  costBasis: number;
  unrealizedPnl: number;
  unrealizedPct: number | null;
  accounts: AccountAgg[];
  holdings: HoldingAgg[];
  concentration: {
    top1: { ticker: string; pct: number } | null;
    top5Pct: number;
  };
  gainers: HoldingAgg[];
  losers: HoldingAgg[];
  /** Accounts left out of totals because their currency differs. */
  excludedAccounts: { name: string; currency: string }[];
  /** Positions with no price, so no value (e.g. options). */
  unpricedCount: number;
  failures: SnapshotFailure[];
  fetchedAt: string;
}

// Money-market sweep funds: already counted in the account's cash balance.
const CASH_LIKE = new Set(["SPAXX", "FDRXX", "FZFXX", "FCASH", "VMFXX", "SWVXX"]);

export const isCashLikeTicker = (ticker: string): boolean =>
  CASH_LIKE.has(ticker);

export const isCashLike = (p: PositionView): boolean =>
  p.cashEquivalent || isCashLikeTicker(p.ticker);

const MOVERS = 5;

export function buildOverview(snapshot: SnapshotResult): Overview {
  // Pick the dominant currency; anything else can't be summed with it.
  const byCurrency = new Map<string, number>();
  for (const { account } of snapshot.accounts) {
    if (account.currency) {
      byCurrency.set(
        account.currency,
        (byCurrency.get(account.currency) ?? 0) + (account.totalValue ?? 0)
      );
    }
  }
  const currency =
    [...byCurrency.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const included = snapshot.accounts.filter(
    (s) => !s.account.currency || s.account.currency === currency
  );
  const excludedAccounts = snapshot.accounts
    .filter((s) => s.account.currency && s.account.currency !== currency)
    .map((s) => ({ name: s.account.name, currency: s.account.currency! }));

  const byTicker = new Map<
    string,
    {
      description: string | null;
      units: number;
      price: number | null;
      marketValue: number;
      costBasis: number;
      costKnown: boolean;
      accounts: HoldingAccountSplit[];
    }
  >();
  let unpricedCount = 0;

  const accounts: Omit<AccountAgg, "shareOfNetWorth">[] = included.map(
    ({ account, positions }) => {
      let invested = 0;
      let positionCount = 0;

      for (const p of positions) {
        if (isCashLike(p)) continue;
        positionCount++;
        if (p.marketValue === null) {
          unpricedCount++;
          continue;
        }
        invested += p.marketValue;

        const agg = byTicker.get(p.ticker) ?? {
          description: p.description,
          units: 0,
          price: null,
          marketValue: 0,
          costBasis: 0,
          costKnown: true,
          accounts: [],
        };
        agg.units += p.units;
        agg.marketValue += p.marketValue;
        agg.price = p.price ?? agg.price;
        if (p.averageCost === null) agg.costKnown = false;
        else agg.costBasis += p.averageCost * p.units;
        agg.accounts.push({
          accountId: account.id,
          accountName: account.name,
          units: p.units,
          marketValue: p.marketValue,
        });
        byTicker.set(p.ticker, agg);
      }

      const totalValue = account.totalValue ?? invested + (account.cash ?? 0);
      return {
        id: account.id,
        name: account.name,
        institution: account.institution,
        maskedNumber: account.maskedNumber,
        totalValue,
        cash: account.cash,
        invested,
        cashPct:
          account.cash !== null && totalValue > 0
            ? (account.cash / totalValue) * 100
            : null,
        positionCount,
        initialSyncCompleted: account.initialSyncCompleted,
        holdingsSyncedAt: account.holdingsSyncedAt,
      };
    }
  );

  const netWorth = accounts.reduce((s, a) => s + a.totalValue, 0);
  const invested = accounts.reduce((s, a) => s + a.invested, 0);
  const cash = accounts.reduce((s, a) => s + (a.cash ?? 0), 0);

  const holdings: HoldingAgg[] = [...byTicker.entries()]
    .map(([ticker, h]) => {
      const costBasis = h.costKnown ? h.costBasis : null;
      const unrealizedPnl = costBasis !== null ? h.marketValue - costBasis : null;
      return {
        ticker,
        description: h.description,
        units: h.units,
        price: h.price,
        marketValue: h.marketValue,
        costBasis,
        unrealizedPnl,
        unrealizedPct:
          unrealizedPnl !== null && costBasis !== 0 && costBasis !== null
            ? (unrealizedPnl / Math.abs(costBasis)) * 100
            : null,
        shareOfInvested: invested > 0 ? (h.marketValue / invested) * 100 : 0,
        accounts: h.accounts.sort(
          (a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0)
        ),
      };
    })
    .sort((a, b) => b.marketValue - a.marketValue);

  // Totals use only holdings with a known cost, so the % isn't distorted.
  const known = holdings.filter((h) => h.costBasis !== null);
  const costBasis = known.reduce((s, h) => s + h.costBasis!, 0);
  const unrealizedPnl = known.reduce((s, h) => s + h.unrealizedPnl!, 0);

  const withPnl = holdings.filter((h) => h.unrealizedPnl !== null);

  return {
    currency,
    netWorth,
    invested,
    cash,
    cashPct: netWorth > 0 ? (cash / netWorth) * 100 : 0,
    costBasis,
    unrealizedPnl,
    unrealizedPct: costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : null,
    accounts: accounts
      .map((a) => ({
        ...a,
        shareOfNetWorth: netWorth > 0 ? (a.totalValue / netWorth) * 100 : 0,
      }))
      .sort((a, b) => b.totalValue - a.totalValue),
    holdings,
    concentration: {
      top1: holdings[0]
        ? { ticker: holdings[0].ticker, pct: holdings[0].shareOfInvested }
        : null,
      top5Pct: holdings
        .slice(0, 5)
        .reduce((s, h) => s + h.shareOfInvested, 0),
    },
    gainers: withPnl
      .filter((h) => h.unrealizedPnl! > 0)
      .sort((a, b) => b.unrealizedPnl! - a.unrealizedPnl!)
      .slice(0, MOVERS),
    losers: withPnl
      .filter((h) => h.unrealizedPnl! < 0)
      .sort((a, b) => a.unrealizedPnl! - b.unrealizedPnl!)
      .slice(0, MOVERS),
    excludedAccounts,
    unpricedCount,
    failures: snapshot.failures,
    fetchedAt: snapshot.fetchedAt,
  };
}
