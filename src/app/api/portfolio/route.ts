import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { APIError, PortfolioTransaction } from "@/lib/types";

/**
 * GET /api/portfolio
 * Fetch all portfolio transactions for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      const error: APIError = {
        error: "UNAUTHORIZED",
        message: "You must be logged in to view portfolio",
      };
      return NextResponse.json(error, { status: 401 });
    }

    // Fetch transactions
    const { data: transactions, error: dbError } = await supabase
      .from("portfolio_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("purchased_at", { ascending: false });

    if (dbError) {
      throw dbError;
    }

    return NextResponse.json(transactions || [], { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/portfolio:", error);

    const apiError: APIError = {
      error: "INTERNAL_SERVER_ERROR",
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch portfolio transactions",
      details: error,
    };

    return NextResponse.json(apiError, { status: 500 });
  }
}

/**
 * POST /api/portfolio
 * Create a new portfolio transaction
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      const error: APIError = {
        error: "UNAUTHORIZED",
        message: "You must be logged in to add transactions",
      };
      return NextResponse.json(error, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { ticker, quantity, price, purchased_at } = body;

    // Validation
    if (!ticker || !quantity || !price || !purchased_at) {
      const error: APIError = {
        error: "BAD_REQUEST",
        message: "Missing required fields: ticker, quantity, price, purchased_at",
      };
      return NextResponse.json(error, { status: 400 });
    }

    if (quantity <= 0 || price <= 0) {
      const error: APIError = {
        error: "BAD_REQUEST",
        message: "Quantity and price must be positive numbers",
      };
      return NextResponse.json(error, { status: 400 });
    }

    // Insert transaction
    const { data: transaction, error: dbError } = await supabase
      .from("portfolio_transactions")
      .insert({
        user_id: user.id,
        ticker: ticker.toUpperCase(),
        quantity: parseFloat(quantity),
        price: parseFloat(price),
        purchased_at,
      })
      .select()
      .single();

    if (dbError) {
      throw dbError;
    }

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/portfolio:", error);

    const apiError: APIError = {
      error: "INTERNAL_SERVER_ERROR",
      message:
        error instanceof Error
          ? error.message
          : "Failed to create transaction",
      details: error,
    };

    return NextResponse.json(apiError, { status: 500 });
  }
}

/**
 * PUT /api/portfolio?id={transactionId}
 * Update a portfolio transaction
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      const error: APIError = {
        error: "UNAUTHORIZED",
        message: "You must be logged in to update transactions",
      };
      return NextResponse.json(error, { status: 401 });
    }

    // Get transaction ID from query params
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      const error: APIError = {
        error: "BAD_REQUEST",
        message: "Transaction ID is required",
      };
      return NextResponse.json(error, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const { ticker, quantity, price, purchased_at } = body;

    // Validation
    if (!ticker || !quantity || !price || !purchased_at) {
      const error: APIError = {
        error: "BAD_REQUEST",
        message: "Missing required fields: ticker, quantity, price, purchased_at",
      };
      return NextResponse.json(error, { status: 400 });
    }

    if (quantity <= 0 || price <= 0) {
      const error: APIError = {
        error: "BAD_REQUEST",
        message: "Quantity and price must be positive numbers",
      };
      return NextResponse.json(error, { status: 400 });
    }

    // Update transaction (RLS ensures user can only update their own)
    const { data: transaction, error: dbError } = await supabase
      .from("portfolio_transactions")
      .update({
        ticker: ticker.toUpperCase(),
        quantity: parseFloat(quantity),
        price: parseFloat(price),
        purchased_at,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (dbError) {
      throw dbError;
    }

    if (!transaction) {
      const error: APIError = {
        error: "NOT_FOUND",
        message: "Transaction not found or you don't have permission to update it",
      };
      return NextResponse.json(error, { status: 404 });
    }

    return NextResponse.json(transaction, { status: 200 });
  } catch (error) {
    console.error("Error in PUT /api/portfolio:", error);

    const apiError: APIError = {
      error: "INTERNAL_SERVER_ERROR",
      message:
        error instanceof Error
          ? error.message
          : "Failed to update transaction",
      details: error,
    };

    return NextResponse.json(apiError, { status: 500 });
  }
}

/**
 * DELETE /api/portfolio?id={transactionId}
 * Delete a portfolio transaction
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      const error: APIError = {
        error: "UNAUTHORIZED",
        message: "You must be logged in to delete transactions",
      };
      return NextResponse.json(error, { status: 401 });
    }

    // Get transaction ID from query params
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      const error: APIError = {
        error: "BAD_REQUEST",
        message: "Transaction ID is required",
      };
      return NextResponse.json(error, { status: 400 });
    }

    // Delete transaction (RLS ensures user can only delete their own)
    const { error: dbError } = await supabase
      .from("portfolio_transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (dbError) {
      throw dbError;
    }

    return NextResponse.json(
      { message: "Transaction deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in DELETE /api/portfolio:", error);

    const apiError: APIError = {
      error: "INTERNAL_SERVER_ERROR",
      message:
        error instanceof Error
          ? error.message
          : "Failed to delete transaction",
      details: error,
    };

    return NextResponse.json(apiError, { status: 500 });
  }
}
