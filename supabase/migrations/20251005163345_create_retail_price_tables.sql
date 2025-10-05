-- Retail Price Optimization Database Schema
-- 
-- Overview:
-- This migration creates the database structure for a retail price optimization system.
-- It stores historical product pricing data, competitor information, and sales metrics.
--
-- New Tables:
-- 1. products - Stores product master data
-- 2. price_history - Stores historical pricing and sales data
-- 3. competitor_prices - Stores competitor pricing information
--
-- Security:
-- - Enable RLS on all tables
-- - Add policies for authenticated users to read/write data

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text UNIQUE NOT NULL,
  product_category_name text NOT NULL,
  product_name_length integer DEFAULT 0,
  product_description_length integer DEFAULT 0,
  product_photos_qty integer DEFAULT 0,
  product_weight_g integer DEFAULT 0,
  product_score numeric DEFAULT 0,
  volume numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create price_history table
CREATE TABLE IF NOT EXISTS price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  month_year text NOT NULL,
  qty integer DEFAULT 0,
  total_price numeric DEFAULT 0,
  freight_price numeric DEFAULT 0,
  unit_price numeric DEFAULT 0,
  customers integer DEFAULT 0,
  weekday integer DEFAULT 0,
  weekend integer DEFAULT 0,
  holiday integer DEFAULT 0,
  month integer NOT NULL,
  year integer NOT NULL,
  s numeric DEFAULT 0,
  lag_price numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create competitor_prices table
CREATE TABLE IF NOT EXISTS competitor_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_history_id uuid NOT NULL REFERENCES price_history(id) ON DELETE CASCADE,
  competitor_number integer NOT NULL,
  competitor_price numeric DEFAULT 0,
  competitor_score numeric DEFAULT 0,
  competitor_freight numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_product_id ON products(product_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(product_category_name);
CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_month_year ON price_history(month_year);
CREATE INDEX IF NOT EXISTS idx_price_history_composite ON price_history(product_id, year, month);
CREATE INDEX IF NOT EXISTS idx_competitor_prices_history_id ON competitor_prices(price_history_id);

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_prices ENABLE ROW LEVEL SECURITY;

-- Create policies for products table
CREATE POLICY "Anyone can view products"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for price_history table
CREATE POLICY "Anyone can view price history"
  ON price_history FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert price history"
  ON price_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update price history"
  ON price_history FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for competitor_prices table
CREATE POLICY "Anyone can view competitor prices"
  ON competitor_prices FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert competitor prices"
  ON competitor_prices FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update competitor prices"
  ON competitor_prices FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);