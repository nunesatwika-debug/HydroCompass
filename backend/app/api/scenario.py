from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from ..store import store
from ..simulation import (
    project_population, project_climate, predict_demand_total, split_demand_by_sector,
    predict_inflow, simulate_reservoir, drought_probability, risk_score,
    estimate_shortage_year, build_recommendations,
)

router = APIRouter(prefix="/api/scenario", tags=["scenario"])


class ScenarioRequest(BaseModel):
    region_id: int
    year: int = Field(2035, ge=2010, le=2050)

    population_change: float = Field(0.0, ge=-0.5, le=1.0, description="e.g. 0.15 = +15%")
    rainfall_change: float = Field(0.0, ge=-0.9, le=0.9)
    temperature_change: float = Field(0.0, ge=-5, le=8, description="degrees C delta")

    agriculture_change: float = Field(0.0, ge=-0.9, le=1.0)
    industrial_change: float = Field(0.0, ge=-0.9, le=1.0)

    irrigation_efficiency: float = Field(0.0, ge=0.0, le=0.6, description="0.1 = 10% demand reduction on agriculture")
    additional_storage: float = Field(0.0, ge=0.0, le=2.0, description="0.2 = +20% reservoir capacity")


def _run(region_id: int, year: int, population_change: float, rainfall_change: float,
         temperature_change: float, agriculture_change: float, industrial_change: float,
         irrigation_efficiency: float, additional_storage: float):
    region = store.region_row(region_id)
    if region is None:
        raise HTTPException(status_code=404, detail="Region not found")

    population = project_population(region, year) * (1 + population_change)
    rainfall, temperature = project_climate(region, year, rainfall_change, temperature_change)

    total_demand = predict_demand_total(region_id, year, population, rainfall, temperature)
    net_agriculture_change = agriculture_change - irrigation_efficiency
    split = split_demand_by_sector(region_id, total_demand, net_agriculture_change, industrial_change)
    demand_mcm = split["total"]

    reservoirs = store.reservoirs_for_region(region_id)
    total_supply = 0.0
    total_capacity = 0.0
    total_inflow = 0.0
    reservoir_results = []
    for _, res in reservoirs.iterrows():
        latest = store.latest_reservoir_state(res.reservoir_id)
        inflow = predict_inflow(res.reservoir_id, region_id, year, rainfall, res.capacity_mcm)
        n = len(reservoirs)
        result = simulate_reservoir(res, latest.storage_mcm, inflow, demand_mcm / n, additional_storage)
        reservoir_results.append({"reservoir_id": int(res.reservoir_id), "name": res["name"], **result})
        total_supply += result["release_mcm"]
        total_capacity += result["capacity_mcm"]
        total_inflow += result["inflow_mcm"]

    avg_storage_pct = (
        sum(r["storage_pct"] * r["capacity_mcm"] for r in reservoir_results) / total_capacity
        if total_capacity else 0
    )
    deficit = max(0.0, demand_mcm - total_supply)
    d_prob = drought_probability(rainfall, region.base_rainfall_mm, avg_storage_pct)
    risk = risk_score(deficit, demand_mcm, avg_storage_pct, d_prob)
    shortage_year = estimate_shortage_year(year, avg_storage_pct, deficit, demand_mcm)
    recommendations = build_recommendations(deficit, avg_storage_pct, risk["risk_level"])

    return {
        "region_id": region_id,
        "region_name": region["name"],
        "year": year,
        "population": int(population),
        "rainfall_mm": round(rainfall, 1),
        "temperature_c": round(temperature, 2),
        "demand_mcm": round(demand_mcm, 1),
        "demand_split": split,
        "supply_mcm": round(total_supply, 1),
        "inflow_mcm": round(total_inflow, 1),
        "deficit_mcm": round(deficit, 1),
        "storage_pct": round(avg_storage_pct, 1),
        "drought_probability": round(d_prob, 2),
        "risk_score": risk["risk_score"],
        "risk_level": risk["risk_level"],
        "shortage_year": shortage_year,
        "reservoirs": reservoir_results,
        "recommendations": recommendations,
    }


@router.post("/simulate")
def simulate_scenario(req: ScenarioRequest):
    """Runs the full scenario pipeline AND a 'current trend' baseline (all
    deltas = 0) for the same year so the frontend can show a side-by-side
    current-vs-scenario comparison in one call."""
    baseline = _run(req.region_id, req.year, 0, 0, 0, 0, 0, 0, 0)
    scenario = _run(
        req.region_id, req.year,
        req.population_change, req.rainfall_change, req.temperature_change,
        req.agriculture_change, req.industrial_change,
        req.irrigation_efficiency, req.additional_storage,
    )
    return {"baseline": baseline, "scenario": scenario}
