-- Stocks added by hand beyond the built-in S&P 500 + S&P 400 lists. Public
-- market data: readable by signed-in users, written only by the server.
CREATE TABLE IF NOT EXISTS custom_stocks (
  symbol TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sector TEXT NOT NULL DEFAULT 'Other',
  cik BIGINT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE custom_stocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can read custom stocks"
  ON custom_stocks
  FOR SELECT
  TO authenticated
  USING (true);
-- No write policies: only the service role (bypasses RLS) adds stocks.
