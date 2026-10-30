"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Constituent } from "@/lib/screener/sp500";
import { PRESET_UNIVERSE } from "@/lib/screener/universe";

const UniverseContext = createContext<Constituent[]>(PRESET_UNIVERSE);

/** Built-in stocks plus any added by hand, for search and ticker links. */
export function UniverseProvider({ custom, children }: { custom: Constituent[]; children: ReactNode }) {
  const universe = useMemo(() => [...PRESET_UNIVERSE, ...custom], [custom]);
  return <UniverseContext.Provider value={universe}>{children}</UniverseContext.Provider>;
}

export const useUniverse = () => useContext(UniverseContext);
