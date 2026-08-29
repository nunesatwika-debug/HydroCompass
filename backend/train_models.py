"""
Trains two lightweight ML models on the synthetic dataset and saves them
with joblib so the API loads pre-trained models instead of training on
every request (see architecture note: never train inside a request).

  - demand_model.pkl  : predicts total regional water demand (MCM)
                        features: [region_id, year_index, population, rainfall_mm, temperature_c]
  - inflow_model.pkl  : predicts reservoir inflow (MCM)
                        features: [reservoir_id, region_id, year_index, rainfall_mm, capacity_mcm]

MVP note: RandomForestRegressor is used here instead of XGBoost to keep the
dependency footprint small and installs fast/offline-friendly. Swapping in
XGBoost later is a drop-in change (same fit/predict/save interface) since
the API only calls `model.predict(features_df)`.

Run:
    python train_models.py
"""

import os
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

BASE = os.path.dirname(__file__)
RAW = os.path.join(BASE, "app", "data", "raw")
MODEL_DIR = os.path.join(BASE, "trained_models")
os.makedirs(MODEL_DIR, exist_ok=True)

START_YEAR = 2010


def train_demand_model():
    regions = pd.read_csv(os.path.join(RAW, "regions.csv"))
    climate = pd.read_csv(os.path.join(RAW, "climate_history.csv"))
    demand = pd.read_csv(os.path.join(RAW, "demand_history.csv"))

    df = demand.merge(climate, on=["region_id", "year"])
    df["year_index"] = df["year"] - START_YEAR

    features = ["region_id", "year_index", "population", "rainfall_mm", "temperature_c"]
    target = "total_mcm"

    X, y = df[features], df[target]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestRegressor(n_estimators=250, max_depth=12, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    r2 = r2_score(y_test, preds)
    print(f"[demand_model] MAE={mae:.2f} MCM  R2={r2:.3f}")

    joblib.dump({"model": model, "features": features}, os.path.join(MODEL_DIR, "demand_model.pkl"))

    # also fit the sector-share ratios so we can split total -> sectors
    sector_shares = regions.set_index("region_id")[
        ["domestic_share", "agriculture_share", "industrial_share", "ecological_share"]
    ]
    joblib.dump(sector_shares, os.path.join(MODEL_DIR, "sector_shares.pkl"))


def train_inflow_model():
    reservoirs = pd.read_csv(os.path.join(RAW, "reservoirs.csv"))
    climate = pd.read_csv(os.path.join(RAW, "climate_history.csv"))
    reservoir_history = pd.read_csv(os.path.join(RAW, "reservoir_history.csv"))

    df = reservoir_history.merge(reservoirs, on="reservoir_id").merge(
        climate, on=["region_id", "year"]
    )
    df["year_index"] = df["year"] - START_YEAR

    features = ["reservoir_id", "region_id", "year_index", "rainfall_mm", "capacity_mcm"]
    target = "inflow_mcm"

    X, y = df[features], df[target]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestRegressor(n_estimators=250, max_depth=12, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    r2 = r2_score(y_test, preds)
    print(f"[inflow_model]  MAE={mae:.2f} MCM  R2={r2:.3f}")

    joblib.dump({"model": model, "features": features}, os.path.join(MODEL_DIR, "inflow_model.pkl"))


if __name__ == "__main__":
    train_demand_model()
    train_inflow_model()
    print(f"Models saved to {MODEL_DIR}")
