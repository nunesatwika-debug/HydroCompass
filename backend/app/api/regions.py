from fastapi import APIRouter, HTTPException
from ..store import store

router = APIRouter(prefix="/api/regions", tags=["regions"])


@router.get("")
def list_regions():
    df = store.regions[["region_id", "name", "state", "latitude", "longitude"]]
    return df.to_dict(orient="records")


@router.get("/{region_id}")
def get_region(region_id: int):
    row = store.region_row(region_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Region not found")
    latest_climate = store.latest_climate(region_id)
    latest_demand = store.demand[
        (store.demand.region_id == region_id)
    ].sort_values("year").iloc[-1]

    return {
        "region_id": int(row.region_id),
        "name": row["name"],
        "state": row.state,
        "population": int(latest_demand.population),
        "latitude": row.latitude,
        "longitude": row.longitude,
        "latest_year": int(latest_demand.year),
        "latest_rainfall_mm": float(latest_climate.rainfall_mm),
        "latest_temperature_c": float(latest_climate.temperature_c),
        "latest_demand_mcm": float(latest_demand.total_mcm),
        "sector_split": {
            "domestic": row.domestic_share,
            "agriculture": row.agriculture_share,
            "industrial": row.industrial_share,
            "ecological": row.ecological_share,
        },
    }
