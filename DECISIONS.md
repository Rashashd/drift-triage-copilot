# Design Decisions

## 1. Two-service split: platform vs. agent

**Decision:** The model service (`platform`) and the investigation agent (`backend`) are separate FastAPI apps with an explicit HTTP contract between them.

**Why:** The platform owns model serving, drift data, and remediation actions — all MLOps concerns. The agent owns investigation logic and human interaction — all agentic concerns. Keeping them separate means each can be deployed, scaled, and tested independently. The contract (`contracts/`) is the only coupling point.

---

## 2. LangGraph supervisor pattern

**Decision:** All agent nodes (`triage`, `action`, `comms`, `dispatch`) return to a central `supervisor` node after each step, rather than forming a static linear chain.

**Why:** The investigation flow is conditional. Whether `action` runs depends on `triage`'s verdict; whether `dispatch` runs depends on `action`'s decision; a HIL interrupt can pause execution mid-graph and resume it later. A supervisor hub makes all routing decisions explicit and keeps the graph re-entrant by design.

---

## 3. HIL only for retrain and rollback, not replay

**Decision:** `retrain` and `rollback` gate on human approval via `interrupt()`. `replay` dispatches immediately without approval.

**Why:** Retrain registers a new model version; rollback promotes a different version to Production — both change what serves live traffic. Replay only re-runs the model on historical records to gather diagnostic data. It is read-only and reversible, so the risk profile does not warrant blocking the graph on human approval.

---

## 4. Severity transitions trigger webhooks, not every drift check

**Decision:** The platform emits a drift webhook only when severity changes (`previous_severity != severity`). It also suppresses the very first reading if severity is `low`.

**Why:** Drift checks run on a timer (every 10 minutes by default). Emitting a webhook on every check would open a new investigation each time, flooding the agent with duplicate work. Severity transitions are the meaningful signal — they indicate the situation is getting worse (or recovering).

---

## 5. Idempotency keys on action dispatch

**Decision:** Every action job is keyed by `SHA-256(investigation_id + action + model_uri)`. The platform stores this key in Redis and rejects duplicates.

**Why:** The agent's `dispatch` node can re-run if the graph is replayed or a request is retried. Without idempotency, the same retrain or rollback would be executed multiple times. The key is deterministic so retries always produce the same key and hit the deduplication guard.

---

## 6. Operating threshold stored as config, not in the model artifact

**Decision:** The serving threshold (0.340) is stored in `OPERATING_THRESHOLD` env var and loaded at prediction time, not embedded in the sklearn pipeline.

**Why:** The threshold is a business and compliance decision (recall ≥ 0.75), not a model parameter. It can be adjusted without retraining. Storing it separately allows operators to tune it for different deployment contexts without touching the model registry.

---

## 7. Postgres for LangGraph checkpoints

**Decision:** `AsyncPostgresSaver` is used as the LangGraph checkpointer, not an in-memory or SQLite store.

**Why:** Investigations can be interrupted mid-graph (HIL pause) and must survive backend restarts. Postgres is already in the stack for application data, so reusing it for checkpoints avoids adding another dependency. It also means the full investigation state is queryable alongside the `Investigation` row.

---

## 8. PSI for severity, χ² reported but not classified

**Decision:** Severity level (`low / medium / high / critical`) is determined solely by the maximum PSI across numeric features and output distribution. χ² scores for categorical features are computed and stored but do not affect severity.

**Why:** PSI has well-established universal bands (< 0.1 / 0.1–0.25 / 0.25–0.5 / > 0.5) that apply regardless of feature. χ²'s threshold depends on degrees of freedom, which varies per feature and sample size — there is no single cutoff that applies across all categorical columns. Reporting χ² gives operators a signal without requiring us to calibrate per-feature thresholds.

---

## 9. MLflow integer versions for the model registry

**Decision:** Model versions in MLflow are plain integers (e.g., `2`), not semantic version strings.

**Why:** MLflow's `transition_model_version_stage()` requires an integer version. Semantic strings like `v0.1.0-week5` cause a runtime error. The operating version is tracked in the platform config (`MODEL_VERSION`) and updated whenever a new model is promoted to Production.

---

## 10. Auto drift check loop with manual override

**Decision:** The platform runs a background `asyncio` loop that calls `run_drift_check()` every `DRIFT_CHECK_INTERVAL_SECONDS`. A `POST /v1/drift/check` endpoint is also available for immediate checks.

**Why:** Operators should not need to remember to trigger drift checks — detection should be automatic. But during testing, development, or incident response, waiting for the timer is impractical. Both paths call the same `run_drift_check()` function, so there is no divergence in logic.

---

## 11. CORS on agent backend only, not platform

**Decision:** CORS middleware is added to the `backend` FastAPI app (allowing `localhost:8501` and `frontend:8501`). The platform has no CORS middleware.

**Why:** The Streamlit frontend makes HTTP calls server-side (Python `httpx`), not from a browser. Browser-origin CORS restrictions do not apply to server-side requests. CORS on the platform would be unused configuration noise. The backend may eventually be called directly from browser-based tools, so CORS there is forward-looking.

---

## 12. Bearer token auth on write endpoints only

**Decision:** Read endpoints (GET investigations, GET HIL items, GET queue stats) are open. Write endpoints (POST webhook, POST approve/reject, POST actions) require `Authorization: Bearer <AGENT_TOKEN>`.

**Why:** The dashboard needs to read data without embedding credentials in the Streamlit app. Write endpoints, by contrast, trigger graph execution, model rollbacks, and HIL decisions — these must be authenticated. A single shared token (`AGENT_TOKEN`) keeps the auth model simple for a single-tenant deployment.

---

## 13. structlog over stdlib logging

**Decision:** Both `platform` and `backend` use `structlog` for all log output instead of Python's standard `logging` module.

**Why:** Agent systems produce deeply nested, event-driven flows where correlating a log line back to a specific investigation requires context that plain string messages cannot carry reliably. `structlog` emits key-value pairs (e.g. `investigation_id=`, `severity=`, `action=`) that can be filtered and aggregated without regex parsing. Every log call in the codebase uses named arguments (`logger.info("triage.complete", verdict=result.verdict)`) rather than interpolated strings, which makes log ingestion into structured backends (Datadog, CloudWatch, etc.) straightforward without configuration changes.
