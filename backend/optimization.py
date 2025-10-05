import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler

class PriceOptimizer:
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.feature_names: List[str] = []

    def prepare_features(self, price_data: List[Dict]) -> Tuple[np.ndarray, np.ndarray, List[str]]:
        df = pd.DataFrame(price_data)

        feature_columns = [
            'unit_price', 'freight_price', 'product_score',
            'weekday', 'weekend', 'holiday', 'month', 's', 'lag_price'
        ]

        available_features = [col for col in feature_columns if col in df.columns]

        X = df[available_features].fillna(0).values
        y = df['qty'].fillna(0).values

        return X, y, available_features

    def train_demand_model(self, price_data: List[Dict]):
        X, y, feature_names = self.prepare_features(price_data)

        if len(X) < 5:
            raise ValueError("Insufficient data for training. Need at least 5 records.")

        X_scaled = self.scaler.fit_transform(X)

        self.model = LinearRegression()
        self.model.fit(X_scaled, y)
        self.feature_names = feature_names

        return {
            "r_squared": self.model.score(X_scaled, y),
            "coefficients": self.model.coef_.tolist(),
            "intercept": float(self.model.intercept_)
        }

    def predict_demand(self, features: Dict) -> float:
        if self.model is None:
            raise ValueError("Model not trained. Call train_demand_model first.")

        # Build feature vector in the exact order used during training
        vector = [features.get(name, 0) for name in self.feature_names]
        feature_array = np.array([vector])

        feature_scaled = self.scaler.transform(feature_array)
        prediction = self.model.predict(feature_scaled)

        return max(0, float(prediction[0]))

    def optimize_price(self, price_data: List[Dict], target_revenue: float = None) -> Dict:
        self.train_demand_model(price_data)

        df = pd.DataFrame(price_data)

        # Safe accessors for possibly-missing columns
        def mean_or(df: pd.DataFrame, col: str, default: float = 0.0) -> float:
            return float(df[col].mean()) if col in df.columns and len(df[col]) > 0 else float(default)

        def last_or(df: pd.DataFrame, col: str, default: float = 0.0) -> float:
            return float(df[col].iloc[-1]) if col in df.columns and len(df[col]) > 0 else float(default)

        current_price = last_or(df, 'unit_price', 0.0)
        avg_freight = mean_or(df, 'freight_price', 0.0)
        avg_score = mean_or(df, 'product_score', 0.0)

        price_range = np.linspace(current_price * 0.5, current_price * 1.5, 50)

        best_price = current_price
        best_revenue = 0
        scenarios = []

        for price in price_range:
            features = {
                'unit_price': price,
                'freight_price': avg_freight,
                'product_score': avg_score,
                'weekday': mean_or(df, 'weekday', 0.0),
                'weekend': mean_or(df, 'weekend', 0.0),
                'holiday': mean_or(df, 'holiday', 0.0),
                'month': last_or(df, 'month', 1.0),
                's': mean_or(df, 's', 0.0),
                'lag_price': last_or(df, 'unit_price', 0.0)
            }

            predicted_qty = self.predict_demand(features)
            predicted_revenue = price * predicted_qty

            scenarios.append({
                'price': float(price),
                'predicted_quantity': float(predicted_qty),
                'predicted_revenue': float(predicted_revenue)
            })

            if predicted_revenue > best_revenue:
                best_revenue = predicted_revenue
                best_price = price

        return {
            'current_price': float(current_price),
            'optimized_price': float(best_price),
            'expected_revenue': float(best_revenue),
            'price_change_percentage': float((best_price - current_price) / current_price * 100),
            'scenarios': scenarios
        }

    def calculate_elasticity(self, price_data: List[Dict]) -> float:
        df = pd.DataFrame(price_data)

        if len(df) < 2:
            return -1.0

        price_change = (df['unit_price'].iloc[-1] - df['unit_price'].iloc[0]) / df['unit_price'].iloc[0]
        qty_change = (df['qty'].iloc[-1] - df['qty'].iloc[0]) / df['qty'].iloc[0]

        if price_change == 0 or df['qty'].iloc[0] == 0:
            return 0.0

        elasticity = qty_change / price_change

        return float(elasticity)
