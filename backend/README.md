# Price Optimization Backend

Python FastAPI backend for retail price optimization.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure environment variables:
Create a `.env` file in the project root with:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

3. Load data into database:
```bash
python ingest_data.py
```

4. Start the API server:
```bash
python main.py
```

The API will be available at http://localhost:8000

## API Endpoints

- `GET /` - Health check
- `GET /api/products` - List all products
- `GET /api/products/{product_id}` - Get specific product
- `GET /api/products/{product_id}/price-history` - Get price history
- `GET /api/categories` - List all categories
- `GET /api/analytics/summary` - Get analytics summary

## Price Optimization

The optimization module uses machine learning to:
- Predict demand based on pricing
- Calculate price elasticity
- Recommend optimal pricing strategies
- Analyze competitor pricing impact
