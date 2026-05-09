"""POST /v1/demo/inject — clear predictions and insert synthetic drift-scenario rows.

Injection count maps to severity via euribor3m PSI:
  50  → α=0.00 → euribor PSI ≈ 0.02 → low
  100 → α=0.30 → euribor PSI ≈ 0.15 → medium
  150 → α=0.50 → euribor PSI ≈ 0.40 → high
  200 → α=0.60 → euribor PSI ≈ 0.58 → critical

All non-euribor features use reference-proportional histogram sampling so they
contribute near-zero PSI and don't accidentally trigger a higher severity band.
"""

import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_bearer_token
from app.core.config import settings
from app.core.dependencies import get_session
from app.db.models import Prediction

router = APIRouter(prefix="/v1", tags=["demo"])

# "Rates falling" target distribution for euribor3m bins (matches reference bin layout).
# Shifts mass from the reference peak [4.604–5.045] toward the low-rate cluster [0.634–1.516].
_EUR_SHIFT: list[float] = [0.35, 0.50, 0.05, 0.0, 0.0, 0.0, 0.0, 0.07, 0.02, 0.01]

# Blend fraction: (1-α)×reference + α×_EUR_SHIFT, calibrated to each PSI severity band.
_N_ALPHA: dict[int, float] = {50: 0.00, 100: 0.30, 150: 0.50, 200: 0.60}
_N_HINT: dict[int, str] = {50: "low", 100: "medium", 150: "high", 200: "critical"}


class InjectResponse(BaseModel):
    deleted: int
    inserted: int
    severity_hint: str


def _bin_values(bin_edges: list, freqs: list, n: int) -> list:
    """Return exactly n values. Each value is its bin's midpoint, repeated by rounded count."""
    midpoints = [(bin_edges[i] + bin_edges[i + 1]) / 2.0 for i in range(len(bin_edges) - 1)]
    counts = [round(f * n) for f in freqs]
    diff = n - sum(counts)
    if diff:
        idx = max(range(len(counts)), key=lambda i: counts[i])
        counts[idx] = max(0, counts[idx] + diff)
    out: list = []
    for mid, cnt in zip(midpoints, counts):
        out.extend([mid] * max(0, cnt))
    return out


def _cat_values(ref_freq: dict, n: int) -> list:
    """Return exactly n category strings in reference-proportional counts."""
    cats = list(ref_freq.keys())
    freqs = [ref_freq[c] for c in cats]
    counts = [round(f * n) for f in freqs]
    diff = n - sum(counts)
    if diff:
        idx = max(range(len(counts)), key=lambda i: counts[i])
        counts[idx] = max(0, counts[idx] + diff)
    out: list = []
    for cat, cnt in zip(cats, counts):
        out.extend([cat] * max(0, cnt))
    return out


def _build_rows(
    n: int,
    alpha: float,
    ref_stats: dict,
    model_name: str,
    model_version: str,
    threshold: float,
) -> list[Prediction]:
    num_stats = ref_stats["numeric"]
    cat_stats = ref_stats["categorical"]
    out_stats = ref_stats.get("output_distribution", {})

    # Euribor3m: blended reference + shift distribution drives severity.
    eur = num_stats["euribor3m"]
    blended = [(1 - alpha) * r + alpha * s for r, s in zip(eur["frequencies"], _EUR_SHIFT)]
    euribor_vals = _bin_values(eur["bin_edges"], blended, n)

    # All other numeric features: pure reference proportions (PSI ≈ 0).
    # Skip engineered features (was_contacted_before, days_since_contact) — they are
    # not in the raw payload; the detector skips them automatically.
    skip = {"euribor3m", "was_contacted_before", "days_since_contact"}
    numeric_vals: dict[str, list] = {"euribor3m": euribor_vals}
    for feat, info in num_stats.items():
        if feat not in skip:
            numeric_vals[feat] = _bin_values(info["bin_edges"], info["frequencies"], n)

    cat_vals: dict[str, list] = {
        feat: _cat_values(freq_dict, n) for feat, freq_dict in cat_stats.items()
    }

    # Probabilities from reference output distribution — keeps output PSI ≈ 0.
    if out_stats.get("bin_edges") and out_stats.get("frequencies"):
        prob_vals = _bin_values(out_stats["bin_edges"], out_stats["frequencies"], n)
    else:
        prob_vals = [0.15] * n

    now = datetime.now(timezone.utc)
    rows = []
    for i in range(n):
        payload = {
            "age": int(numeric_vals["age"][i]),
            "job": cat_vals["job"][i],
            "marital": cat_vals["marital"][i],
            "education": cat_vals["education"][i],
            "default": cat_vals["default"][i],
            "housing": cat_vals["housing"][i],
            "loan": cat_vals["loan"][i],
            "contact": cat_vals["contact"][i],
            "month": cat_vals["month"][i],
            "day_of_week": cat_vals["day_of_week"][i],
            "campaign": int(numeric_vals["campaign"][i]),
            "pdays": 999,
            "previous": int(numeric_vals["previous"][i]),
            "poutcome": cat_vals["poutcome"][i],
            "emp.var.rate": numeric_vals["emp.var.rate"][i],
            "cons.price.idx": numeric_vals["cons.price.idx"][i],
            "cons.conf.idx": numeric_vals["cons.conf.idx"][i],
            "euribor3m": euribor_vals[i],
            "nr.employed": numeric_vals["nr.employed"][i],
        }
        probability = float(prob_vals[i])
        rows.append(
            Prediction(
                id=uuid.uuid4(),
                model_name=model_name,
                model_version=model_version,
                threshold=threshold,
                probability=probability,
                prediction=probability > threshold,
                request_payload=payload,
                created_at=now,
            )
        )
    return rows


@router.post(
    "/demo/inject",
    response_model=InjectResponse,
    dependencies=[Depends(require_bearer_token)],
)
async def inject_demo_predictions(
    request: Request,
    n: Annotated[int, Query()] = 50,
    session: AsyncSession = Depends(get_session),
) -> InjectResponse:
    if n not in (50, 100, 150, 200):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="n must be one of 50, 100, 150, 200",
        )

    loaded_model = request.app.state.loaded_model

    del_result = await session.execute(
        delete(Prediction).where(Prediction.model_name == loaded_model.model_name)
    )
    deleted = del_result.rowcount

    rows = _build_rows(
        n=n,
        alpha=_N_ALPHA[n],
        ref_stats=loaded_model.reference_stats,
        model_name=loaded_model.model_name,
        model_version=loaded_model.model_version,
        threshold=settings.operating_threshold,
    )
    session.add_all(rows)
    await session.commit()

    return InjectResponse(deleted=deleted, inserted=n, severity_hint=_N_HINT[n])
