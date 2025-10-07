-- Performance indexes and uniqueness constraints for scalable queries

-- Ensure unique natural keys where applicable
alter table if exists public.products
  add constraint if not exists products_product_id_key unique (product_id);

-- Idempotency key for price history per product and month
alter table if exists public.price_history
  add constraint if not exists price_history_product_month_unique unique (product_id, month_year);

-- Indexes for frequent query predicates and ordering
create index if not exists idx_products_product_category_name on public.products (product_category_name);
create index if not exists idx_price_history_product_id on public.price_history (product_id);
create index if not exists idx_price_history_year_month on public.price_history (year, month);

-- Optional: composite covering index for typical history queries
create index if not exists idx_price_history_product_year_month on public.price_history (product_id, year, month);

-- Competitor prices often joined by price_history_id
create index if not exists idx_competitor_prices_price_history_id on public.competitor_prices (price_history_id);


