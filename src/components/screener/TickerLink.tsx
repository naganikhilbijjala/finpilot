"use client";

import Link from "next/link";
import type { MouseEventHandler } from "react";
import { findConstituent } from "@/lib/screener/symbols";
import { useUniverse } from "./UniverseProvider";

/**
 * A ticker that opens its fundamentals page when we have one (any stock in
 * the screener universe), and plain text otherwise (ETFs, unknown tickers) so
 * no link dead-ends.
 */
export function TickerLink({
  ticker,
  className = "",
  onClick,
}: {
  ticker: string;
  className?: string;
  /** For use inside clickable rows, e.g. `(e) => e.stopPropagation()`. */
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}) {
  const stock = findConstituent(ticker, useUniverse());
  if (!stock) return <span className={className}>{ticker}</span>;

  return (
    <Link
      href={`/screener/${stock.symbol}`}
      onClick={onClick}
      title={`${stock.name}: view fundamentals`}
      className={`underline-offset-2 hover:text-primary-600 hover:underline ${className}`}
    >
      {ticker}
    </Link>
  );
}
