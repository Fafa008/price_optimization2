# Retail Price Optimization Platform

A full-stack application for analyzing and optimizing retail pricing using machine learning and data analytics.

## Features

- **Dashboard Analytics**: Real-time overview of products, sales, and revenue
- **Product Management**: Browse and analyze product catalog with detailed history
- **Price Optimization**: ML-powered price recommendations based on demand forecasting
- **Competitor Analysis**: Track and compare competitor pricing strategies
- **Historical Tracking**: Comprehensive price and sales history visualization

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Supabase client for database access
- Lucide React for icons

### Backend
- Python 3.9+
- FastAPI for REST API
- Pandas & NumPy for data processing
- Scikit-learn for ML models
- Supabase for database

### Database
- Supabase (PostgreSQL)
- Row Level Security enabled
- Optimized indexes for time-series queries

## Getting Started

### 1. Database Setup

The database is already configured with Supabase. Tables are created automatically via migrations.

### 2. Load Dataset

Navigate to the backend directory and load the retail price data:

```bash
cd backend
pip install -r requirements.txt
python ingest_data.py
```

This will import the CSV dataset from `data/retail_price.csv` into your Supabase database.

### 3. Start Backend (Optional)

If you want to use the price optimization API:

```bash
cd backend
python main.py
```

API will be available at http://localhost:8000

### 4. Start Frontend

The frontend dev server starts automatically. Just open your browser to view the application.

## Dataset

The project uses a retail price dataset with the following features:

- **Product Information**: ID, category, weight, photos, ratings
- **Sales Data**: Quantity sold, revenue, customers, temporal patterns
- **Pricing Data**: Unit price, freight costs, historical pricing
- **Competitor Data**: Competitor prices, scores, and freight costs
- **Time Series**: Monthly data from 2017-2018

## Usage

1. **Dashboard**: View overall analytics and key metrics
2. **Products**: Browse products, filter by category, search by ID
3. **Product Details**: Click any product to view detailed price history
4. **Optimization**: Use the Python backend to generate price recommendations

## Architecture

```
project/
├── backend/                 # Python FastAPI backend
│   ├── main.py             # API endpoints
│   ├── optimization.py     # ML price optimization
│   ├── ingest_data.py      # Data loading script
│   └── requirements.txt    # Python dependencies
├── src/                     # React frontend
│   ├── components/         # UI components
│   ├── lib/               # Utilities (Supabase client)
│   └── types/             # TypeScript definitions
└── data/                   # Dataset files
    └── retail_price.csv   # Kaggle retail price dataset
```

## Database Schema

### products
- Product master data
- Category, weight, ratings, photos

### price_history
- Historical pricing and sales
- Time-series data with monthly granularity
- Sales velocity and demand metrics

### competitor_prices
- Competitor pricing information
- Links to price history records

## Price Optimization Algorithm

The optimization engine:
1. Trains demand prediction model using historical data
2. Analyzes price elasticity
3. Evaluates competitor positioning
4. Simulates various pricing scenarios
5. Recommends optimal price point for maximum revenue
