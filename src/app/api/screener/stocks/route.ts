import { NextResponse } from "next/server";
import { z } from "zod";
import { addStock } from "@/lib/screener/addStock";
import { getUniverse } from "@/lib/screener/custom";
import { isProviderConfigured } from "@/lib/screener/provider";
import { checkOwner } from "@/lib/snaptrade/owner";
import type { APIError } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const body = z.object({ symbol: z.string().min(1).max(12) });

/**
 * POST /api/screener/stocks  { symbol }
 * Adds a stock beyond the built-in lists (owner only).
 */
export async function POST(request: Request) {
  const owner = await checkOwner();
  if (!owner.ok) {
    const error: APIError = {
      error: owner.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
      message: owner.message,
    };
    return NextResponse.json(error, { status: owner.status });
  }

  if (!isProviderConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const error: APIError = {
      error: "NOT_CONFIGURED",
      message: "FINNHUB_API_KEY and SUPABASE_SERVICE_ROLE_KEY must be set on the server",
    };
    return NextResponse.json(error, { status: 503 });
  }

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const error: APIError = { error: "BAD_REQUEST", message: "A ticker symbol is required" };
    return NextResponse.json(error, { status: 400 });
  }

  const result = await addStock(parsed.data.symbol, await getUniverse());
  if (!result.ok) {
    const error: APIError = { error: "ADD_FAILED", message: result.message };
    return NextResponse.json(error, { status: result.status });
  }
  return NextResponse.json({ symbol: result.stock.symbol, name: result.stock.name, alreadyHad: result.alreadyHad });
}
