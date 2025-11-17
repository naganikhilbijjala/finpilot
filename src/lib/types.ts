// Database types
export interface PortfolioTransaction {
  id: string;
  user_id: string;
  ticker: string;
  quantity: number;
  price: number;
  purchased_at: string;
  created_at: string;
  updated_at: string;
}

// API response types
export interface StockPrice {
  ticker: string;
  currentPrice: number;
  currency: string;
  timestamp: number;
  regularMarketTime?: number;
}

export interface YahooFinanceResponse {
  chart: {
    result: Array<{
      meta: {
        symbol: string;
        regularMarketPrice: number;
        currency: string;
        regularMarketTime: number;
      };
      timestamp: number[];
      indicators: {
        quote: Array<{
          close: number[];
        }>;
      };
    }>;
    error: null | {
      code: string;
      description: string;
    };
  };
}

// Portfolio analytics types
export interface PortfolioHolding {
  ticker: string;
  totalQuantity: number;
  averagePrice: number;
  currentPrice: number;
  totalInvested: number;
  currentValue: number;
  absoluteGain: number;
  percentageGain: number;
  cagr: number | null;
  xirr: number | null;
  transactions: PortfolioTransaction[];
}

export interface PortfolioAnalytics {
  holdings: PortfolioHolding[];
  totalInvested: number;
  totalCurrentValue: number;
  totalAbsoluteGain: number;
  totalPercentageGain: number;
  overallXIRR: number | null;
  lastUpdated: string;
}

// Form types
export interface TransactionFormData {
  ticker: string;
  quantity: number;
  price: number;
  purchased_at: string;
}

// Chart data types
export interface PieChartData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

// API error types
export interface APIError {
  error: string;
  message: string;
  details?: unknown;
}

// Auth types
export interface AuthUser {
  id: string;
  email: string;
  created_at: string;
}
