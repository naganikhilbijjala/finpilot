import type { ReactNode } from "react";
import { ChartIcon, PercentIcon, ShieldIcon } from "@/components/ui/Icons";
import { Logo } from "@/components/layout/Logo";

const POINTS = [
  { icon: <ChartIcon className="h-5 w-5" />, text: "Every account in one live net-worth view" },
  { icon: <PercentIcon className="h-5 w-5" />, text: "CAGR, XIRR and time-weighted returns" },
  { icon: <ShieldIcon className="h-5 w-5" />, text: "Read-only brokerage access, your data stays yours" },
];

/** Two-column auth layout: brand panel on large screens, form always. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary-700 via-primary-800 to-gray-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary-400/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="relative [&_span]:text-white">
          <Logo />
        </div>
        <div className="relative max-w-md">
          <h2 className="text-balance text-4xl font-semibold leading-tight tracking-tight">
            See your whole portfolio, finally.
          </h2>
          <ul className="mt-8 space-y-4">
            {POINTS.map((p) => (
              <li key={p.text} className="flex items-center gap-3 text-primary-100">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                  {p.icon}
                </span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-primary-200">© {new Date().getFullYear()} FinScope</p>
      </div>

      <div className="flex flex-col justify-center px-4 py-10 sm:px-8">
        <div className="mx-auto mb-8 lg:hidden">
          <Logo />
        </div>
        {children}
      </div>
    </div>
  );
}
