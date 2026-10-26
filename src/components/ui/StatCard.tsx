import React from "react";

type Tone = "neutral" | "positive" | "negative";

const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-gray-500",
  positive: "text-emerald-600",
  negative: "text-rose-600",
};

export function StatCard({
  label,
  value,
  sub,
  tone = "neutral",
  icon,
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
  icon?: React.ReactNode;
  /** Highlighted card used for the headline figure. */
  accent?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 shadow-card ${
        accent
          ? "border-transparent bg-gradient-to-br from-primary-600 to-primary-800 text-white"
          : "border-gray-200/80 bg-white"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-sm font-medium ${accent ? "text-primary-100" : "text-gray-500"}`}
        >
          {label}
        </span>
        {icon && (
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              accent ? "bg-white/15 text-white" : "bg-primary-50 text-primary-600"
            }`}
          >
            {icon}
          </span>
        )}
      </div>
      <div
        className={`num mt-2 break-words text-xl font-semibold tracking-tight sm:text-[1.75rem] ${
          accent ? "text-white" : tone === "neutral" ? "text-gray-900" : TONE_TEXT[tone]
        }`}
      >
        {value}
      </div>
      {sub && (
        <div
          className={`num mt-1 text-sm ${
            accent ? "text-primary-100" : TONE_TEXT[tone]
          }`}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
