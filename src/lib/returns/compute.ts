import { isCashLike, isCashLikeTicker } from "@/lib/snaptrade/aggregate";
import type { ActivityView, PositionView } from "@/lib/snaptrade/types";
import { xirr, type Flow } from "./xirr";

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
/** Units below this are treated as zero (fractional-share rounding). */
const UNIT_EPS = 1e-4;

export interface AccountInput {
  id: string;
  name: string;
  totalValue: number | null;
  positions: PositionView[];
  activities: ActivityView[];
}

interface Window {
  /** Annualized money-weighted return as a decimal (0.12 = 12%), or null. */
  xirr: number | null;
  /** Date of the first cash flow (YYYY-MM-DD). */
  since: string | null;
  /** Date of the last cash flow when nothing is held any more, else null. */
  until: string | null;
  /** Length of the holding period; ends at the last flow if the position is closed. */
  years: number;
  /** Less than a year of data: the annualized figure is an extrapolation. */
  shortHistory: boolean;
}

export interface AccountReturn extends Window {
  id: string;
  name: string;
  value: number | null;
  /** Deposits into the account. */
  contributed: number;
  withdrawn: number;
  /** value + withdrawn - contributed; null if the value is unknown. */
  gain: number | null;
  /** Dividends paid by stocks and funds (cash or reinvested). Already part of gain. */
  dividends: number;
  /** Interest from money-market sweep funds like SPAXX. Already part of gain. */
  interest: number;
}

export interface TickerReturn extends Window {
  ticker: string;
  accountId: string | null;
  accountName: string | null;
  open: boolean;
  units: number;
  value: number | null;
  invested: number;
  proceeds: number;
  dividends: number;
  gain: number | null;
  /**
   * Units held today minus units the recorded purchases add up to, when that
   * difference is material. Usually a stock split (brokers record older buys
   * in pre-split units). Rarely it means shares arrived without a purchase,
   * which would overstate the return. Zero when negligible or the position is closed.
   */
  unreconciledUnits: number;
}

export interface CombinedTickerReturn extends TickerReturn {
  byAccount: TickerReturn[];
}

export interface ReturnsResult {
  asOf: string;
  portfolio: AccountReturn;
  accounts: AccountReturn[];
  open: CombinedTickerReturn[];
  closed: CombinedTickerReturn[];
}

function windowOf(flows: Flow[], terminal: number | null, asOf: Date): Window {
  const times = flows.map((f) => f.when.getTime());
  const first = times.length ? new Date(Math.min(...times)) : null;
  const last = times.length ? new Date(Math.max(...times)) : null;
  // A closed position's holding period ends when it was sold, not today.
  const closed = terminal !== null && terminal <= 0;
  const end = closed && last ? last : asOf;
  const years = first ? Math.max(0, (end.getTime() - first.getTime()) / YEAR_MS) : 0;
  const all =
    terminal !== null && terminal > 0
      ? [...flows, { amount: terminal, when: asOf }]
      : flows;

  return {
    xirr: terminal === null ? null : xirr(all),
    since: first ? first.toISOString().slice(0, 10) : null,
    until: closed && last ? last.toISOString().slice(0, 10) : null,
    years,
    shortHistory: years < 1,
  };
}

const sumOrNull = (values: (number | null)[]): number | null =>
  values.some((v) => v === null)
    ? null
    : values.reduce<number>((s, v) => s + (v as number), 0);

/**
 * Account return: external deposits/withdrawals plus current value. Trades,
 * dividends and sweeps inside the account are not cash flows to the investor.
 */
function accountFlows(a: AccountInput) {
  const flows: Flow[] = [];
  let contributed = 0;
  let withdrawn = 0;
  for (const act of a.activities) {
    if (act.amount === null) continue;
    const when = new Date(act.date);
    if (act.type === "CONTRIBUTION") {
      contributed += Math.abs(act.amount);
      flows.push({ amount: -Math.abs(act.amount), when });
    } else if (act.type === "WITHDRAWAL") {
      withdrawn += Math.abs(act.amount);
      flows.push({ amount: Math.abs(act.amount), when });
    }
  }
  return { flows, contributed, withdrawn };
}

function accountIncome(a: AccountInput) {
  let dividends = 0;
  let interest = 0;
  for (const act of a.activities) {
    if (act.type !== "DIVIDEND" || act.amount === null) continue;
    if (act.ticker && isCashLikeTicker(act.ticker)) interest += act.amount;
    else dividends += act.amount;
  }
  return { dividends, interest };
}

function accountReturn(a: AccountInput, asOf: Date): AccountReturn {
  const { flows, contributed, withdrawn } = accountFlows(a);
  return {
    id: a.id,
    name: a.name,
    value: a.totalValue,
    contributed,
    withdrawn,
    gain: a.totalValue === null ? null : a.totalValue + withdrawn - contributed,
    ...accountIncome(a),
    ...windowOf(flows, a.totalValue, asOf),
  };
}

interface TickerAcc {
  flows: Flow[];
  netUnits: number;
  invested: number;
  proceeds: number;
  dividends: number;
}

/** Per-ticker flows and the Return, keeping raw flows so accounts can be pooled. */
function tickerReturnsFor(a: AccountInput, asOf: Date) {
  const byTicker = new Map<string, TickerAcc>();
  const acc = (t: string) => {
    let v = byTicker.get(t);
    if (!v) byTicker.set(t, (v = { flows: [], netUnits: 0, invested: 0, proceeds: 0, dividends: 0 }));
    return v;
  };

  for (const act of a.activities) {
    const t = act.ticker;
    // Sweep funds and options aren't tracked here; options need contract multipliers.
    if (!t || act.isOption || isCashLikeTicker(t) || act.amount === null) continue;
    const when = new Date(act.date);

    if (act.type === "BUY" || act.type === "REI") {
      const v = acc(t);
      v.flows.push({ amount: -Math.abs(act.amount), when });
      v.invested += Math.abs(act.amount);
      v.netUnits += Math.abs(act.units ?? 0);
    } else if (act.type === "SELL") {
      const v = acc(t);
      v.flows.push({ amount: Math.abs(act.amount), when });
      v.proceeds += Math.abs(act.amount);
      v.netUnits -= Math.abs(act.units ?? 0);
    } else if (act.type === "DIVIDEND") {
      const v = acc(t);
      v.flows.push({ amount: act.amount, when });
      v.dividends += act.amount;
    }
  }

  const held = new Map(
    a.positions.filter((p) => !isCashLike(p)).map((p) => [p.ticker, p])
  );
  for (const t of held.keys()) acc(t); // held but no activity: shows as unreconciled

  const results: { raw: TickerAcc; ret: TickerReturn }[] = [];
  for (const [ticker, raw] of byTicker) {
    const pos = held.get(ticker);
    const currentUnits = pos?.units ?? 0;
    const open = currentUnits > UNIT_EPS;
    const price = pos?.price ?? null;
    // Value what is actually held. Cash flows are correct across splits; the
    // recorded unit counts are not (older buys are in pre-split units).
    const value = !open ? 0 : price !== null ? currentUnits * price : null;

    const gap = currentUnits - raw.netUnits;
    const material =
      open &&
      (price === null
        ? Math.abs(gap) > UNIT_EPS
        : Math.abs(gap) * price >= Math.max(10, 0.02 * (value ?? 0)));

    results.push({
      raw,
      ret: {
        ticker,
        accountId: a.id,
        accountName: a.name,
        open,
        units: currentUnits,
        value,
        invested: raw.invested,
        proceeds: raw.proceeds,
        dividends: raw.dividends,
        gain: value === null ? null : value + raw.proceeds + raw.dividends - raw.invested,
        unreconciledUnits: material ? gap : 0,
        ...windowOf(raw.flows, value, asOf),
      },
    });
  }
  return results;
}

export function computeReturns(
  accounts: AccountInput[],
  asOf: Date = new Date()
): ReturnsResult {
  const accountReturns = accounts.map((a) => accountReturn(a, asOf));

  const pooled = accounts.flatMap((a) => accountFlows(a).flows);
  const portfolioValue = sumOrNull(accounts.map((a) => a.totalValue));
  const contributed = accountReturns.reduce((s, r) => s + r.contributed, 0);
  const withdrawn = accountReturns.reduce((s, r) => s + r.withdrawn, 0);
  const portfolio: AccountReturn = {
    id: "all",
    name: "All accounts",
    value: portfolioValue,
    contributed,
    withdrawn,
    gain: portfolioValue === null ? null : portfolioValue + withdrawn - contributed,
    dividends: accountReturns.reduce((s, r) => s + r.dividends, 0),
    interest: accountReturns.reduce((s, r) => s + r.interest, 0),
    ...windowOf(pooled, portfolioValue, asOf),
  };

  // Pool the same ticker across accounts.
  const grouped = new Map<string, { raw: TickerAcc; ret: TickerReturn }[]>();
  for (const a of accounts) {
    for (const r of tickerReturnsFor(a, asOf)) {
      const list = grouped.get(r.ret.ticker) ?? [];
      list.push(r);
      grouped.set(r.ret.ticker, list);
    }
  }

  const combined: CombinedTickerReturn[] = [...grouped.entries()].map(([ticker, parts]) => {
    const value = sumOrNull(parts.map((p) => p.ret.value));
    const invested = parts.reduce((s, p) => s + p.raw.invested, 0);
    const proceeds = parts.reduce((s, p) => s + p.raw.proceeds, 0);
    const dividends = parts.reduce((s, p) => s + p.raw.dividends, 0);
    return {
      ticker,
      accountId: null,
      accountName: null,
      open: parts.some((p) => p.ret.open),
      units: parts.reduce((s, p) => s + p.ret.units, 0),
      value,
      invested,
      proceeds,
      dividends,
      gain: value === null ? null : value + proceeds + dividends - invested,
      unreconciledUnits: parts.reduce((s, p) => s + p.ret.unreconciledUnits, 0),
      ...windowOf(parts.flatMap((p) => p.raw.flows), value, asOf),
      byAccount: parts
        .map((p) => p.ret)
        .sort((x, y) => (y.value ?? 0) - (x.value ?? 0)),
    };
  });

  return {
    asOf: asOf.toISOString(),
    portfolio,
    accounts: accountReturns.sort((x, y) => (y.value ?? 0) - (x.value ?? 0)),
    open: combined
      .filter((c) => c.open)
      .sort((x, y) => (y.value ?? -1) - (x.value ?? -1)),
    closed: combined
      .filter((c) => !c.open)
      .sort((x, y) => (y.gain ?? -Infinity) - (x.gain ?? -Infinity)),
  };
}
