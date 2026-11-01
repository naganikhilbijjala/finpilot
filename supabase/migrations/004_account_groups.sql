-- Which group each brokerage account belongs to (your investments, your
-- emergency fund, or managed for someone else), plus the emergency-fund
-- target. Private to each user.
CREATE TABLE IF NOT EXISTS account_groups (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('investments', 'emergency', 'managed')),
  managed_for TEXT CHECK (managed_for IS NULL OR char_length(managed_for) <= 60),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, account_id),
  CHECK (kind <> 'managed' OR char_length(trim(managed_for)) > 0)
);

CREATE TABLE IF NOT EXISTS portfolio_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  emergency_monthly_expenses NUMERIC(14, 2) CHECK (emergency_monthly_expenses >= 0),
  emergency_months INTEGER CHECK (emergency_months BETWEEN 1 AND 36),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE account_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own account groups"
  ON account_groups
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own portfolio settings"
  ON portfolio_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
