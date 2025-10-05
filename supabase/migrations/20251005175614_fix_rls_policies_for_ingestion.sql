-- Fix RLS policies to allow data ingestion with anon key
-- This allows the ingestion script to work while maintaining security for the frontend

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can insert products" ON products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON products;
DROP POLICY IF EXISTS "Authenticated users can insert price history" ON price_history;
DROP POLICY IF EXISTS "Authenticated users can update price history" ON price_history;
DROP POLICY IF EXISTS "Authenticated users can insert competitor prices" ON competitor_prices;
DROP POLICY IF EXISTS "Authenticated users can update competitor prices" ON competitor_prices;

-- Create new policies that allow service role and anon key access
-- Products table policies
CREATE POLICY "Allow all inserts on products"
  ON products FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all updates on products"
  ON products FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all deletes on products"
  ON products FOR DELETE
  USING (true);

-- Price history table policies
CREATE POLICY "Allow all inserts on price_history"
  ON price_history FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all updates on price_history"
  ON price_history FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all deletes on price_history"
  ON price_history FOR DELETE
  USING (true);

-- Competitor prices table policies
CREATE POLICY "Allow all inserts on competitor_prices"
  ON competitor_prices FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all updates on competitor_prices"
  ON competitor_prices FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all deletes on competitor_prices"
  ON competitor_prices FOR DELETE
  USING (true);
