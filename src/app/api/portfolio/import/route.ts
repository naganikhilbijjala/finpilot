import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { APIError } from "@/lib/types";

const MAX_ROWS = 5000;
const INSERT_CHUNK = 500;

const importSchema = z.object({
  rows: z
    .array(
      z.object({
        ticker: z
          .string()
          .trim()
          .toUpperCase()
          .regex(/^[A-Z][A-Z0-9.-]{0,9}$/),
        quantity: z.number().positive().finite(),
        price: z.number().positive().finite(),
        purchased_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
    )
    .min(1)
    .max(MAX_ROWS),
});

const keyOf = (
  ticker: string,
  date: string,
  quantity: number,
  price: number
) => `${ticker}|${date}|${quantity.toFixed(8)}|${price.toFixed(8)}`;

/**
 * POST /api/portfolio/import
 * Bulk-insert parsed broker rows, skipping ones already imported.
 *
 * Duplicates are matched as a multiset against existing transactions, so
 * re-importing the same file is a no-op, while two genuinely identical
 * fills on one day in a single file are both kept.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      const error: APIError = {
        error: "UNAUTHORIZED",
        message: "You must be logged in to import transactions",
      };
      return NextResponse.json(error, { status: 401 });
    }

    const parsed = importSchema.safeParse(await request.json());
    if (!parsed.success) {
      const error: APIError = {
        error: "BAD_REQUEST",
        message: `Invalid import payload (1-${MAX_ROWS} rows required)`,
        details: parsed.error.flatten(),
      };
      return NextResponse.json(error, { status: 400 });
    }
    const { rows } = parsed.data;

    // Count existing transactions per key (paged: PostgREST caps responses).
    const existing = new Map<string, number>();
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from("portfolio_transactions")
        .select("ticker, quantity, price, purchased_at")
        .eq("user_id", user.id)
        .order("id")
        .range(from, from + 999);
      if (error) throw error;
      for (const t of data ?? []) {
        const k = keyOf(
          t.ticker,
          String(t.purchased_at).slice(0, 10),
          Number(t.quantity),
          Number(t.price)
        );
        existing.set(k, (existing.get(k) ?? 0) + 1);
      }
      if (!data || data.length < 1000) break;
    }

    const toInsert = rows.filter((r) => {
      const k = keyOf(r.ticker, r.purchased_at, r.quantity, r.price);
      const n = existing.get(k) ?? 0;
      if (n > 0) {
        existing.set(k, n - 1);
        return false;
      }
      return true;
    });

    for (let i = 0; i < toInsert.length; i += INSERT_CHUNK) {
      const chunk = toInsert.slice(i, i + INSERT_CHUNK).map((r) => ({
        user_id: user.id,
        ...r,
      }));
      const { error } = await supabase
        .from("portfolio_transactions")
        .insert(chunk);
      if (error) throw error;
    }

    return NextResponse.json(
      {
        inserted: toInsert.length,
        duplicates: rows.length - toInsert.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/portfolio/import:", error);
    const apiError: APIError = {
      error: "INTERNAL_SERVER_ERROR",
      message:
        error instanceof Error ? error.message : "Failed to import transactions",
    };
    return NextResponse.json(apiError, { status: 500 });
  }
}
