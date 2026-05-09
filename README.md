# Drift Triage Co-Pilot

An autonomous MLOps system that detects model drift, investigates its cause using a LangGraph agent, and executes remediation actions (replay, retrain, rollback) — with human-in-the-loop approval gates for high-risk operations.

Built for AIE Bootcamp Week 5.

---

## What it does

1. The **platform** serves predictions from a GradientBoosting bank-marketing classifier and periodically scores incoming prediction traffic for feature drift (PSI) and output distribution shift.
2. When severity transitions (e.g. `low → high`), the platform emits a drift webhook to the **agent**.
3. The **agent** (LangGraph) opens an investigation: it triages the drift, decides on an action, and either dispatches it directly (replay) or pauses for human approval (retrain, rollback).
4. Approved actions are queued to Redis and executed by the **platform worker** — retraining a new model or rolling back to a previous Production version in MLflow.
5. The **Streamlit dashboard** surfaces the registry state, active investigations, HIL inbox, and queue.

---

## Stack

| Layer | Technology |
|---|---|
| Model service | FastAPI + scikit-learn + MLflow |
| Drift detection | PSI (numeric), χ² (categorical), asyncio background loop |
| Agent | LangGraph (supervisor pattern) + Postgres checkpoints |
| LLM | OpenAI `gpt-4o-mini` / Anthropic `claude-haiku-4-5` |
| Queue | Redis (RQ) + dead-letter queue |
| Database | PostgreSQL (predictions, investigations, HIL inbox, action jobs) |
| Dashboard | Streamlit |
| Logging | structlog (structured key-value output) |

---

## Model

- **Dataset:** UCI Bank Marketing (`bank-additional-full.csv`, 41,188 rows, ~11% positive)
- **Algorithm:** `HistGradientBoostingClassifier` in a sklearn `Pipeline` with `ColumnTransformer`
- **Registered name:** `bank-marketing-classifier` (MLflow, version 2)
- **Test AUC:** 0.8136 | **Test F1:** 0.3558 | **Test Recall:** 0.7899
- **Operating threshold:** 0.340 — highest threshold satisfying recall ≥ 0.75 on validation set

See [`platform/mlops/model_card.md`](platform/mlops/model_card.md) for full metrics and known limits.

---

## Setup

```bash
cp .env.example .env
# Fill in OPENAI_API_KEY or ANTHROPIC_API_KEY, and AGENT_TOKEN
docker compose up -d
```

See [`RUNBOOK.md`](RUNBOOK.md) for first-time model training, drift injection, HIL approval flow, and all operational procedures.

---

## Docs

- [`ARCH.md`](ARCH.md) — service diagram, graph topology, drift scoring, auth model
- [`DECISIONS.md`](DECISIONS.md) — design decisions and trade-offs
- [`RUNBOOK.md`](RUNBOOK.md) — operational procedures (promote, rollback, queue monitoring, env vars)
