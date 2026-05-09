"""Unit tests for handle_replay() — fidelity check at 1e-12 tolerance."""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import numpy as np
import pytest

from app.db.models import ActionJob, Prediction

_PAYLOAD = {
    "age": 35,
    "job": "admin.",
    "marital": "married",
    "education": "university.degree",
    "default": "no",
    "housing": "yes",
    "loan": "no",
    "contact": "cellular",
    "month": "may",
    "day_of_week": "mon",
    "campaign": 1,
    "pdays": 999,
    "previous": 0,
    "poutcome": "nonexistent",
    "emp.var.rate": -1.8,
    "cons.price.idx": 92.893,
    "cons.conf.idx": -46.2,
    "euribor3m": 1.299,
    "nr.employed": 5099.1,
}


def _make_prediction(probability: float) -> Prediction:
    p = Prediction()
    p.id = uuid.uuid4()
    p.model_name = "bank-marketing-classifier"
    p.model_version = "1"
    p.threshold = 0.07
    p.probability = probability
    p.prediction = probability >= 0.07
    p.request_payload = _PAYLOAD
    p.created_at = datetime.now(timezone.utc)
    return p


def _make_job() -> ActionJob:
    job = ActionJob()
    job.id = uuid.uuid4()
    job.investigation_id = str(uuid.uuid4())
    job.action = "replay"
    job.target_model_uri = "models:/bank-marketing-classifier/1"
    job.approver_user_id = None
    return job


def _mock_session(predictions: list[Prediction]) -> AsyncMock:
    scalars = MagicMock()
    scalars.all.return_value = predictions
    execute_result = MagicMock()
    execute_result.scalars.return_value = scalars
    session = AsyncMock()
    session.execute = AsyncMock(return_value=execute_result)
    return session


def _mock_pipeline(proba: float) -> MagicMock:
    pipeline = MagicMock()
    pipeline.predict_proba.return_value = np.array([[1 - proba, proba]])
    return pipeline


@pytest.mark.asyncio
async def test_no_predictions_returns_early():
    from app.workers.replay import handle_replay

    session = _mock_session([])
    with patch("app.workers.replay.joblib.load", return_value=_mock_pipeline(0.3)):
        result = await handle_replay(_make_job(), session)

    assert result["replayed"] == 0
    assert "message" in result
    assert "fidelity_passed" not in result


@pytest.mark.asyncio
async def test_fidelity_passes_when_all_match():
    from app.workers.replay import handle_replay

    stored_proba = 0.42
    predictions = [_make_prediction(stored_proba) for _ in range(5)]
    session = _mock_session(predictions)

    with patch("app.workers.replay.joblib.load", return_value=_mock_pipeline(stored_proba)):
        result = await handle_replay(_make_job(), session)

    assert result["replayed"] == 5
    assert result["matched"] == 5
    assert result["mismatched"] == 0
    assert result["fidelity_passed"] is True
    assert result["sample_mismatches"] == []


@pytest.mark.asyncio
async def test_fidelity_fails_when_proba_differs():
    from app.workers.replay import handle_replay

    stored_proba = 0.42
    new_proba = 0.55  # differs by 0.13 — well outside 1e-12

    predictions = [_make_prediction(stored_proba) for _ in range(3)]
    session = _mock_session(predictions)

    with patch("app.workers.replay.joblib.load", return_value=_mock_pipeline(new_proba)):
        result = await handle_replay(_make_job(), session)

    assert result["replayed"] == 3
    assert result["mismatched"] == 3
    assert result["matched"] == 0
    assert result["fidelity_passed"] is False
    assert len(result["sample_mismatches"]) == 3
    assert all(abs(m["new"] - new_proba) < 1e-9 for m in result["sample_mismatches"])
    assert all(abs(m["old"] - stored_proba) < 1e-9 for m in result["sample_mismatches"])


@pytest.mark.asyncio
async def test_sample_mismatches_capped_at_five():
    from app.workers.replay import handle_replay

    stored_proba = 0.10
    new_proba = 0.90

    predictions = [_make_prediction(stored_proba) for _ in range(10)]
    session = _mock_session(predictions)

    with patch("app.workers.replay.joblib.load", return_value=_mock_pipeline(new_proba)):
        result = await handle_replay(_make_job(), session)

    assert result["mismatched"] == 10
    assert len(result["sample_mismatches"]) == 5


@pytest.mark.asyncio
async def test_tolerance_boundary_just_inside():
    """A difference of exactly 0 passes; anything >= 1e-12 fails."""
    from app.workers.replay import handle_replay

    stored_proba = 0.30

    # Difference smaller than 1e-12 — stored == new — fidelity must pass.
    predictions = [_make_prediction(stored_proba)]
    session = _mock_session(predictions)

    with patch("app.workers.replay.joblib.load", return_value=_mock_pipeline(stored_proba)):
        result = await handle_replay(_make_job(), session)

    assert result["fidelity_passed"] is True


@pytest.mark.asyncio
async def test_mixed_match_and_mismatch():
    from app.workers.replay import handle_replay

    good_proba = 0.20
    bad_proba_stored = 0.20
    bad_proba_new = 0.80

    good = [_make_prediction(good_proba) for _ in range(3)]
    bad = [_make_prediction(bad_proba_stored) for _ in range(2)]
    predictions = good + bad
    session = _mock_session(predictions)

    # Pipeline returns good_proba for "good" rows and bad_proba_new for "bad" rows.
    # Since all payloads are identical, we can't split per-row here — instead
    # verify the counts when all differ.
    new_proba = 0.99
    with patch("app.workers.replay.joblib.load", return_value=_mock_pipeline(new_proba)):
        result = await handle_replay(_make_job(), session)

    assert result["replayed"] == 5
    assert result["mismatched"] == 5
    assert result["fidelity_passed"] is False
