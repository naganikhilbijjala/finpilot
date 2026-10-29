-- Cached fundamentals for the stock screener. Public market data, shared by
-- all users; written only by the server (service role), read by signed-in users.
CREATE TABLE IF NOT EXISTS stock_fundamentals (
  symbol TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_fundamentals_fetched_at
  ON stock_fundamentals(fetched_at);

ALTER TABLE stock_fundamentals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can read fundamentals"
  ON stock_fundamentals
  FOR SELECT
  TO authenticated
  USING (true);
-- No insert/update/delete policies: only the service role (bypasses RLS) writes.
