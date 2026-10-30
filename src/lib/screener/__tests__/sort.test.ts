import { describe, expect, it } from "vitest";
import { compareBy } from "@/components/screener/ScreenerTable";
import type { Fundamentals } from "../types";

const s = (symbol: string, pe: number | null): Fundamentals => ({ symbol, pe } as Fundamentals);
const sorted = (rows: Fundamentals[], dir: "asc" | "desc") =>
  [...rows].sort(compareBy((r) => r.pe, dir)).map((r) => r.symbol);

describe("compareBy", () => {
  const rows = [s("C", 20), s("A", null), s("B", 10), s("D", 20)];

  it("sorts ascending with empty values last", () => {
    expect(sorted(rows, "asc")).toEqual(["B", "C", "D", "A"]);
  });

  it("sorts descending with empty values still last", () => {
    expect(sorted(rows, "desc")).toEqual(["C", "D", "B", "A"]);
  });

  it("breaks ties alphabetically and sorts text columns", () => {
    expect(sorted([s("Z", 5), s("M", 5)], "asc")).toEqual(["M", "Z"]);
    const names = [s("B", 1), s("A", 1)];
    expect(names.sort(compareBy((r) => r.symbol, "desc")).map((r) => r.symbol)).toEqual(["B", "A"]);
  });
});
