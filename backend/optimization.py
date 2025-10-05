import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler

class PriceOptimizer:
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()

    def prepare_features(self, price_data: List[Dict]) -> Tuple[np.ndarray, np.ndarray]:
        df = pd.DataFrame(price_data)

        feature_columns = [
            'unit_price', 'freight_price', 'product_score',
            'weekday', 'weekend', 'holiday', 'month', 's', 'lag_price'
        ]

        available_features = [col for col in feature_columns if col in df.columns]

        X = df[available_features].fillna(0).values
        y = df['qty'].fillna(0).values

        return X, y

    def train_demand_model(self, price_data: List[Dict]):
        X, y = self.prepare_features(price_data)

        if len(X) < 5:
            raise ValueError("Insufficient data for training. Need at least 5 records.")

        X_scaled = self.scaler.fit_transform(X)

        self.model = LinearRegression()
        self.model.fit(X_scaled, y)

        return {
            "r_squared": self.model.score(X_scaled, y),
            "coefficients": self.model.coef_.tolist(),
            "intercept": float(self.model.intercept_)
        }

    def predict_demand(self, features: Dict) -> float:
        if self.model is None:
            raise ValueError("Model not trained. Call train_demand_model first.")

        feature_array = np.array([[
            features.get('unit_price', 0),
            features.get('freight_price', 0),
            features.get('product_score', 0),
            features.get('weekday', 0),
            features.get('weekend', 0),
            features.get('holiday', 0),
            features.get('month', 0),
            features.get('s', 0),
            features.get('lag_price', 0)
        ]])

        feature_scaled = self.scaler.transform(feature_array)
        prediction = self.model.predict(feature_scaled)

        return max(0, float(prediction[0]))

    def optimize_price(self, price_data: List[Dict], target_revenue: float = None) -> Dict:
        self.train_demand_model(price_data)

        df = pd.DataFrame(price_data)
        current_price = df['unit_price'].iloc[-1]
        avg_freight = df['freight_price'].mean()
        avg_score = df['product_score'].mean()

        price_range = np.linspace(current_price * 0.5, current_price * 1.5, 50)

        best_price = current_price
        best_revenue = 0
        scenarios = []

        for price in price_range:
            features = {
                'unit_price': price,
                'freight_price': avg_freight,
                'product_score': avg_score,
                'weekday': df['weekday'].mean(),
                'weekend': df['weekend'].mean(),
                'holiday': df['holiday'].mean(),
                'month': df['month'].iloc[-1],
                's': df['s'].mean(),
                'lag_price': current_price
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

        if price_change == 0:
            return 0.0

        elasticity = qty_change / price_change

        return float(elasticity)
