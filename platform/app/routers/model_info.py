"""GET /v1/model/info and /v1/model/staging — model identity endpoints."""

import mlflow
from fastapi import APIRouter, Request

from app.core.config import settings

router = APIRouter(prefix="/v1/model", tags=["model"])


@router.get("/info")
async def model_info(request: Request) -> dict[str, str]:
    model = request.app.state.loaded_model
    return {
        "model_name": model.model_name,
        "model_version": model.model_version,
        "model_uri": f"models:/{model.model_name}/{model.model_version}",
    }


@router.get("/staging")
async def staging_info(request: Request) -> dict:
    model_name = request.app.state.loaded_model.model_name
    mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
    client = mlflow.MlflowClient()
    staging_versions = [
        mv for mv in client.search_model_versions(f"name='{model_name}'")
        if mv.current_stage == "Staging"
    ]
    if not staging_versions:
        return {"model_name": model_name, "staging_version": None, "model_uri": None}
    latest = max(staging_versions, key=lambda mv: int(mv.version))
    return {
        "model_name": model_name,
        "staging_version": latest.version,
        "model_uri": f"models:/{model_name}/{latest.version}",
    }
