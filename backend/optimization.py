import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler

class PriceOptimizer:
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.feature_names: list[str] = []

    def prepare_features(self, price_data: list[dict]) -> tuple[np.ndarray, np.ndarray, list[str]]:
        df = pd.DataFrame(price_data)

        # List de toutes les features candidate
        feature_columns = [
            'unit_price', 'freight_price', 'product_score',
            'weekday', 'weekend', 'holiday', 'month', 's', 'lag_price'
        ]

        # Exclure total_price pour éviter la fuite
        features_to_use = [
            'unit_price', 'freight_price', 'product_score',
            'weekday', 'weekend', 'holiday', 'month', 's', 'lag_price'
        ]

        available_features = [col for col in features_to_use if col in df.columns]

        # Gérer les valeurs NaN si besoin
        X = df[available_features].fillna(0).values
        y = df['qty'].fillna(0).values

        # Optionnel : transformer la cible (log) pour traiter asymétrie
        # y = np.log1p(y)  # Si approprié, mais attention à l'interprétation

        return X, y, available_features

    def train_demand_model(self, price_data: list[dict]) -> dict:
        X, y, feature_names = self.prepare_features(price_data)

        if len(X) < 5:
            raise ValueError("Insufficient data for training. Need at least 5 records.")

        # Entraînement avec normalisation
        X_scaled = self.scaler.fit_transform(X)

        self.model = LinearRegression()
        self.model.fit(X_scaled, y)
        self.feature_names = feature_names

        return {
            "r_squared": self.model.score(X_scaled, y),
            "coefficients": self.model.coef_.tolist(),
            "intercept": float(self.model.intercept_)
        }

    def predict_demand(self, features: dict) -> float:
        if self.model is None:
            raise ValueError("Model not trained. Call train_demand_model first.")

        vector = [features.get(name, 0) for name in self.feature_names]
        feature_array = np.array([vector])
        feature_scaled = self.scaler.transform(feature_array)
        prediction = self.model.predict(feature_scaled)

        # Si la demande est très faible ou négative, ajuster si besoin
        demand = max(0, float(prediction[0]))
        # Si transformation log était appliquée, appliquer inverse ici
        # demand = np.expm1(prediction[0])
        return demand

    def optimize_price(self, price_data: list[dict]) -> dict:
        # Entraîner le modèle
        self.train_demand_model(price_data)
        df = pd.DataFrame(price_data)

        def mean_or(df, col, default=0.0):
            return float(df[col].mean()) if col in df.columns and len(df[col]) > 0 else float(default)

        def last_or(df, col, default=0.0):
            return float(df[col].iloc[-1]) if col in df.columns and len(df[col]) > 0 else float(default)

        current_price = last_or(df, 'unit_price', 0.0)
        avg_freight = mean_or(df, 'freight_price', 0.0)
        avg_score = mean_or(df, 'product_score', 0.0)

        # Critère : dans une vraie application, utilisez une valeur constante ou la dernière observation
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

    def calculate_elasticity(self, price_data: list[dict]) -> float:
        df = pd.DataFrame(price_data)

        if len(df) < 2:
            return -1.0

        price_change = (df['unit_price'].iloc[-1] - df['unit_price'].iloc[0]) / df['unit_price'].iloc[0]
        qty_change = (df['qty'].iloc[-1] - df['qty'].iloc[0]) / df['qty'].iloc[0]

        # Si la variation de prix est nulle, l’élasticité est indéfinie
        if abs(price_change) < 1e-6 or df['qty'].iloc[0] == 0:
            return 0.0

        elasticity = qty_change / price_change
        return float(elasticity)
