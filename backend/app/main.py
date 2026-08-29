from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import regions, reservoirs, forecast, scenario, risk, overview

app = FastAPI(
    title="HydroCompass API",
    description="Water resource forecasting, simulation and risk API (MVP)",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten before production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(regions.router)
app.include_router(reservoirs.router)
app.include_router(forecast.router)
app.include_router(scenario.router)
app.include_router(risk.router)
app.include_router(overview.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "HydroCompass API", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "healthy"}
