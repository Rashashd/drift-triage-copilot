# Architecture

## Services

```
┌─────────────────────────────────────────────────────────────────────┐
│                         docker-compose                               │
│                                                                     │
│  ┌──────────────┐   drift webhook   ┌──────────────────────────┐   │
│  │   platform   │ ────────────────► │        backend           │   │
│  │  :8001       │                   │   (LangGraph agent) :8000│   │
│  │              │ ◄──── actions ─── │                          │   │
│  └──────┬───────┘                   └──────────────────────────┘   │
│         │                                        │                  │
│  ┌──────▼──────────┐              ┌──────────────▼──────────────┐  │
│  │ platform-worker │              │           redis              │  │
│  │  (RQ consumer)  │ ◄── queue ── │  queue + DLQ + idempotency  │  │
│  └─────────────────┘              └─────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                         postgres                             │  │
│  │   investigations · HIL inbox · predictions · drift snapshots │  │
│  │   action jobs · LangGraph checkpoints                        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────┐                                                   │
│  │   frontend   │  ──── reads ────► backend + platform             │
│  │  :8501       │  (Streamlit dashboard)                            │
│  └──────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

## Platform (`platform/`)

FastAPI service that owns the model and its data.

| Responsibility | Detail |
|---|---|
| Prediction serving | `POST /predict` — scores a single record, stores payload + probability |
| Drift detection | Periodic loop every `DRIFT_CHECK_INTERVAL_SECONDS` (default 600 s); also `POST /v1/drift/check` for immediate checks |
| Drift scoring | PSI (numeric features + output distribution), χ² (categorical features) |
| Severity classification | `low / medium / high / critical` based on max PSI across all features |
| Webhook emission | Fires `POST /v1/webhooks/drift` on the agent **only on severity transitions** |
| Action execution | `platform-worker` (RQ) runs `retrain`, `rollback`, `replay` jobs |
| Model registry | MLflow local tracking (`mlruns/`); versions are integers |

### Drift severity bands (PSI)

| Level | Threshold |
|---|---|
| low | < 0.10 |
| medium | 0.10 – 0.25 |
| high | 0.25 – 0.50 |
| critical | ≥ 0.50 |

χ² is computed per categorical feature and stored in the snapshot/webhook but is **not used for severity classification** (its threshold varies by degrees of freedom).

## Backend / Agent (`backend/`)

FastAPI service wrapping a LangGraph investigation graph.

### Graph topology

```
  webhook received
        │
        ▼
   [supervisor] ──► [triage] ──► [supervisor] ──► [action] ──► [supervisor]
        │                                              │
        │                               (retrain/rollback only)
        │                                     interrupt — wait for HIL
        │                                     resume on approve
        │                                              │
        └───────────────────────────────────────── [dispatch] ──► [supervisor]
                                                              ──► [comms] ──► END
```

Every sub-node (`triage`, `action`, `comms`, `dispatch`) returns to `supervisor`, which reads the current state and routes to the next step. This makes the graph re-entrant: after a HIL interrupt and resume, the supervisor picks up exactly where it left off.

### Supervisor staleness guard

On every tick, the supervisor re-fetches the current Production model URI from the platform. If it differs from `model_uri_at_open` (the URI when the investigation was opened), the investigation is immediately closed as stale. This prevents acting on a drift event that is no longer relevant.

### Agent nodes

| Node | LLM call | Output |
|---|---|---|
| `triage` | yes | `real_drift` or `no_drift` |
| `action` | yes | `no_op / replay / retrain / rollback` |
| `comms` | yes | human-readable `summary` + `resolution` |
| `dispatch` | no | enqueues the job payload to Redis |

LLM: OpenAI `gpt-4o-mini` (if `OPENAI_API_KEY` set) or Anthropic `claude-haiku-4-5` (if `ANTHROPIC_API_KEY` set). OpenAI is checked first.

### HIL (Human-in-the-Loop)

`retrain` and `rollback` actions require human approval before the job is dispatched. The `action` node calls LangGraph's `interrupt()`, which suspends the graph and writes a `HILInboxItem` to Postgres. The `POST /v1/hil/{item_id}/approve` endpoint resumes the graph via `graph.ainvoke(Command(resume=...))`.

`replay` does not require HIL — it is read-only (re-runs the model on historical records).

## Contracts (`contracts/`)

Shared Pydantic schemas mounted into both `platform` and `backend` containers:

- `contracts/v1/webhooks.py` — `DriftEvent` (platform → agent)
- `contracts/v1/actions.py` — `ActionRequest / ActionResponse` (agent → platform)

## Model

- Registered name: `bank-marketing-classifier`
- Algorithm: `HistGradientBoostingClassifier` wrapped in a sklearn `Pipeline` with `ColumnTransformer`
- Operating threshold: **0.340** (stored as `OPERATING_THRESHOLD` env var, not baked into the artifact)
- Baseline version: **2** (integer, required by MLflow's `transition_model_version_stage`)
- Retrained models are registered as new versions; promotion to Production is explicit

## Auth

All write endpoints require `Authorization: Bearer <AGENT_TOKEN>`:

| Service | Protected endpoints |
|---|---|
| platform | `POST /v1/actions`, `POST /v1/drift/check`, `POST /v1/promote` |
| backend | `POST /v1/webhooks/drift`, `POST /v1/hil/{id}/approve`, `POST /v1/hil/{id}/reject` |

Read endpoints (GET investigations, GET HIL items, GET queue stats) are open for dashboard access.
