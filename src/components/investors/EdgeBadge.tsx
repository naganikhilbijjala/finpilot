import { signedPct } from "./format";

/** Copied return vs the S&P 500, per year: green when ahead, red when behind. */
export function EdgeBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-gray-400">n/a</span>;
  const ahead = value >= 0;
  return (
    <span
      className={`num inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
        ahead ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
      }`}
    >
      {signedPct(value)}/yr
    </span>
  );
}
