-- Create portfolio_transactions table
CREATE TABLE IF NOT EXISTS portfolio_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  quantity NUMERIC(20, 8) NOT NULL CHECK (quantity > 0),
  price NUMERIC(20, 8) NOT NULL CHECK (price > 0),
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_portfolio_transactions_user_id
  ON portfolio_transactions(user_id);

-- Create index on ticker for faster queries
CREATE INDEX IF NOT EXISTS idx_portfolio_transactions_ticker
  ON portfolio_transactions(ticker);

-- Create composite index for user_id and ticker
CREATE INDEX IF NOT EXISTS idx_portfolio_transactions_user_ticker
  ON portfolio_transactions(user_id, ticker);

-- Enable Row Level Security
ALTER TABLE portfolio_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy: Users can only view their own transactions
CREATE POLICY "Users can view own transactions"
  ON portfolio_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own transactions
CREATE POLICY "Users can insert own transactions"
  ON portfolio_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own transactions
CREATE POLICY "Users can update own transactions"
  ON portfolio_transactions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own transactions
CREATE POLICY "Users can delete own transactions"
  ON portfolio_transactions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_portfolio_transactions_updated_at
  BEFORE UPDATE ON portfolio_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
