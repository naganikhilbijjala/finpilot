"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-renders the server page after a pause, for reports still being built. */
export function AutoRefresh({ seconds = 2 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => router.refresh(), seconds * 1000);
    return () => clearTimeout(t);
  }, [router, seconds]);
  return null;
}
