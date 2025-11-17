import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMultipleStockPrices } from "@/lib/utils/stockPrices";
import { calculateCAGRFromDates } from "@/lib/utils/cagr";
import { calculateStockXIRR, calculateXIRR } from "@/lib/utils/xirr";
import type {
  APIError,
  PortfolioTransaction,
  PortfolioHolding,
  PortfolioAnalytics,
} from "@/lib/types";

/**
 * GET /api/portfolio/analytics
 * Calculate and return portfolio analytics including holdings, CAGR, XIRR
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    console.log("User:", user);
    console.log("Auth Error:", authError);
    if (authError || !user) {
      const error: APIError = {
        error: "UNAUTHORIZED",
        message: "You must be logged in to view analytics",
      };
      return NextResponse.json(error, { status: 401 });
    }

    // Fetch all transactions
    const { data: transactions, error: dbError } = await supabase
      .from("portfolio_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("purchased_at", { ascending: true });

    if (dbError) {
      throw dbError;
    }

    if (!transactions || transactions.length === 0) {
      const emptyAnalytics: PortfolioAnalytics = {
        holdings: [],
        totalInvested: 0,
        totalCurrentValue: 0,
        totalAbsoluteGain: 0,
        totalPercentageGain: 0,
        overallXIRR: null,
        lastUpdated: new Date().toISOString(),
      };
      return NextResponse.json(emptyAnalytics, { status: 200 });
    }

    // Group transactions by ticker
    const transactionsByTicker = new Map<string, PortfolioTransaction[]>();
    transactions.forEach((txn) => {
      const existing = transactionsByTicker.get(txn.ticker) || [];
      transactionsByTicker.set(txn.ticker, [...existing, txn]);
    });

    // Get current prices for all tickers
    const tickers = Array.from(transactionsByTicker.keys());
    const priceMap = await getMultipleStockPrices(tickers);

    // Calculate holdings
    const holdings: PortfolioHolding[] = [];
    let totalInvested = 0;
    let totalCurrentValue = 0;

    for (const [ticker, txns] of transactionsByTicker.entries()) {
      const stockPrice = priceMap.get(ticker);
      if (!stockPrice) {
        console.warn(`No price data available for ${ticker}, skipping...`);
        continue;
      }

      // Calculate totals
      const totalQuantity = txns.reduce((sum, txn) => sum + txn.quantity, 0);
      const totalCost = txns.reduce(
        (sum, txn) => sum + txn.quantity * txn.price,
        0
      );
      const averagePrice = totalCost / totalQuantity;
      const currentValue = totalQuantity * stockPrice.currentPrice;
      const absoluteGain = currentValue - totalCost;
      const percentageGain = (absoluteGain / totalCost) * 100;

      // Calculate CAGR or XIRR
      let cagr: number | null = null;
      let xirr: number | null = null;

      if (txns.length === 1) {
        // Single transaction - use CAGR
        try {
          cagr = calculateCAGRFromDates(
            txns[0].price,
            stockPrice.currentPrice,
            txns[0].purchased_at
          );
        } catch (error) {
          console.warn(`CAGR calculation failed for ${ticker}:`, error);
        }
      } else {
        // Multiple transactions - use XIRR
        xirr = calculateStockXIRR(txns, stockPrice.currentPrice);
      }

      holdings.push({
        ticker,
        totalQuantity,
        averagePrice,
        currentPrice: stockPrice.currentPrice,
        totalInvested: totalCost,
        currentValue,
        absoluteGain,
        percentageGain,
        cagr,
        xirr,
        transactions: txns,
      });

      totalInvested += totalCost;
      totalCurrentValue += currentValue;
    }

    // Calculate overall portfolio metrics
    const totalAbsoluteGain = totalCurrentValue - totalInvested;
    const totalPercentageGain = (totalAbsoluteGain / totalInvested) * 100;

    // Calculate overall XIRR for entire portfolio
    const overallXIRR = calculateXIRR(transactions, totalCurrentValue);

    const analytics: PortfolioAnalytics = {
      holdings,
      totalInvested,
      totalCurrentValue,
      totalAbsoluteGain,
      totalPercentageGain,
      overallXIRR,
      lastUpdated: new Date().toISOString(),
    };

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
