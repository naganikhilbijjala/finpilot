import type { IncomeStatement } from "./statements";

export type NodeKind = "revenue" | "cost" | "profit";

export interface SankeyNode {
  id: string;
  label: string;
  kind: NodeKind;
  /** Column, left to right. */
  layer: number;
  /** Dollar value shown in the label. */
  value: number;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

/**
 * Revenue -> (cost of revenue | gross profit) -> (R&D | SG&A | other | operating
 * profit) -> (tax & other | net income). Null when the statement can't be
 * drawn as non-negative flows (an operating loss).
 */
export function buildIncomeSankey(is: IncomeStatement): SankeyData | null {
  const { revenue, grossProfit, operatingIncome, netIncome } = is;
  if (revenue <= 0 || operatingIncome <= 0) return null;

  const profitLabel = is.profitBasis === "pretax" ? "Pre-tax profit" : "Operating profit";
  const nodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];
  const node = (id: string, label: string, kind: NodeKind, layer: number, value: number) =>
    nodes.push({ id, label, kind, layer, value });
  const link = (source: string, target: string, value: number) => {
    if (value > 0) links.push({ source, target, value });
  };

  node("revenue", "Revenue", "revenue", 0, revenue);

  let opLayer: number;
  if (grossProfit !== null && grossProfit > 0) {
    node("cost", "Cost of revenue", "cost", 1, revenue - grossProfit);
    node("gross", "Gross profit", "profit", 1, grossProfit);
    link("revenue", "cost", revenue - grossProfit);
    link("revenue", "gross", grossProfit);

    const opex: [string, string, number | null][] = [
      ["rd", "R&D", is.rd],
      ["sga", "SG&A", is.sga],
      ["other", is.rd === null && is.sga === null ? "Operating expenses" : "Other expenses", is.otherOpex],
    ];
    for (const [id, label, v] of opex) {
      if (v !== null && v > 0) {
        node(id, label, "cost", 2, v);
        link("gross", id, v);
      }
    }
    opLayer = 2;
    node("operating", profitLabel, "profit", opLayer, operatingIncome);
    link("gross", "operating", operatingIncome);
  } else {
    // No cost of revenue reported (banks, insurers): one costs bucket.
    node("cost", "Costs & expenses", "cost", 1, revenue - operatingIncome);
    link("revenue", "cost", revenue - operatingIncome);
    opLayer = 1;
    node("operating", profitLabel, "profit", opLayer, operatingIncome);
    link("revenue", "operating", operatingIncome);
  }

  const belowOperating = operatingIncome - netIncome;
  if (netIncome > 0) {
    node("net", "Net income", "profit", opLayer + 1, netIncome);
    link("operating", "net", Math.min(operatingIncome, netIncome));
    if (belowOperating > 0) {
      node("tax", "Tax, interest & other", "cost", opLayer + 1, belowOperating);
      link("operating", "tax", belowOperating);
    } else if (belowOperating < 0) {
      // Net income beat operating profit (investment gains, tax benefit).
      node("gains", "Non-operating gains", "profit", opLayer, -belowOperating);
      link("gains", "net", -belowOperating);
    }
  } else {
    node("tax", "Tax, interest & other", "cost", opLayer + 1, operatingIncome);
    link("operating", "tax", operatingIncome);
  }

  return { nodes, links };
}
