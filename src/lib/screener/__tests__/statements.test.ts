import { describe, expect, it } from "vitest";
import { buildIncomeSankey } from "../sankey";
import { extractStatements } from "../statements";
import type { FactEntry, UsGaap } from "../revenue";
import type { IncomeStatement } from "../statements";

const fy = (year: number, val: number): FactEntry => ({
  start: `${year}-01-01`, end: `${year}-12-31`, val, filed: `${year + 1}-02-01`, form: "10-K",
});
const tag = (entries: FactEntry[]) => ({ units: { USD: entries } });

// A company shaped like Apple's FY2025 (rounded, in $B).
const apple: UsGaap = {
  Revenues: tag([fy(2024, 391), fy(2025, 416)]),
  GrossProfit: tag([fy(2024, 180), fy(2025, 195)]),
  ResearchAndDevelopmentExpense: tag([fy(2024, 31), fy(2025, 34.5)]),
  SellingGeneralAndAdministrativeExpense: tag([fy(2024, 26), fy(2025, 27.6)]),
  OperatingIncomeLoss: tag([fy(2024, 123), fy(2025, 133)]),
  NetIncomeLoss: tag([fy(2024, 94), fy(2025, 112)]),
};

const flows = (data: NonNullable<ReturnType<typeof buildIncomeSankey>>) => {
  const inflow: Record<string, number> = {};
  const outflow: Record<string, number> = {};
  for (const l of data.links) {
    outflow[l.source] = (outflow[l.source] ?? 0) + l.value;
    inflow[l.target] = (inflow[l.target] ?? 0) + l.value;
  }
  return { inflow, outflow };
};

describe("extractStatements", () => {
  const { latest, history } = extractStatements(apple);

  it("reads the latest fiscal year", () => {
    expect(latest).toMatchObject({ fiscalYearEnd: "2025-12-31", revenue: 416, grossProfit: 195, operatingIncome: 133, netIncome: 112 });
    expect(latest!.costOfRevenue).toBe(221);
  });

  it("derives other operating expenses from the gross-to-operating gap", () => {
    // 195 - 133 = 62 opex; 34.5 + 27.6 = 62.1 > 62 * 1.001, so the split is dropped.
    expect(latest!.rd).toBeNull();
    expect(latest!.otherOpex).toBeCloseTo(62);
  });

  it("returns history oldest to newest", () => {
    expect(history.map((h) => h.end)).toEqual(["2024-12-31", "2025-12-31"]);
    expect(history[1].netIncome).toBe(112);
  });

  it("derives gross profit from cost of revenue when not reported directly", () => {
    const g: UsGaap = { ...apple, GrossProfit: undefined, CostOfRevenue: tag([fy(2025, 221)]) };
    expect(extractStatements(g).latest!.grossProfit).toBe(195);
  });

  it("falls back to pre-tax income when there is no operating income line", () => {
    const bank: UsGaap = {
      Revenues: tag([fy(2025, 180)]),
      IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest: tag([fy(2025, 70)]),
      NetIncomeLoss: tag([fy(2025, 57)]),
    };
    const { latest } = extractStatements(bank);
    expect(latest).toMatchObject({ operatingIncome: 70, profitBasis: "pretax", grossProfit: null });
    expect(buildIncomeSankey(latest!)!.nodes.find((n) => n.id === "operating")!.label).toBe("Pre-tax profit");
  });

  it("rejects a pre-tax figure that net income dwarfs (partial tag)", () => {
    const g: UsGaap = {
      Revenues: tag([fy(2025, 330)]),
      IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest: tag([fy(2025, 11)]),
      NetIncomeLoss: tag([fy(2025, 29)]),
    };
    expect(extractStatements(g).latest).toBeNull();
  });

  it("is empty without revenue, and has no latest without operating income", () => {
    expect(extractStatements({})).toEqual({ latest: null, history: [] });
    expect(extractStatements({ Revenues: tag([fy(2025, 100)]) }).latest).toBeNull();
  });
});

describe("buildIncomeSankey", () => {
  const is: IncomeStatement = {
    fiscalYearEnd: "2025-12-31", revenue: 1000, costOfRevenue: 600, grossProfit: 400,
    rd: 100, sga: 80, otherOpex: 20, operatingIncome: 200, profitBasis: "operating", netIncome: 150,
  };

  it("conserves flow at every intermediate node", () => {
    const { inflow, outflow } = flows(buildIncomeSankey(is)!);
    for (const id of ["gross", "operating"]) expect(outflow[id]).toBeCloseTo(inflow[id]);
    expect(outflow.revenue).toBe(1000);
  });

  it("splits operating profit into net income and tax & other", () => {
    const d = buildIncomeSankey(is)!;
    expect(d.nodes.find((n) => n.id === "net")!.value).toBe(150);
    expect(d.nodes.find((n) => n.id === "tax")!.value).toBe(50);
  });

  it("adds a gains node when net income beats operating profit", () => {
    const d = buildIncomeSankey({ ...is, netIncome: 230 })!;
    const { inflow, outflow } = flows(d);
    expect(d.nodes.find((n) => n.id === "gains")!.value).toBe(30);
    expect(inflow.net).toBe(230);
    expect(outflow.operating).toBeCloseTo(200);
  });

  it("collapses costs for companies without cost of revenue", () => {
    const d = buildIncomeSankey({ ...is, costOfRevenue: null, grossProfit: null, rd: null, sga: null, otherOpex: null })!;
    expect(d.nodes.find((n) => n.id === "cost")!.value).toBe(800);
    expect(d.nodes.some((n) => n.id === "gross")).toBe(false);
  });

  it("is null for operating losses", () => {
    expect(buildIncomeSankey({ ...is, operatingIncome: -5 })).toBeNull();
  });

  it("keeps all flow when net income is a loss", () => {
    const d = buildIncomeSankey({ ...is, netIncome: -10 })!;
    expect(d.nodes.some((n) => n.id === "net")).toBe(false);
    expect(flows(d).inflow.tax).toBe(200);
  });
});
