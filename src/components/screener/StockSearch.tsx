"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { SearchIcon } from "@/components/ui/Icons";
import { looksLikeTicker, normalizeSymbol, searchStocks } from "@/lib/screener/symbols";
import { useUniverse } from "./UniverseProvider";

/** Search S&P 500 stocks by ticker or name. Results list inline so it works inside the scrolling sidebar. */
export function StockSearch({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const listId = useId();
  const universe = useUniverse();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const results = useMemo(() => searchStocks(query, 6, universe), [query, universe]);
  const searching = query.trim().length > 0;
  // Offer to add a ticker that isn't already an exact match in the universe.
  const candidate = normalizeSymbol(query);
  const canAdd =
    searching && looksLikeTicker(query) && !results.some((c) => c.symbol === candidate);

  function go(symbol: string) {
    setQuery("");
    setActive(0);
    router.push(`/screener/${symbol}`);
  }

  async function add() {
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/screener/stocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: candidate }),
      });
      const body = await res.json();
      if (!res.ok) {
        setAddError(body.message ?? "Couldn't add that stock");
        return;
      }
      go(body.symbol);
      // Refresh so the sidebar's ticker list includes the new stock.
      router.refresh();
    } catch {
      setAddError("Couldn't add that stock");
    } finally {
      setAdding(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && results.length) {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp" && results.length) {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active].symbol);
    } else if (e.key === "Enter" && canAdd && !adding) {
      e.preventDefault();
      add();
    } else if (e.key === "Escape") {
      setQuery("");
    }
  }

  return (
    <div>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setAddError(null);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search or add a stock (e.g. SOFI)"
          aria-label="Search stocks"
          role="combobox"
          aria-expanded={searching}
          aria-controls={listId}
          aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
          autoComplete="off"
          className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
      </div>

      {searching && (
        <ul id={listId} role="listbox" className="mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card">
          {results.length === 0 && !canAdd ? (
            <li className="px-3 py-2 text-xs text-gray-500">No match in your stocks.</li>
          ) : (
            results.map((c, i) => (
              <li
                key={c.symbol}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
              >
                <button
                  type="button"
                  onClick={() => go(c.symbol)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-baseline gap-2 px-3 py-2 text-left text-sm ${
                    i === active ? "bg-primary-50" : ""
                  }`}
                >
                  <span className="w-14 shrink-0 font-semibold text-gray-900">{c.symbol}</span>
                  <span className="truncate text-gray-600">{c.name}</span>
                </button>
              </li>
            ))
          )}
          {canAdd && (
            <li className="border-t border-gray-100">
              <button
                type="button"
                onClick={add}
                disabled={adding}
                className="flex w-full items-baseline gap-2 px-3 py-2 text-left text-sm text-primary-700 hover:bg-primary-50 disabled:opacity-60"
              >
                <span className="font-semibold">{adding ? "Adding…" : `Add ${candidate}`}</span>
                {!adding && <span className="text-xs text-gray-500">to my stocks</span>}
              </button>
              {addError && <p role="alert" className="px-3 pb-2 text-xs text-rose-600">{addError}</p>}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
