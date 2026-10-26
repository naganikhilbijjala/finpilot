export interface Flow {
  /** Investor's perspective: money put in is negative, money received positive. */
  amount: number;
  when: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;
// Rates beyond this (100,000%/yr) come from very short windows and mean nothing.
const MAX_RATE = 1000;

/**
 * Annualized money-weighted return (Excel's XIRR: actual days / 365).
 * Solved by bracketing + bisection, which converges whenever a root exists,
 * unlike Newton's method on awkward cash-flow shapes.
 * Returns null if there is no sign change or the rate is not meaningful.
 */
export function xirr(flows: Flow[]): number | null {
  const valid = flows.filter(
    (f) => Number.isFinite(f.amount) && f.amount !== 0 && !isNaN(f.when.getTime())
  );
  if (!valid.some((f) => f.amount > 0) || !valid.some((f) => f.amount < 0)) {
    return null;
  }

  const t0 = Math.min(...valid.map((f) => f.when.getTime()));
  const terms = valid.map((f) => ({
    amount: f.amount,
    years: (f.when.getTime() - t0) / DAY_MS / 365,
  }));

  const npv = (rate: number) =>
    terms.reduce((s, t) => s + t.amount * Math.pow(1 + rate, -t.years), 0);

  let lo = -0.999999;
  let hi = 1;
  let fLo = npv(lo);
  let fHi = npv(hi);
  while (fLo * fHi > 0 && hi < MAX_RATE * 10) {
    hi *= 4;
    fHi = npv(hi);
  }
  if (!Number.isFinite(fLo) || !Number.isFinite(fHi) || fLo * fHi > 0) return null;

  for (let i = 0; i < 300; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (fMid === 0 || (hi - lo) / 2 < 1e-12) {
      lo = hi = mid;
      break;
    }
    if (fLo * fMid < 0) {
      hi = mid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }

  const rate = (lo + hi) / 2;
  return Number.isFinite(rate) && Math.abs(rate) <= MAX_RATE ? rate : null;
}
