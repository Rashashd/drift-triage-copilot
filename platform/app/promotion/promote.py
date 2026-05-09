"""MLflow alias-based promotion. Moves 'staging' alias to 'champion' (production)."""

import structlog
import mlflow

from app.core.config import settings

logger = structlog.get_logger()


def promote_to_production(model_name: str, target_version: str) -> tuple[str, list[str]]:
    """
    Set the 'champion' alias on target_version (MLflow 3.x replaces stage transitions).
    Clears the 'staging' alias if it pointed at the same version.

    Returns (promoted_version, previously_champion_versions).
    """
    mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
    client = mlflow.MlflowClient()

    try:
        old_prod = client.get_model_version_by_alias(model_name, "production")
        previously_prod = [old_prod.version]
    except mlflow.exceptions.MlflowException:
        previously_prod = []

    client.set_registered_model_alias(model_name, "production", target_version)

    try:
        staging_mv = client.get_model_version_by_alias(model_name, "staging")
        if staging_mv.version == target_version:
            client.delete_registered_model_alias(model_name, "staging")
    except mlflow.exceptions.MlflowException:
        pass

    logger.info("promotion.complete", model_name=model_name, version=target_version, previously_prod=previously_prod)
    return target_version, previously_prod
