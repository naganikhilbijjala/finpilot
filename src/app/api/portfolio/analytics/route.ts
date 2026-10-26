import { NextResponse } from "next/server";
import { computePortfolioAnalytics } from "@/lib/portfolio/analytics";
import { createClient } from "@/lib/supabase/server";
import type { APIError } from "@/lib/types";

/**
 * GET /api/portfolio/analytics
 * Calculate and return portfolio analytics including holdings, CAGR, XIRR
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      const error: APIError = {
        error: "UNAUTHORIZED",
        message: "You must be logged in to view analytics",
      };
      return NextResponse.json(error, { status: 401 });
    }

    const analytics = await computePortfolioAnalytics(supabase, user.id);
    return NextResponse.json(analytics, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/portfolio/analytics:", error);

    const apiError: APIError = {
      error: "INTERNAL_SERVER_ERROR",
      message:
        error instanceof Error
          ? error.message
          : "Failed to calculate analytics",
      details: error,
    };

    return NextResponse.json(apiError, { status: 500 });
  }
}
