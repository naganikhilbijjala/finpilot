import { NextResponse } from "next/server";
import { checkOwner } from "@/lib/snaptrade/owner";
import { isProviderConfigured } from "@/lib/screener/provider";
import { syncBatch } from "@/lib/screener/sync";
import type { APIError } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/screener/sync
 * Fetches the next batch of S&P 500 fundamentals into the cache (owner only).
 */
export async function POST() {
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
      message: "FMP_API_KEY and SUPABASE_SERVICE_ROLE_KEY must be set on the server",
    };
    return NextResponse.json(error, { status: 503 });
  }

  try {
    return NextResponse.json(await syncBatch());
  } catch (err) {
    console.error("Fundamentals sync failed:", err);
    const error: APIError = { error: "SYNC_FAILED", message: "Could not sync fundamentals" };
    return NextResponse.json(error, { status: 500 });
  }
}
