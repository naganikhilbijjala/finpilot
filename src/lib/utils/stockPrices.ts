import type { StockPrice, YahooFinanceResponse } from "@/lib/types";

/**
 * Fetches current stock price from Yahoo Finance API
 * @param ticker - Stock ticker symbol (e.g., 'AAPL', 'GOOGL')
 * @returns StockPrice object with current price and metadata
 */
export async function getCurrentStockPrice(
  ticker: string
): Promise<StockPrice> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      // Cache for 5 minutes to avoid rate limiting
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch stock price: ${response.statusText}`);
    }

    const data: YahooFinanceResponse = await response.json();

    if (data.chart.error) {
      throw new Error(
        `Yahoo Finance API error: ${data.chart.error.description}`
      );
    }

    const result = data.chart.result[0];
    if (!result) {
      throw new Error(`No data found for ticker: ${ticker}`);
    }

    const stockPrice: StockPrice = {
      ticker: result.meta.symbol,
      currentPrice: result.meta.regularMarketPrice,
      currency: result.meta.currency,
      timestamp: Date.now(),
      regularMarketTime: result.meta.regularMarketTime,
    };

    return stockPrice;
  } catch (error) {
    console.error(`Error fetching stock price for ${ticker}:`, error);
    throw error;
  }
}

/**
 * Fetches multiple stock prices in parallel
 * @param tickers - Array of stock ticker symbols
 * @returns Map of ticker to StockPrice
 */
export async function getMultipleStockPrices(
  tickers: string[]
): Promise<Map<string, StockPrice>> {
  const uniqueTickers = [...new Set(tickers)];

  const pricePromises = uniqueTickers.map(async (ticker) => {
    try {
      const price = await getCurrentStockPrice(ticker);
      return { ticker, price };
    } catch (error) {
      console.error(`Failed to fetch price for ${ticker}:`, error);
      return { ticker, price: null };
    }
  });

  const results = await Promise.all(pricePromises);

  const priceMap = new Map<string, StockPrice>();
  results.forEach(({ ticker, price }) => {
    if (price) {
      priceMap.set(ticker, price);
    }
  });

  return priceMap;
}
