from fastapi import APIRouter, Query
from ..store import store
from .scenario import _run

router = APIRouter(prefix="/api/overview", tags=["overview"])


@router.get("")
def overview(year: int = Query(2035, ge=2010, le=2050)):
    """National-level rollup for the dashboard landing page."""
    total_demand = 0.0
    total_supply = 0.0
    total_capacity_weighted_storage = 0.0
    total_capacity = 0.0
    high_risk_regions = 0
    region_summaries = []

    for _, region in store.regions.iterrows():
        result = _run(int(region.region_id), year, 0, 0, 0, 0, 0, 0, 0)
        total_demand += result["demand_mcm"]
        total_supply += result["supply_mcm"]
        region_capacity = sum(r["capacity_mcm"] for r in result["reservoirs"])
        total_capacity += region_capacity
        total_capacity_weighted_storage += result["storage_pct"] * region_capacity
        if result["risk_level"] in ("HIGH", "CRITICAL"):
            high_risk_regions += 1
        region_summaries.append({
            "region_id": int(region.region_id),
            "name": region["name"],
            "state": region.state,
            "risk_level": result["risk_level"],
            "deficit_mcm": result["deficit_mcm"],
        })

    avg_storage_pct = total_capacity_weighted_storage / total_capacity if total_capacity else 0

    # latest historical year for "current" snapshot
    latest_year = int(store.demand.year.max())
    current_demand = store.demand[store.demand.year == latest_year].total_mcm.sum()
    current_storage = store.reservoir_history[store.reservoir_history.year == latest_year]
    current_storage_pct = (
        (current_storage.storage_mcm.sum() / store.reservoirs.capacity_mcm.sum()) * 100
        if not current_storage.empty else 0
    )

    return {
        "forecast_year": year,
        "latest_historical_year": latest_year,
        "current_total_demand_mcm": round(float(current_demand), 1),
        "current_storage_pct": round(float(current_storage_pct), 1),
        "forecast_total_demand_mcm": round(total_demand, 1),
        "forecast_total_supply_mcm": round(total_supply, 1),
        "forecast_deficit_mcm": round(total_demand - total_supply, 1),
        "forecast_storage_pct": round(avg_storage_pct, 1),
        "high_risk_region_count": high_risk_regions,
        "total_regions": len(store.regions),
        "regions": region_summaries,
    }
