from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.lifespan import lifespan
from app.routers import actions, demo, drift, health, model_info, predict, promote

app = FastAPI(
    title="Drift Triage Co-Pilot — Platform",
    description="Model serving, drift detection, action dispatch, promotion gate.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(health.router)
app.include_router(predict.router)
app.include_router(drift.router)
app.include_router(demo.router)
app.include_router(actions.router)
app.include_router(promote.router)
app.include_router(model_info.router)
