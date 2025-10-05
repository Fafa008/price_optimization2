from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv
from supabase import create_client, Client
from optimization import PriceOptimizer

load_dotenv()

app = FastAPI(title="Price Optimization API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase_url = os.getenv("VITE_SUPABASE_URL")
supabase_key = os.getenv("VITE_SUPABASE_ANON_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

class Product(BaseModel):
    product_id: str
    product_category_name: str
    product_name_length: int
    product_description_length: int
    product_photos_qty: int
    product_weight_g: int
    product_score: float
    volume: float

class PriceOptimizationRequest(BaseModel):
    product_id: str
    target_revenue: Optional[float] = None

@app.get("/")
async def root():
    return {"message": "Price Optimization API", "status": "running"}

@app.get("/api/products")
async def get_products():
    try:
        response = supabase.table("products").select("*").execute()
        return {"products": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/products/{product_id}")
async def get_product(product_id: str):
    try:
        response = supabase.table("products").select("*").eq("product_id", product_id).maybe_single().execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Product not found")
        return response.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/products/{product_id}/price-history")
async def get_price_history(product_id: str):
    try:
        product_response = supabase.table("products").select("id").eq("product_id", product_id).maybe_single().execute()
        if not product_response.data:
            raise HTTPException(status_code=404, detail="Product not found")

        history_response = supabase.table("price_history").select("*").eq("product_id", product_response.data["id"]).order("year", desc=False).order("month", desc=False).execute()
        return {"price_history": history_response.data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/optimize")
async def optimize_price(payload: PriceOptimizationRequest):
    try:
        # Resolve internal product id
        product_response = (
            supabase
            .table("products")
            .select("id, product_id")
            .eq("product_id", payload.product_id)
            .maybe_single()
            .execute()
        )
        if not product_response.data:
            raise HTTPException(status_code=404, detail="Product not found")

        internal_product_id = product_response.data["id"]

        # Load price history with required features
        history_response = (
            supabase
            .table("price_history")
            .select("*")
            .eq("product_id", internal_product_id)
            .order("year", desc=False)
            .order("month", desc=False)
            .execute()
        )

        price_data: List[dict] = history_response.data or []
        if len(price_data) < 5:
            raise HTTPException(status_code=400, detail="Insufficient data to optimize (need >= 5 records)")

        optimizer = PriceOptimizer()
        result = optimizer.optimize_price(price_data, target_revenue=payload.target_revenue)

        # Also include a quick model summary
        model_info = optimizer.train_demand_model(price_data)

        return {"product_id": payload.product_id, "result": result, "model": model_info}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/products/{product_id}/elasticity")
async def get_price_elasticity(product_id: str):
    try:
        product_response = (
            supabase
            .table("products")
            .select("id, product_id")
            .eq("product_id", product_id)
            .maybe_single()
            .execute()
        )
        if not product_response.data:
            raise HTTPException(status_code=404, detail="Product not found")

        internal_product_id = product_response.data["id"]
        history_response = (
            supabase
            .table("price_history")
            .select("unit_price, qty")
            .eq("product_id", internal_product_id)
            .order("year", desc=False)
            .order("month", desc=False)
            .execute()
        )

        price_data: List[dict] = history_response.data or []
        optimizer = PriceOptimizer()
        elasticity = optimizer.calculate_elasticity(price_data)
        return {"product_id": product_id, "elasticity": elasticity}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/categories")
async def get_categories():
    try:
        response = supabase.table("products").select("product_category_name").execute()
        categories = list(set([p["product_category_name"] for p in response.data]))
        return {"categories": sorted(categories)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/summary")
async def get_analytics_summary():
    try:
        products_response = supabase.table("products").select("id", count="exact").execute()
        price_history_response = supabase.table("price_history").select("*").execute()

        total_products = products_response.count
        total_records = len(price_history_response.data)

        if price_history_response.data:
            total_revenue = sum([record["total_price"] for record in price_history_response.data])
            avg_price = sum([record["unit_price"] for record in price_history_response.data]) / len(price_history_response.data)
        else:
            total_revenue = 0
            avg_price = 0

        return {
            "total_products": total_products,
            "total_records": total_records,
            "total_revenue": round(total_revenue, 2),
            "average_price": round(avg_price, 2)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
