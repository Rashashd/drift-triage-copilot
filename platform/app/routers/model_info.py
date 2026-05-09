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
    try:
        mv = client.get_model_version_by_alias(model_name, "staging")
        return {
            "model_name": model_name,
            "staging_version": mv.version,
            "model_uri": f"models:/{model_name}/{mv.version}",
        }
    except mlflow.exceptions.MlflowException:
        return {"model_name": model_name, "staging_version": None, "model_uri": None}
