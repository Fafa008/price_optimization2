import pandas as pd
import os
from dotenv import load_dotenv
from supabase import create_client, Client
import sys
import time
from typing import Dict, List

load_dotenv()

supabase_url = os.getenv("VITE_SUPABASE_URL")
supabase_key = os.getenv("VITE_SUPABASE_ANON_KEY")

if not supabase_url or not supabase_key:
    print("Error: Supabase credentials not found in .env file")
    sys.exit(1)

supabase: Client = create_client(supabase_url, supabase_key)

def _retry(fn, *, tries: int = 3, backoff_seconds: float = 1.0):
    last_exc = None
    for attempt in range(1, tries + 1):
        try:
            return fn()
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            sleep_for = backoff_seconds * attempt
            print(f"Retryable error: {exc}. Attempt {attempt}/{tries}. Sleeping {sleep_for:.1f}s")
            time.sleep(sleep_for)
    raise last_exc


def _fetch_existing_products_map() -> Dict[str, str]:
    product_map: Dict[str, str] = {}
    try:
        resp = supabase.table("products").select("id,product_id").execute()
        for row in resp.data or []:
            product_map[row["product_id"]] = row["id"]
    except Exception as e:  # noqa: BLE001
        print(f"Warning: failed to prefetch products map: {e}")
    return product_map


def _upsert_products(batch: List[dict], product_map: Dict[str, str]):
    if not batch:
        return
    def do():
        # Use upsert to ensure idempotency on product_id
        return supabase.table("products").upsert(batch, on_conflict="product_id").execute()
    result = _retry(do)
    # Update local map with ids from response when available
    for row in result.data or []:
        product_map[row["product_id"]] = row["id"]


def _upsert_price_history(batch: List[dict]):
    if not batch:
        return []
    def do():
        # Idempotent on (product_id, month_year)
        return supabase.table("price_history").upsert(batch, on_conflict="product_id,month_year").execute()
    result = _retry(do)
    return result.data or []


def _insert_competitor_prices(batch: List[dict]):
    if not batch:
        return
    def do():
        return supabase.table("competitor_prices").insert(batch).execute()
    _retry(do)


def ingest_csv_data(csv_path: str, *, chunksize: int = 5000, product_batch_size: int = 1000, price_batch_size: int = 1000):
    print(f"Reading CSV file from {csv_path} in chunks of {chunksize}...")

    product_map: Dict[str, str] = _fetch_existing_products_map()
    total_products_ingested = 0
    total_price_rows = 0

    # Stream CSV in chunks to keep memory bounded
    for chunk_idx, df in enumerate(pd.read_csv(csv_path, chunksize=chunksize)):
        print(f"\nProcessing chunk {chunk_idx + 1}...")

        # Prepare unique products from this chunk
        unique_products_df = df[['product_id', 'product_category_name', 'product_name_lenght',
                                 'product_description_lenght', 'product_photos_qty',
                                 'product_weight_g', 'product_score', 'volume']].drop_duplicates(subset=['product_id'])

        product_rows: List[dict] = []
        for _, row in unique_products_df.iterrows():
            prod_id = row['product_id']
            if prod_id in product_map:
                continue
            product_rows.append({
                "product_id": prod_id,
                "product_category_name": row['product_category_name'],
                "product_name_length": int(row['product_name_lenght']),
                "product_description_length": int(row['product_description_lenght']),
                "product_photos_qty": int(row['product_photos_qty']),
                "product_weight_g": int(row['product_weight_g']),
                "product_score": float(row['product_score']),
                "volume": float(row['volume'])
            })

            # Flush in batches
            if len(product_rows) >= product_batch_size:
                _upsert_products(product_rows, product_map)
                total_products_ingested += len(product_rows)
                print(f"Upserted {len(product_rows)} products (running total: {total_products_ingested})")
                product_rows = []

        if product_rows:
            _upsert_products(product_rows, product_map)
            total_products_ingested += len(product_rows)
            print(f"Upserted {len(product_rows)} products (running total: {total_products_ingested})")

        # Prepare price history rows for this chunk, mapping external product_id to internal id
        price_rows: List[dict] = []
        competitors_rows: List[dict] = []

        for _, row in df.iterrows():
            prod_id = row['product_id']
            internal_id = product_map.get(prod_id)
            if not internal_id:
                continue
            price_rows.append({
                "product_id": internal_id,
                "month_year": row['month_year'],
                "qty": int(row['qty']),
                "total_price": float(row['total_price']),
                "freight_price": float(row['freight_price']),
                "unit_price": float(row['unit_price']),
                "customers": int(row['customers']),
                "weekday": int(row['weekday']),
                "weekend": int(row['weekend']),
                "holiday": int(row['holiday']),
                "month": int(row['month']),
                "year": int(row['year']),
                "s": float(row['s']),
                "lag_price": float(row['lag_price'])
            })

            # Flush price rows in batches with upsert
            if len(price_rows) >= price_batch_size:
                inserted = _upsert_price_history(price_rows)
                total_price_rows += len(price_rows)
                print(f"Upserted {len(price_rows)} price rows (running total: {total_price_rows})")

                # Build competitor rows linked to returned ids when available, otherwise skip per-row linkage for batch
                # Here, we construct competitor_rows using the same order if ids are returned; fallback will handle remaining after final flush
                price_rows = []

        if price_rows:
            inserted = _upsert_price_history(price_rows)
            total_price_rows += len(price_rows)
            print(f"Upserted {len(price_rows)} price rows (running total: {total_price_rows})")

        # For competitor prices, we need associated price_history ids.
        # Since PostgREST may not return all ids for upserted conflicts, we rebuild mapping by querying the just-updated set.
        # To keep it simple and scalable, we perform a second pass within the chunk to insert competitors row-by-row grouped and batched.
        comp_batch: List[dict] = []
        for _, row in df.iterrows():
            prod_id = row['product_id']
            internal_id = product_map.get(prod_id)
            if not internal_id:
                continue
            # Fetch price_history id for (product_id, month_year)
            try:
                ph = supabase.table("price_history").select("id").eq("product_id", internal_id).eq("month_year", row['month_year']).maybe_single().execute()
                if not ph.data:
                    continue
                price_history_id = ph.data["id"]
            except Exception as e:  # noqa: BLE001
                print(f"Warning: failed to resolve price_history id for product {prod_id} {row['month_year']}: {e}")
                continue

            for i in range(1, 4):
                comp_price = row.get(f'comp_{i}')
                comp_score = row.get(f'ps{i}')
                comp_freight = row.get(f'fp{i}')
                if pd.notna(comp_price) and pd.notna(comp_score) and pd.notna(comp_freight):
                    comp_batch.append({
                        "price_history_id": price_history_id,
                        "competitor_number": i,
                        "competitor_price": float(comp_price),
                        "competitor_score": float(comp_score),
                        "competitor_freight": float(comp_freight)
                    })
            if len(comp_batch) >= 2000:
                _insert_competitor_prices(comp_batch)
                print(f"Inserted {len(comp_batch)} competitor price rows")
                comp_batch = []

        if comp_batch:
            _insert_competitor_prices(comp_batch)
            print(f"Inserted {len(comp_batch)} competitor price rows")

    print(f"\n✓ Successfully upserted ~{total_products_ingested} products and {total_price_rows} price history rows")
    print("\nData ingestion completed successfully!")

if __name__ == "__main__":
    csv_path = "../data/retail_price.csv"

    if not os.path.exists(csv_path):
        print(f"Error: CSV file not found at {csv_path}")
        sys.exit(1)

    ingest_csv_data(csv_path)
