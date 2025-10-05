export interface Product {
  id: string;
  product_id: string;
  product_category_name: string;
  product_name_length: number;
  product_description_length: number;
  product_photos_qty: number;
  product_weight_g: number;
  product_score: number;
  volume: number;
  created_at: string;
  updated_at: string;
}

export interface PriceHistory {
  id: string;
  product_id: string;
  month_year: string;
  qty: number;
  total_price: number;
  freight_price: number;
  unit_price: number;
  customers: number;
  weekday: number;
  weekend: number;
  holiday: number;
  month: number;
  year: number;
  s: number;
  lag_price: number;
  created_at: string;
}

export interface AnalyticsSummary {
  total_products: number;
  total_records: number;
  total_revenue: number;
  average_price: number;
}
