/**
 * Calculate Compound Annual Growth Rate (CAGR)
 * CAGR = (Ending Value / Beginning Value)^(1 / Number of Years) - 1
 *
 * @param beginningValue - Initial investment value
 * @param endingValue - Current/final value
 * @param years - Number of years invested
 * @returns CAGR as a decimal (e.g., 0.15 for 15%)
 */
export function calculateCAGR(
  beginningValue: number,
  endingValue: number,
  years: number
): number {
  if (beginningValue <= 0 || endingValue <= 0 || years <= 0) {
    throw new Error("All values must be positive for CAGR calculation");
  }

  const cagr = Math.pow(endingValue / beginningValue, 1 / years) - 1;
  return cagr;
}

/**
 * Calculate CAGR from purchase date to current date
 *
 * @param purchasePrice - Price at purchase
 * @param currentPrice - Current price
 * @param purchaseDate - Date of purchase (ISO string or Date)
 * @returns CAGR as a decimal (e.g., 0.15 for 15%)
 */
export function calculateCAGRFromDates(
  purchasePrice: number,
  currentPrice: number,
  purchaseDate: string | Date
): number {
  const purchase = new Date(purchaseDate);
  const now = new Date();

  // Calculate years difference
  const yearsDiff =
    (now.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

  if (yearsDiff < 0) {
    throw new Error("Purchase date cannot be in the future");
  }

  // If less than a day, return simple return instead of CAGR
  if (yearsDiff < 1 / 365) {
    return (currentPrice - purchasePrice) / purchasePrice;
  }

  return calculateCAGR(purchasePrice, currentPrice, yearsDiff);
}

/**
 * Format CAGR as percentage string
 * @param cagr - CAGR value as decimal
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted percentage string (e.g., "15.23%")
 */
export function formatCAGR(cagr: number, decimals: number = 2): string {
  return `${(cagr * 100).toFixed(decimals)}%`;
}
