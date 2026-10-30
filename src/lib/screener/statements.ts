import { REVENUE_TAGS, seriesFromTags, type UsGaap } from "./revenue";

// Consolidated income-statement lines from SEC XBRL (non-dimensional facts).
const TAGS = {
  revenue: REVENUE_TAGS,
  costOfRevenue: ["CostOfRevenue", "CostOfGoodsAndServicesSold", "CostOfGoodsSold", "CostOfServices"],
  grossProfit: ["GrossProfit"],
  rd: ["ResearchAndDevelopmentExpense", "ResearchAndDevelopmentExpenseExcludingAcquiredInProcessCost"],
  sga: ["SellingGeneralAndAdministrativeExpense"],
  selling: ["SellingAndMarketingExpense"],
  ga: ["GeneralAndAdministrativeExpense"],
  operatingIncome: ["OperatingIncomeLoss"],
  // Banks, insurers and some energy companies report no operating income line.
  pretax: [
    "IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest",
    "IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments",
  ],
  netIncome: ["NetIncomeLoss", "ProfitLoss"],
};

export interface IncomeStatement {
  /** Fiscal year end, ISO date. */
  fiscalYearEnd: string;
  revenue: number;
  /** Null for companies that don't report cost of revenue (banks, insurers). */
  costOfRevenue: number | null;
  grossProfit: number | null;
  rd: number | null;
  sga: number | null;
  /** Operating expenses beyond R&D and SG&A, or all of them when no split is reported. */
  otherOpex: number | null;
  /** Operating income, or pre-tax income where the company doesn't report one. */
  operatingIncome: number;
  profitBasis: "operating" | "pretax";
  netIncome: number;
}

export interface HistoryPoint {
  end: string;
  revenue: number;
  grossProfit: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
}

export interface Statements {
  latest: IncomeStatement | null;
  history: HistoryPoint[];
}

const DAY = 86_400_000;

/** Value for the fiscal year ending near `end` (fiscal-year ends can drift a few days). */
function at(series: Map<string, number> | null, end: string): number | null {
  if (!series) return null;
  const exact = series.get(end);
  if (exact !== undefined) return exact;
  for (const [e, v] of series) {
    if (Math.abs(Date.parse(e) - Date.parse(end)) / DAY < 40) return v;
  }
  return null;
}

export function extractStatements(usGaap: UsGaap, years = 10): Statements {
  const s = Object.fromEntries(
    Object.entries(TAGS).map(([k, tags]) => [k, seriesFromTags(usGaap, tags)])
  ) as Record<keyof typeof TAGS, Map<string, number> | null>;

  if (!s.revenue) return { latest: null, history: [] };
  const ends = [...s.revenue.keys()].sort();

  const grossProfitAt = (end: string, revenue: number) => {
    const gp = at(s.grossProfit, end);
    if (gp !== null) return gp;
    const cost = at(s.costOfRevenue, end);
    return cost !== null ? revenue - cost : null;
  };

  const operatingAt = (end: string) => {
    const op = at(s.operatingIncome, end);
    if (op !== null) return { value: op, basis: "operating" as const };
    return { value: at(s.pretax, end), basis: "pretax" as const };
  };

  const history: HistoryPoint[] = ends.slice(-(years + 1)).map((end) => {
    const revenue = s.revenue!.get(end)!;
    return {
      end,
      revenue,
      grossProfit: grossProfitAt(end, revenue),
      operatingIncome: operatingAt(end).value,
      netIncome: at(s.netIncome, end),
    };
  });

  const end = ends.at(-1)!;
  const revenue = s.revenue.get(end)!;
  const { value: operatingIncome, basis: profitBasis } = operatingAt(end);
  const netIncome = at(s.netIncome, end);
  if (operatingIncome === null || netIncome === null) return { latest: null, history };

  // Net income is roughly pre-tax income less tax. If it is far larger, the
  // pre-tax figure is probably a partial tag (e.g. one region), so show nothing.
  if (profitBasis === "pretax" && netIncome > Math.abs(operatingIncome) * 2) {
    return { latest: null, history };
  }

  const grossProfit = grossProfitAt(end, revenue);
  const rd = at(s.rd, end);
  let sga = at(s.sga, end);
  if (sga === null) {
    const parts = [at(s.selling, end), at(s.ga, end)].filter((v): v is number => v !== null);
    sga = parts.length ? parts.reduce((a, b) => a + b, 0) : null;
  }

  // Total operating expenses come from the gross-to-operating gap, so the
  // pieces always reconcile. If R&D + SG&A overshoot it, drop the split.
  let otherOpex: number | null = null;
  let rdOut = rd;
  let sgaOut = sga;
  if (grossProfit !== null) {
    const totalOpex = grossProfit - operatingIncome;
    const named = (rd ?? 0) + (sga ?? 0);
    if (totalOpex > 0 && named > totalOpex * 1.001) {
      rdOut = null;
      sgaOut = null;
      otherOpex = totalOpex;
    } else {
      otherOpex = Math.max(0, totalOpex - named);
    }
  }

  return {
    latest: {
      fiscalYearEnd: end,
      revenue,
      costOfRevenue: grossProfit !== null ? revenue - grossProfit : null,
      grossProfit,
      rd: rdOut,
      sga: sgaOut,
      otherOpex,
      operatingIncome,
      profitBasis,
      netIncome,
    },
    history,
  };
}
