import { NextResponse } from "next/server";
import { checkOwner } from "@/lib/snaptrade/owner";
import { isSnaptradeConfigured } from "@/lib/snaptrade/client";
import { describeError } from "@/lib/snaptrade/errors";
import { fetchSnapshot } from "@/lib/snaptrade/snapshot";
import type { APIError } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/snaptrade/snapshot
 * Read-only accounts + positions from SnapTrade (owner only).
 */
export async function GET() {
  const owner = await checkOwner();
  if (!owner.ok) {
    const error: APIError = {
      error: owner.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
      message: owner.message,
    };
    return NextResponse.json(error, { status: owner.status });
  }

  if (!isSnaptradeConfigured()) {
    const error: APIError = {
      error: "NOT_CONFIGURED",
      message: "SnapTrade credentials are not set on the server",
    };
    return NextResponse.json(error, { status: 503 });
  }

  try {
    const snapshot = await fetchSnapshot();
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    // Log status only; messages embed headers and bodies may hold account data.
    console.error("SnapTrade snapshot failed:", describeError(err));
    const error: APIError = {
      error: "UPSTREAM_ERROR",
      message: "Could not fetch accounts from SnapTrade",
    };
    return NextResponse.json(error, { status: 502 });
  }
}
