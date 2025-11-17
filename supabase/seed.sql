-- Seed data for testing
-- Note: This assumes you have a test user in Supabase with a specific UUID
-- Replace 'YOUR_TEST_USER_UUID' with an actual user UUID from auth.users after creating a test account

-- Example seed data (commented out by default - uncomment and replace UUID after creating test user)
/*
-- Insert sample portfolio transactions for test user
INSERT INTO portfolio_transactions (user_id, ticker, quantity, price, purchased_at) VALUES
  ('YOUR_TEST_USER_UUID', 'AAPL', 10, 150.00, '2024-01-15 10:00:00+00'),
  ('YOUR_TEST_USER_UUID', 'AAPL', 5, 155.00, '2024-03-20 14:30:00+00'),
  ('YOUR_TEST_USER_UUID', 'GOOGL', 8, 140.00, '2024-02-10 09:15:00+00'),
  ('YOUR_TEST_USER_UUID', 'MSFT', 15, 380.00, '2024-01-05 11:45:00+00'),
  ('YOUR_TEST_USER_UUID', 'MSFT', 10, 395.00, '2024-04-12 16:20:00+00'),
  ('YOUR_TEST_USER_UUID', 'TSLA', 20, 180.00, '2024-02-28 13:00:00+00'),
  ('YOUR_TEST_USER_UUID', 'NVDA', 12, 450.00, '2024-03-15 10:30:00+00'),
  ('YOUR_TEST_USER_UUID', 'AMZN', 6, 165.00, '2024-01-22 15:45:00+00');
*/

-- Instructions for using seed data:
-- 1. Create a test user account through your app's signup flow
-- 2. Get the user's UUID from the Supabase dashboard (Authentication > Users)
-- 3. Replace 'YOUR_TEST_USER_UUID' in the INSERT statements above
-- 4. Uncomment the INSERT statements
-- 5. Run this SQL in the Supabase SQL Editor
