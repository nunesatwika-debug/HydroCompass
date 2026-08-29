from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from ..store import store
from ..simulation import project_population, project_climate, predict_demand_total, split_demand_by_sector

router = APIRouter(prefix="/api/forecast", tags=["forecast"])


class DemandForecastRequest(BaseModel):
    region_id: int
    start_year: int = Field(2026, ge=2010, le=2050)
    end_year: int = Field(2035, ge=2010, le=2050)


@router.post("/demand")
def forecast_demand(req: DemandForecastRequest):
    region = store.region_row(req.region_id)
    if region is None:
        raise HTTPException(status_code=404, detail="Region not found")
    if req.end_year < req.start_year:
        raise HTTPException(status_code=400, detail="end_year must be >= start_year")

    # historical (last 5 years on record)
    history = store.demand[store.demand.region_id == req.region_id].sort_values("year").tail(5)
    historical = [
        {
            "year": int(row.year),
            "domestic": row.domestic_mcm,
            "agriculture": row.agriculture_mcm,
            "industrial": row.industrial_mcm,
            "ecological": row.ecological_mcm,
            "total": row.total_mcm,
            "type": "historical",
        }
        for _, row in history.iterrows()
    ]

    forecast = []
    for year in range(req.start_year, req.end_year + 1):
        population = project_population(region, year)
        rainfall, temperature = project_climate(region, year)
        total = predict_demand_total(req.region_id, year, population, rainfall, temperature)
        split = split_demand_by_sector(req.region_id, total)
        forecast.append({"year": year, **split, "type": "forecast"})

    return {
        "region_id": req.region_id,
        "region_name": region["name"],
        "historical": historical,
        "forecast": forecast,
        "sector_split": {
            "domestic": region.domestic_share,
            "agriculture": region.agriculture_share,
            "industrial": region.industrial_share,
            "ecological": region.ecological_share,
        },
    }
