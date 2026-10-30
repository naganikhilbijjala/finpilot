"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { SearchIcon } from "@/components/ui/Icons";
import { searchStocks } from "@/lib/screener/symbols";

/** Search S&P 500 stocks by ticker or name. Results list inline so it works inside the scrolling sidebar. */
export function StockSearch({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const results = useMemo(() => searchStocks(query, 6), [query]);
  const searching = query.trim().length > 0;

  function go(symbol: string) {
    setQuery("");
    setActive(0);
    router.push(`/screener/${symbol}`);
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
          }}
          onKeyDown={onKeyDown}
          placeholder="Search stocks (e.g. AAPL, Apple)"
          aria-label="Search S&P 500 stocks"
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
          {results.length === 0 ? (
            <li className="px-3 py-2 text-xs text-gray-500">
              No S&amp;P 500 match. Only S&amp;P 500 stocks have fundamentals pages.
            </li>
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
        </ul>
      )}
    </div>
  );
}
