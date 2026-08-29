from fastapi import APIRouter, HTTPException
from ..store import store
from ..simulation import predict_inflow, drought_probability, project_climate

router = APIRouter(prefix="/api/reservoirs", tags=["reservoirs"])


def _risk_label(storage_pct: float) -> str:
    if storage_pct < 30:
        return "High"
    if storage_pct < 55:
        return "Medium"
    return "Low"


@router.get("")
def list_reservoirs():
    out = []
    for _, res in store.reservoirs.iterrows():
        latest = store.latest_reservoir_state(res.reservoir_id)
        out.append({
            "reservoir_id": int(res.reservoir_id),
            "name": res["name"],
            "region_id": int(res.region_id),
            "capacity_mcm": res.capacity_mcm,
            "storage_pct": float(latest.storage_pct),
            "storage_mcm": float(latest.storage_mcm),
            "risk": _risk_label(latest.storage_pct),
            "latitude": res.latitude,
            "longitude": res.longitude,
        })
    return out


@router.get("/{reservoir_id}")
def get_reservoir(reservoir_id: int):
    row = store.reservoirs[store.reservoirs.reservoir_id == reservoir_id]
    if row.empty:
        raise HTTPException(status_code=404, detail="Reservoir not found")
    res = row.iloc[0]
    latest = store.latest_reservoir_state(reservoir_id)
    region = store.region_row(int(res.region_id))

    # quick 5 & 10 year-ahead storage projection under "current trend" climate
    projections = {}
    for horizon_year in (int(latest.year) + 5, int(latest.year) + 10):
        rainfall, temperature = project_climate(region, horizon_year)
        inflow = predict_inflow(reservoir_id, int(res.region_id), horizon_year, rainfall, res.capacity_mcm)
        # rough: assume release matches recent average release trend
        recent_release = store.reservoir_history[
            store.reservoir_history.reservoir_id == reservoir_id
        ].sort_values("year").tail(3).release_mcm.mean()
        storage_est = max(0, min(res.capacity_mcm, latest.storage_mcm + (inflow - recent_release)
                                  * (horizon_year - int(latest.year))))
        projections[str(horizon_year)] = round(float(storage_est), 1)

    history = store.reservoir_history[
        store.reservoir_history.reservoir_id == reservoir_id
    ].sort_values("year")[["year", "storage_mcm", "storage_pct", "inflow_mcm", "release_mcm"]]

    return {
        "reservoir_id": int(res.reservoir_id),
        "name": res["name"],
        "region_id": int(res.region_id),
        "region_name": region["name"],
        "capacity_mcm": res.capacity_mcm,
        "current_storage_mcm": float(latest.storage_mcm),
        "storage_pct": float(latest.storage_pct),
        "current_inflow_mcm": float(latest.inflow_mcm),
        "current_release_mcm": float(latest.release_mcm),
        "risk": _risk_label(latest.storage_pct),
        "latitude": res.latitude,
        "longitude": res.longitude,
        "projected_storage_mcm": projections,
        "history": history.to_dict(orient="records"),
    }
