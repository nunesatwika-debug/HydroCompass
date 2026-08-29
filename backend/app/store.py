"""
Loads all CSV data + trained models once at process startup and exposes them
as simple in-memory pandas objects. This stands in for the "PostgreSQL +
PostGIS" layer in the full architecture -- for an MVP, CSVs loaded into
memory are enough, and this module is the only place that needs to change
when you migrate to a real database later.
"""

import os
import joblib
import pandas as pd

BASE = os.path.dirname(os.path.dirname(__file__))  # backend/
RAW = os.path.join(os.path.dirname(__file__), "data", "raw")
MODEL_DIR = os.path.join(BASE, "trained_models")

START_YEAR = 2010
HISTORY_END_YEAR = 2025


class Store:
    def __init__(self):
        self.regions = pd.read_csv(os.path.join(RAW, "regions.csv"))
        self.climate = pd.read_csv(os.path.join(RAW, "climate_history.csv"))
        self.demand = pd.read_csv(os.path.join(RAW, "demand_history.csv"))
        self.reservoirs = pd.read_csv(os.path.join(RAW, "reservoirs.csv"))
        self.reservoir_history = pd.read_csv(os.path.join(RAW, "reservoir_history.csv"))

        demand_bundle = joblib.load(os.path.join(MODEL_DIR, "demand_model.pkl"))
        self.demand_model = demand_bundle["model"]
        self.demand_features = demand_bundle["features"]

        inflow_bundle = joblib.load(os.path.join(MODEL_DIR, "inflow_model.pkl"))
        self.inflow_model = inflow_bundle["model"]
        self.inflow_features = inflow_bundle["features"]

        self.sector_shares = joblib.load(os.path.join(MODEL_DIR, "sector_shares.pkl"))

    def region_row(self, region_id: int):
        row = self.regions[self.regions.region_id == region_id]
        if row.empty:
            return None
        return row.iloc[0]

    def reservoirs_for_region(self, region_id: int):
        return self.reservoirs[self.reservoirs.region_id == region_id]

    def latest_climate(self, region_id: int):
        rows = self.climate[self.climate.region_id == region_id]
        return rows.sort_values("year").iloc[-1]

    def latest_reservoir_state(self, reservoir_id: int):
        rows = self.reservoir_history[self.reservoir_history.reservoir_id == reservoir_id]
        return rows.sort_values("year").iloc[-1]


# single shared instance, loaded once at import time
store = Store()
