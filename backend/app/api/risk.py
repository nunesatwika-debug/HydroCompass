from fastapi import APIRouter, Query
from ..store import store
from .scenario import _run

router = APIRouter(prefix="/api/risk", tags=["risk"])


@router.get("")
def risk_map(year: int = Query(2035, ge=2010, le=2050)):
    """Baseline (no scenario deltas) risk for every region at the given
    year -- powers the national/state risk map."""
    out = []
    for _, region in store.regions.iterrows():
        result = _run(int(region.region_id), year, 0, 0, 0, 0, 0, 0, 0)
        out.append({
            "region_id": int(region.region_id),
            "name": region["name"],
            "state": region.state,
            "latitude": region.latitude,
            "longitude": region.longitude,
            "risk_score": result["risk_score"],
            "risk_level": result["risk_level"],
            "deficit_mcm": result["deficit_mcm"],
            "drought_probability": result["drought_probability"],
        })
    return out
