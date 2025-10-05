import pandas as pd
import os
from dotenv import load_dotenv
from supabase import create_client, Client
import sys

load_dotenv()

supabase_url = os.getenv("VITE_SUPABASE_URL")
supabase_key = os.getenv("VITE_SUPABASE_ANON_KEY")

if not supabase_url or not supabase_key:
    print("Error: Supabase credentials not found in .env file")
    sys.exit(1)

supabase: Client = create_client(supabase_url, supabase_key)

def ingest_csv_data(csv_path: str):
    print(f"Reading CSV file from {csv_path}...")
    df = pd.read_csv(csv_path)

    print(f"Total rows in CSV: {len(df)}")

    unique_products = df[['product_id', 'product_category_name', 'product_name_lenght',
                          'product_description_lenght', 'product_photos_qty',
                          'product_weight_g', 'product_score', 'volume']].drop_duplicates(subset=['product_id'])

    print(f"\nIngesting {len(unique_products)} unique products...")

    product_map = {}

    for idx, row in unique_products.iterrows():
        try:
            existing = supabase.table("products").select("id").eq("product_id", row['product_id']).maybeSingle().execute()

            if existing.data:
                product_map[row['product_id']] = existing.data['id']
                print(f"Product {row['product_id']} already exists, skipping...")
                continue

            product_data = {
                "product_id": row['product_id'],
                "product_category_name": row['product_category_name'],
                "product_name_length": int(row['product_name_lenght']),
                "product_description_length": int(row['product_description_lenght']),
                "product_photos_qty": int(row['product_photos_qty']),
                "product_weight_g": int(row['product_weight_g']),
                "product_score": float(row['product_score']),
                "volume": float(row['volume'])
            }

            result = supabase.table("products").insert(product_data).execute()
            product_map[row['product_id']] = result.data[0]['id']

            if (idx + 1) % 10 == 0:
                print(f"Processed {idx + 1}/{len(unique_products)} products")

        except Exception as e:
            print(f"Error inserting product {row['product_id']}: {e}")
            continue

    print(f"\n✓ Successfully ingested {len(product_map)} products")

    print(f"\nIngesting price history for {len(df)} records...")

    for idx, row in df.iterrows():
        try:
            if row['product_id'] not in product_map:
                continue

            price_data = {
                "product_id": product_map[row['product_id']],
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
            }

            price_result = supabase.table("price_history").insert(price_data).execute()
            price_history_id = price_result.data[0]['id']

            competitor_data = []
            for i in range(1, 4):
                comp_price = row.get(f'comp_{i}')
                comp_score = row.get(f'ps{i}')
                comp_freight = row.get(f'fp{i}')

                if pd.notna(comp_price) and pd.notna(comp_score) and pd.notna(comp_freight):
                    competitor_data.append({
                        "price_history_id": price_history_id,
                        "competitor_number": i,
                        "competitor_price": float(comp_price),
                        "competitor_score": float(comp_score),
                        "competitor_freight": float(comp_freight)
                    })

            if competitor_data:
                supabase.table("competitor_prices").insert(competitor_data).execute()

            if (idx + 1) % 50 == 0:
                print(f"Processed {idx + 1}/{len(df)} price records")

        except Exception as e:
            print(f"Error inserting price history for row {idx}: {e}")
            continue

    print(f"\n✓ Successfully ingested {len(df)} price history records")
    print("\nData ingestion completed successfully!")

if __name__ == "__main__":
    csv_path = "../data/retail_price.csv"

    if not os.path.exists(csv_path):
        print(f"Error: CSV file not found at {csv_path}")
        sys.exit(1)

    ingest_csv_data(csv_path)
