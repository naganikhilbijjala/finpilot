import type { PortfolioTransaction } from "@/lib/types";

/**
 * Cash flow entry for XIRR calculation
 */
export interface CashFlow {
  amount: number;
  when: Date;
}

/**
 * Calculate XIRR using Newton-Raphson method
 * Internal implementation - no external dependencies
 */
function calculateXIRRInternal(cashFlows: CashFlow[]): number | null {
  if (cashFlows.length < 2) {
    return null;
  }

  // Sort cash flows by date
  const sortedFlows = [...cashFlows].sort(
    (a, b) => a.when.getTime() - b.when.getTime()
  );

  const firstDate = sortedFlows[0].when;

  // Convert dates to years from first date
  const flows = sortedFlows.map((cf) => ({
    amount: cf.amount,
    years:
      (cf.when.getTime() - firstDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
  }));

  // Newton-Raphson method
  let guess = 0.1; // Initial guess: 10%
  const maxIterations = 100;
  const tolerance = 0.000001;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let dnpv = 0;

    for (const flow of flows) {
      const factor = Math.pow(1 + guess, flow.years);
      npv += flow.amount / factor;
      dnpv -= flow.amount * flow.years / (factor * (1 + guess));
    }

    const newGuess = guess - npv / dnpv;

    if (Math.abs(newGuess - guess) < tolerance) {
      return newGuess;
    }

    guess = newGuess;

    // Prevent divergence
    if (!isFinite(guess) || isNaN(guess)) {
      return null;
    }
  }

  // Did not converge
  return null;
}

/**
 * Calculate XIRR (Extended Internal Rate of Return) for a series of transactions
 * XIRR is ideal for SIP-style investments with multiple transactions at different times
 *
 * @param transactions - Array of portfolio transactions
 * @param currentValue - Current total value of the investment
 * @returns XIRR as a decimal (e.g., 0.15 for 15%) or null if calculation fails
 */
export function calculateXIRR(
  transactions: PortfolioTransaction[],
  currentValue: number
): number | null {
  if (!transactions || transactions.length === 0) {
    return null;
  }

  try {
    // Create cash flow array
    const cashFlows: CashFlow[] = transactions.map((txn) => ({
      amount: -(txn.quantity * txn.price), // Negative for outflows (purchases)
      when: new Date(txn.purchased_at),
    }));

    // Add current value as positive inflow (hypothetical sale today)
    cashFlows.push({
      amount: currentValue,
      when: new Date(),
    });

    // Calculate XIRR using Newton-Raphson method
    const xirrResult = calculateXIRRInternal(cashFlows);

    // Validate result
    if (
      xirrResult === null ||
      typeof xirrResult !== "number" ||
      isNaN(xirrResult) ||
      !isFinite(xirrResult)
    ) {
      console.warn("XIRR calculation returned invalid result:", xirrResult);
      return null;
    }

    return xirrResult;
  } catch (error) {
    console.error("Error calculating XIRR:", error);
    return null;
  }
}

/**
 * Calculate XIRR for a single stock across multiple purchases
 *
 * @param transactions - Array of transactions for a specific stock
 * @param currentPrice - Current price of the stock
 * @returns XIRR as a decimal or null
 */
export function calculateStockXIRR(
  transactions: PortfolioTransaction[],
  currentPrice: number
): number | null {
  if (!transactions || transactions.length === 0) {
    return null;
  }

  // Calculate total quantity held
  const totalQuantity = transactions.reduce(
    (sum, txn) => sum + txn.quantity,
    0
  );

  // Calculate current value
  const currentValue = totalQuantity * currentPrice;

  return calculateXIRR(transactions, currentValue);
}

/**
 * Format XIRR as percentage string
 * @param xirr - XIRR value as decimal
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted percentage string (e.g., "15.23%") or "N/A"
 */
export function formatXIRR(
  xirr: number | null,
  decimals: number = 2
): string {
  if (xirr === null || isNaN(xirr) || !isFinite(xirr)) {
    return "N/A";
  }
  return `${(xirr * 100).toFixed(decimals)}%`;
}

/**
 * Determine whether to use CAGR or XIRR based on number of transactions
 * @param transactionCount - Number of transactions
 * @returns "CAGR" for single transaction, "XIRR" for multiple
 */
export function getReturnMetricType(transactionCount: number): "CAGR" | "XIRR" {
  return transactionCount === 1 ? "CAGR" : "XIRR";
}
