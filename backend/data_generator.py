"""
HydroCompass synthetic data generator.

Generates a self-consistent, mildly noisy synthetic dataset for a water
resource management MVP:

  - regions.csv          : region master data (population, base demand mix)
  - climate_history.csv  : yearly rainfall & temperature per region
  - demand_history.csv   : yearly water demand per region, split by sector
  - reservoirs.csv       : reservoir master data (linked to a region)
  - reservoir_history.csv: yearly inflow / release / storage per reservoir

The generator encodes simple, defensible relationships so a model trained on
it will learn plausible patterns (more people -> more demand, less rain ->
less inflow, hotter years -> more agricultural demand, etc). It's synthetic
data, not real hydrology, but it behaves consistently which is what an MVP
demo needs.

Run:
    python data_generator.py
Output:
    backend/app/data/raw/*.csv
"""

import os
import numpy as np
import pandas as pd

SEED = 42
rng = np.random.default_rng(SEED)

START_YEAR = 2010
END_YEAR = 2025  # historical data goes up to here
OUT_DIR = os.path.join(os.path.dirname(__file__), "app", "data", "raw")
os.makedirs(OUT_DIR, exist_ok=True)

STATES = {
    "Andhra Pradesh": ["Visakhapatnam", "Krishna", "Guntur", "Anantapur"],
    "Maharashtra": ["Pune", "Nagpur", "Nashik", "Marathwada"],
    "Rajasthan": ["Jaipur", "Jodhpur", "Bikaner"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai"],
    "Karnataka": ["Bengaluru Rural", "Belagavi", "Kalaburagi"],
}

# rough India bounding box for lat/lon scatter
LAT_RANGE = (12.0, 26.0)
LON_RANGE = (72.0, 85.0)


def build_regions():
    rows = []
    rid = 1
    for state, districts in STATES.items():
        for district in districts:
            population = rng.integers(400_000, 6_000_000)
            # baseline sector split, varies a bit by region
            domestic = rng.uniform(0.28, 0.40)
            agriculture = rng.uniform(0.40, 0.55)
            industrial = rng.uniform(0.08, 0.18)
            ecological = 1 - domestic - agriculture - industrial
            ecological = max(ecological, 0.03)

            rows.append({
                "region_id": rid,
                "name": district,
                "state": state,
                "population_2010": int(population),
                "pop_growth_rate": round(rng.uniform(0.012, 0.028), 4),
                "domestic_share": round(domestic, 3),
                "agriculture_share": round(agriculture, 3),
                "industrial_share": round(industrial, 3),
                "ecological_share": round(ecological, 3),
                "base_rainfall_mm": round(rng.uniform(500, 1400), 1),
                "base_temp_c": round(rng.uniform(24, 31), 1),
                "latitude": round(rng.uniform(*LAT_RANGE), 4),
                "longitude": round(rng.uniform(*LON_RANGE), 4),
            })
            rid += 1
    return pd.DataFrame(rows)


def build_climate_history(regions: pd.DataFrame):
    rows = []
    for _, r in regions.iterrows():
        # slow warming + long multi-year rainfall cycle + noise
        rainfall_trend = rng.uniform(-6, -1)  # mm/year drift, mild drying trend
        cycle_phase = rng.uniform(0, 2 * np.pi)
        for year in range(START_YEAR, END_YEAR + 1):
            t = year - START_YEAR
            cycle = np.sin(2 * np.pi * t / 7 + cycle_phase) * 80  # wet/dry cycle
            rainfall = r.base_rainfall_mm + rainfall_trend * t + cycle + rng.normal(0, 40)
            rainfall = max(rainfall, 150)
            temperature = r.base_temp_c + 0.035 * t + rng.normal(0, 0.4)
            rows.append({
                "region_id": r.region_id,
                "year": year,
                "rainfall_mm": round(rainfall, 1),
                "temperature_c": round(temperature, 2),
            })
    return pd.DataFrame(rows)


def build_demand_history(regions: pd.DataFrame, climate: pd.DataFrame):
    rows = []
    climate_idx = climate.set_index(["region_id", "year"])
    for _, r in regions.iterrows():
        for year in range(START_YEAR, END_YEAR + 1):
            t = year - START_YEAR
            population = r.population_2010 * ((1 + r.pop_growth_rate) ** t)
            clim = climate_idx.loc[(r.region_id, year)]

            # per-capita domestic use grows slowly (development), in liters/day -> MCM/year
            per_capita_lpd = 120 + 0.6 * t
            domestic_mcm = population * per_capita_lpd * 365 / 1e9

            # agriculture demand rises with heat, falls (a little) with more rainfall
            rainfall_factor = 1 - 0.00035 * (clim.rainfall_mm - r.base_rainfall_mm)
            temp_factor = 1 + 0.018 * (clim.temperature_c - r.base_temp_c)
            agri_base = (r.agriculture_share / r.domestic_share) * domestic_mcm
            agriculture_mcm = agri_base * rainfall_factor * temp_factor

            industrial_mcm = (r.industrial_share / r.domestic_share) * domestic_mcm * (1 + 0.02 * t)
            ecological_mcm = (r.ecological_share / r.domestic_share) * domestic_mcm

            noise = rng.normal(1, 0.02)
            domestic_mcm *= noise
            agriculture_mcm *= noise
            industrial_mcm *= noise
            ecological_mcm *= noise

            total = domestic_mcm + agriculture_mcm + industrial_mcm + ecological_mcm

            rows.append({
                "region_id": r.region_id,
                "year": year,
                "population": int(population),
                "domestic_mcm": round(domestic_mcm, 2),
                "agriculture_mcm": round(agriculture_mcm, 2),
                "industrial_mcm": round(industrial_mcm, 2),
                "ecological_mcm": round(ecological_mcm, 2),
                "total_mcm": round(total, 2),
            })
    return pd.DataFrame(rows)


def build_reservoirs(regions: pd.DataFrame):
    rows = []
    resv_id = 1
    for _, r in regions.iterrows():
        n_reservoirs = rng.integers(1, 3)  # 1-2 reservoirs per region
        for _ in range(n_reservoirs):
            capacity = rng.uniform(200, 1600)
            rows.append({
                "reservoir_id": resv_id,
                "region_id": r.region_id,
                "name": f"{r['name']} Reservoir {resv_id}",
                "capacity_mcm": round(capacity, 1),
                "latitude": round(r.latitude + rng.uniform(-0.3, 0.3), 4),
                "longitude": round(r.longitude + rng.uniform(-0.3, 0.3), 4),
            })
            resv_id += 1
    return pd.DataFrame(rows)


def build_reservoir_history(reservoirs: pd.DataFrame, regions: pd.DataFrame,
                             climate: pd.DataFrame, demand: pd.DataFrame):
    rows = []
    region_idx = regions.set_index("region_id")
    climate_idx = climate.set_index(["region_id", "year"])
    demand_idx = demand.set_index(["region_id", "year"])

    for _, res in reservoirs.iterrows():
        region = region_idx.loc[res.region_id]
        # start each reservoir reasonably full
        storage = res.capacity_mcm * rng.uniform(0.55, 0.85)
        # catchment yield coefficient: how much of rainfall becomes inflow
        yield_coeff = rng.uniform(0.35, 0.55)

        for year in range(START_YEAR, END_YEAR + 1):
            clim = climate_idx.loc[(res.region_id, year)]
            dem = demand_idx.loc[(res.region_id, year)]

            inflow = clim.rainfall_mm * yield_coeff * (res.capacity_mcm / 900) * rng.uniform(0.9, 1.1)
            inflow = max(inflow, 5)

            # release aims to cover a share of regional demand, capped by availability
            n_reservoirs_in_region = reservoirs[reservoirs.region_id == res.region_id].shape[0]
            demand_share = dem.total_mcm / n_reservoirs_in_region
            release = min(demand_share, storage + inflow)

            storage = storage + inflow - release
            storage = float(np.clip(storage, 0, res.capacity_mcm))

            rows.append({
                "reservoir_id": res.reservoir_id,
                "year": year,
                "inflow_mcm": round(inflow, 2),
                "release_mcm": round(release, 2),
                "storage_mcm": round(storage, 2),
                "storage_pct": round(100 * storage / res.capacity_mcm, 1),
            })
    return pd.DataFrame(rows)


def main():
    print("Generating regions...")
    regions = build_regions()

    print("Generating climate history...")
    climate = build_climate_history(regions)

    print("Generating demand history...")
    demand = build_demand_history(regions, climate)

    print("Generating reservoirs...")
    reservoirs = build_reservoirs(regions)

    print("Generating reservoir history...")
    reservoir_history = build_reservoir_history(reservoirs, regions, climate, demand)

    regions.to_csv(os.path.join(OUT_DIR, "regions.csv"), index=False)
    climate.to_csv(os.path.join(OUT_DIR, "climate_history.csv"), index=False)
    demand.to_csv(os.path.join(OUT_DIR, "demand_history.csv"), index=False)
    reservoirs.to_csv(os.path.join(OUT_DIR, "reservoirs.csv"), index=False)
    reservoir_history.to_csv(os.path.join(OUT_DIR, "reservoir_history.csv"), index=False)

    print(f"Done. Files written to {OUT_DIR}")
    print(f"  regions:            {len(regions)}")
    print(f"  climate rows:       {len(climate)}")
    print(f"  demand rows:        {len(demand)}")
    print(f"  reservoirs:         {len(reservoirs)}")
    print(f"  reservoir history:  {len(reservoir_history)}")


if __name__ == "__main__":
    main()
