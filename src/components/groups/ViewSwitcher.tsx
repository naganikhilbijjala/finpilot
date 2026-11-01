"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { View } from "@/lib/groups/groups";

/** Pill switcher between account-group views; the choice lives in ?view= so it can be bookmarked. */
export function ViewSwitcher({ views, active }: { views: View[]; active: string }) {
  const pathname = usePathname();
  if (views.length < 2) return null;

  return (
    <nav
      aria-label="Accounts to show"
      className="flex min-w-0 max-w-full gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1"
    >
      {views.map((v) => {
        const on = v.key === active;
        return (
          <Link
            key={v.key}
            href={`${pathname}?view=${encodeURIComponent(v.key)}`}
            aria-current={on ? "page" : undefined}
            scroll={false}
            className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
              on ? "bg-white text-primary-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {v.kind === "managed" ? `Managed: ${v.label}` : v.label}
          </Link>
        );
      })}
    </nav>
  );
}
