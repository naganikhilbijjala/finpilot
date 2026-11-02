import { categoryColor } from "@/components/charts/theme";
import type { BreakdownSlice } from "@/lib/exposure/classify";
import { formatMoney } from "@/lib/utils/format";

const MUTED = new Set(["Unclassified", "Non-US, sector not reported", "Unknown", "Funds not split", "Derivatives & other"]);
/** Slices below this percent are folded into the "more" line rather than drawn as empty bars. */
const MIN_PCT = 0.05;
const MUTED_COLOR = "#cbd5e1";

/** Ranked horizontal bars: label, share, value and the biggest names inside. */
export function BreakdownBars({
  slices,
  currency,
  limit = 12,
}: {
  slices: BreakdownSlice[];
  currency: string | null;
  limit?: number;
}) {
  const shown = slices.filter((s) => s.pct >= MIN_PCT).slice(0, limit);
  const rest = slices.filter((s) => !shown.includes(s));
  const restPct = rest.reduce((sum, s) => sum + s.pct, 0);
  const max = Math.max(...shown.map((s) => s.pct), 1);
  let colorIndex = 0;

  return (
    <ul className="space-y-3.5">
      {shown.map((s) => {
        const color = MUTED.has(s.key) ? MUTED_COLOR : categoryColor(colorIndex++);
        return (
          <li key={s.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-medium text-gray-900">{s.label}</span>
              <span className="num shrink-0 text-gray-500">
                <span className="font-semibold text-gray-900">{s.pct.toFixed(1)}%</span>
                <span className="ml-2 hidden sm:inline">{formatMoney(s.value, currency).replace(/\.\d+$/, "")}</span>
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full" style={{ width: `${(s.pct / max) * 100}%`, background: color }} />
            </div>
            {s.top.length > 0 && (
              <p className="num mt-1 truncate text-xs text-gray-500">
                {s.top.map((t) => `${t.label} ${t.pct.toFixed(1)}%`).join(" · ")}
              </p>
            )}
          </li>
        );
      })}
      {rest.length > 0 && (
        <li className="text-xs text-gray-500">
          + {rest.length} more
          {restPct >= MIN_PCT && `, ${restPct.toFixed(1)}% combined`}
        </li>
      )}
    </ul>
  );
}
