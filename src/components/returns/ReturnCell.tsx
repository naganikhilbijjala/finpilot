import { formatPercent } from "@/lib/utils/format";

export function ReturnCell({
  value,
  shortHistory,
  unreconciledUnits = 0,
}: {
  value: number | null;
  shortHistory: boolean;
  unreconciledUnits?: number;
}) {
  const color =
    value === null ? "text-gray-500" : value >= 0 ? "text-emerald-600" : "text-rose-600";
  return (
    <span className={color}>
      {value === null ? "—" : formatPercent(value * 100)}
      {value !== null && shortHistory && (
        <span
          className="ml-1 rounded bg-gray-100 px-1 text-[10px] text-gray-600"
          title="Under a year of history: the annualized figure is an extrapolation and can swing widely."
        >
          &lt;1y
        </span>
      )}
      {Math.abs(unreconciledUnits) > 1e-4 && (
        <span
          className="ml-1 rounded bg-amber-100 px-1 text-[10px] text-amber-800"
          title={`Your holding differs from the recorded purchases by ${unreconciledUnits.toFixed(4)} units. Usually a stock split (older buys are recorded in pre-split units), in which case the return is correct. If shares arrived without a purchase, it is overstated.`}
        >
          units differ
        </span>
      )}
    </span>
  );
}
