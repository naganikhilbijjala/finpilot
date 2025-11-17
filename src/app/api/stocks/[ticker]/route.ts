import { NextRequest, NextResponse } from "next/server";
import { getCurrentStockPrice } from "@/lib/utils/stockPrices";
import type { APIError } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;

    if (!ticker) {
      const error: APIError = {
        error: "BAD_REQUEST",
        message: "Ticker symbol is required",
      };
      return NextResponse.json(error, { status: 400 });
    }

    const stockPrice = await getCurrentStockPrice(ticker.toUpperCase());

    return NextResponse.json(stockPrice, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/stocks/[ticker]:", error);

    const apiError: APIError = {
      error: "INTERNAL_SERVER_ERROR",
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch stock price",
      details: error,
    };

    return NextResponse.json(apiError, { status: 500 });
  }
}
