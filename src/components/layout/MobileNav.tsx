"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CloseIcon, MenuIcon } from "@/components/ui/Icons";
import { Logo } from "./Logo";

/** Top bar plus slide-over drawer shown below the lg breakpoint. */
export function MobileNav({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close after navigating, and lock page scroll while the drawer is open.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200/80 bg-white/85 px-4 backdrop-blur">
        <Logo href="/dashboard" />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
        >
          <MenuIcon />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-elevated">
            <div className="flex h-14 items-center justify-between px-4">
              <Logo href="/dashboard" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-4">{children}</div>
          </div>
        </div>
      )}
    </div>
  );
}
