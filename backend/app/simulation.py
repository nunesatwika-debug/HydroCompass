"""
Core "physics + AI" logic, kept deliberately separate from the API layer
(see architecture note #15: forecast inflow with ML, derive storage with a
water-balance simulation rather than asking ML to predict storage directly).
"""

import numpy as np
import pandas as pd

from .store import store, START_YEAR


def project_population(region_row, year: int) -> float:
    t = year - START_YEAR
    return region_row.population_2010 * ((1 + region_row.pop_growth_rate) ** t)


def project_climate(region_row, year: int, rainfall_change: float = 0.0,
                     temperature_change: float = 0.0):
    """Naive baseline projection (drift from the region's base climate),
    then applies scenario deltas on top."""
    t = year - START_YEAR
    rainfall = region_row.base_rainfall_mm - 3.0 * t  # mild long-run drying trend
    temperature = region_row.base_temp_c + 0.035 * t
    rainfall *= (1 + rainfall_change)
    temperature += temperature_change
    return max(rainfall, 100), temperature


def predict_demand_total(region_id: int, year: int, population: float,
                          rainfall_mm: float, temperature_c: float) -> float:
    features = pd.DataFrame([{
        "region_id": region_id,
        "year_index": year - START_YEAR,
        "population": population,
        "rainfall_mm": rainfall_mm,
        "temperature_c": temperature_c,
    }])[store.demand_features]
    return float(store.demand_model.predict(features)[0])


def split_demand_by_sector(region_id: int, total_mcm: float,
                            agriculture_change: float = 0.0,
                            industrial_change: float = 0.0):
    shares = store.sector_shares.loc[region_id]
    domestic = total_mcm * shares.domestic_share
    agriculture = total_mcm * shares.agriculture_share * (1 + agriculture_change)
    industrial = total_mcm * shares.industrial_share * (1 + industrial_change)
    ecological = total_mcm * shares.ecological_share
    adj_total = domestic + agriculture + industrial + ecological
    return {
        "domestic": round(domestic, 2),
        "agriculture": round(agriculture, 2),
        "industrial": round(industrial, 2),
        "ecological": round(ecological, 2),
        "total": round(adj_total, 2),
    }


def predict_inflow(reservoir_id: int, region_id: int, year: int,
                    rainfall_mm: float, capacity_mcm: float) -> float:
    features = pd.DataFrame([{
        "reservoir_id": reservoir_id,
        "region_id": region_id,
        "year_index": year - START_YEAR,
        "rainfall_mm": rainfall_mm,
        "capacity_mcm": capacity_mcm,
    }])[store.inflow_features]
    return max(float(store.inflow_model.predict(features)[0]), 0.0)


def simulate_reservoir(reservoir_row, current_storage: float, inflow: float,
                        demand_mcm: float, additional_storage_pct: float = 0.0):
    """One-step water balance: storage_next = storage + inflow - release,
    where release is capped by what's actually available and by the
    (possibly expanded) capacity."""
    capacity = reservoir_row.capacity_mcm * (1 + additional_storage_pct)
    release = min(demand_mcm, current_storage + inflow)
    storage_next = current_storage + inflow - release
    storage_next = float(np.clip(storage_next, 0, capacity))
    storage_pct = 100 * storage_next / capacity if capacity else 0
    unmet_demand = max(demand_mcm - release, 0)
    return {
        "capacity_mcm": round(capacity, 1),
        "inflow_mcm": round(inflow, 2),
        "release_mcm": round(release, 2),
        "storage_mcm": round(storage_next, 2),
        "storage_pct": round(storage_pct, 1),
        "unmet_demand_mcm": round(unmet_demand, 2),
    }


def drought_probability(rainfall_mm: float, base_rainfall_mm: float, storage_pct: float) -> float:
    """Simple heuristic blending rainfall deficit and current reservoir stress
    into a 0-1 probability. Deterministic and explainable for an MVP demo."""
    rainfall_deficit = max(0.0, (base_rainfall_mm - rainfall_mm) / base_rainfall_mm)
    storage_stress = max(0.0, (50 - storage_pct) / 50)
    prob = 0.55 * rainfall_deficit + 0.45 * storage_stress
    return float(np.clip(prob, 0, 1))


def risk_score(deficit_mcm: float, demand_mcm: float, storage_pct: float,
               drought_prob: float) -> dict:
    deficit_ratio = max(0.0, deficit_mcm / demand_mcm) if demand_mcm else 0
    score = (
        45 * min(deficit_ratio, 1.5) / 1.5 +
        30 * (1 - min(storage_pct, 100) / 100) +
        25 * drought_prob
    )
    score = float(np.clip(score, 0, 100))

    if score >= 70:
        level = "CRITICAL"
    elif score >= 45:
        level = "HIGH"
    elif score >= 25:
        level = "MEDIUM"
    else:
        level = "LOW"

    return {"risk_score": round(score, 1), "risk_level": level}


def estimate_shortage_year(current_year: int, storage_pct: float, deficit_mcm: float,
                            demand_mcm: float) -> int | None:
    """Very rough heuristic: if there's already a deficit and storage is
    trending down, project roughly how many years of buffer remain."""
    if deficit_mcm <= 0 or demand_mcm <= 0:
        return None
    stress = deficit_mcm / demand_mcm
    if stress <= 0:
        return None
    years_left = max(1, round((storage_pct / 100) / max(stress, 0.05) * 3))
    return current_year + min(years_left, 25)


def build_recommendations(deficit_mcm: float, storage_pct: float, risk_level: str) -> list[dict]:
    recs = []
    if deficit_mcm > 0:
        recs.append({
            "priority": "HIGH",
            "action": f"Increase effective storage capacity by ~{round(deficit_mcm)} MCM",
            "impact": f"Directly offsets the projected deficit of {round(deficit_mcm)} MCM",
        })
    if risk_level in ("HIGH", "CRITICAL"):
        recs.append({
            "priority": "MEDIUM",
            "action": "Improve irrigation efficiency by 10-15%",
            "impact": "Agriculture is typically the largest demand sector; efficiency gains yield the biggest absolute savings",
        })
        recs.append({
            "priority": "MEDIUM",
            "action": "Expand wastewater treatment & reuse for non-potable use",
            "impact": "Reduces net freshwater withdrawal without new supply infrastructure",
        })
    if storage_pct < 40:
        recs.append({
            "priority": "HIGH" if storage_pct < 25 else "MEDIUM",
            "action": "Introduce demand-side restrictions during peak season",
            "impact": "Protects remaining reservoir buffer against a drought year",
        })
    if not recs:
        recs.append({
            "priority": "LOW",
            "action": "Maintain current management plan and monitoring cadence",
            "impact": "No significant deficit or risk detected under current projections",
        })
    return recs
