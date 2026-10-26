/** Formats with the currency code the API reported; plain number if unknown. */
export function formatMoney(
  value: number | null | undefined,
  currency?: string | null
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  try {
    return new Intl.NumberFormat("en-US", {
      style: currency ? "currency" : "decimal",
      currency: currency || undefined,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return value.toFixed(2);
  }
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}
