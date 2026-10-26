import React from "react";
import { AlertIcon, InfoIcon } from "./Icons";

type Tone = "error" | "warning" | "info";

const TONES: Record<Tone, string> = {
  error: "border-red-200 bg-red-50 text-red-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-gray-200 bg-white text-gray-700",
};

export function Notice({
  tone = "info",
  children,
}: {
  tone?: Tone;
  children: React.ReactNode;
}) {
  const Glyph = tone === "info" ? InfoIcon : AlertIcon;
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${TONES[tone]}`}
    >
      <Glyph className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
