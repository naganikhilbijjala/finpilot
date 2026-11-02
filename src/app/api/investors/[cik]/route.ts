import { NextResponse } from "next/server";
import { loadManagerReport, StillBuildingError, UnknownManagerError } from "@/lib/investors/load";
import { hasSecAgent, SecRateLimitError } from "@/lib/sec/client";
import { getCurrentUser } from "@/lib/supabase/server";
import type { APIError } from "@/lib/types";

export const dynamic = "force-dynamic";
// A cold report reads five years of filings and prices; later calls are cached.
export const maxDuration = 60;

/** GET /api/investors/:cik — one manager's 13F report (signed-in users). */
export async function GET(_req: Request, { params }: { params: Promise<{ cik: string }> }) {
  if (!(await getCurrentUser())) {
    const error: APIError = { error: "UNAUTHORIZED", message: "Sign in to view investors" };
    return NextResponse.json(error, { status: 401 });
  }
  if (!hasSecAgent()) {
    const error: APIError = { error: "NOT_CONFIGURED", message: "Set SEC_USER_AGENT to read 13F filings" };
    return NextResponse.json(error, { status: 503 });
  }

  const cik = Number((await params).cik);
  try {
    return NextResponse.json(await loadManagerReport(cik));
  } catch (err) {
    if (err instanceof UnknownManagerError) {
      const error: APIError = { error: "NOT_FOUND", message: err.message };
      return NextResponse.json(error, { status: 404 });
    }
    if (err instanceof StillBuildingError) {
      const error: APIError = { error: "STILL_LOADING", message: "Still reading this manager's filings" };
      return NextResponse.json(error, { status: 503, headers: { "Retry-After": "1" } });
    }
    if (err instanceof SecRateLimitError) {
      const error: APIError = { error: "RATE_LIMITED", message: err.message };
      return NextResponse.json(error, {
        status: 429,
        headers: { "Retry-After": String(err.retryAfterSeconds) },
      });
    }
    console.error(`Investor report ${cik} failed:`, err);
    const error: APIError = {
      error: "REPORT_FAILED",
      message: err instanceof Error ? err.message : "Couldn't build this report",
    };
    return NextResponse.json(error, { status: 502 });
  }
}
