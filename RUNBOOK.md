# Runbook

## Prerequisites

- Docker + Docker Compose
- `.env` file populated (copy `.env.example` and fill in secrets)
- At least one of `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` set
- `AGENT_TOKEN` set (used by platform → agent webhook auth and HIL endpoints)

---

## 1. First-time setup

```bash
# 1. Train and register the baseline model
cd platform
uv run python -m mlops.ml_model
cd ..

# 2. Start all services
docker compose up -d

# 3. Verify health
curl http://localhost:8000/health   # agent
curl http://localhost:8001/health   # platform
```

The baseline model must be registered in MLflow before the platform starts, because the platform loads the model artifact and reference stats on startup.

---

## 2. Injecting drift (for testing)

Send prediction requests with out-of-distribution feature values. The platform stores every prediction; once enough have accumulated the next drift check will detect the shift.

```bash
# Example: inject 50 drift predictions (high pdays / unusual job mix)
for i in $(seq 1 50); do
  curl -s -X POST http://localhost:8001/predict \
    -H "Content-Type: application/json" \
    -d '{
      "age": 75, "job": "retired", "marital": "single",
      "education": "illiterate", "default": "yes", "housing": "no",
      "loan": "yes", "contact": "telephone", "month": "dec",
      "day_of_week": "mon", "campaign": 20, "pdays": 1,
      "previous": 0, "poutcome": "failure",
      "emp.var.rate": 1.4, "cons.price.idx": 94.465,
      "cons.conf.idx": -41.8, "euribor3m": 4.964,
      "nr.employed": 5228.1
    }' > /dev/null
done
```

---

## 3. Triggering a drift check manually

```bash
curl -s -X POST http://localhost:8001/v1/drift/check \
  -H "Authorization: Bearer $AGENT_TOKEN" | jq .
```

Returns the computed severity, PSI scores, and whether a webhook was emitted to the agent.

---

## 4. Watching an investigation

```bash
# List open investigations
curl -s http://localhost:8000/v1/investigations | jq .

# Get a specific investigation
curl -s http://localhost:8000/v1/investigations/<id> | jq .
```

The investigation moves through `open → resolved` automatically. If the action is `retrain` or `rollback`, it will pause at `pending HIL approval`.

---

## 5. HIL approval flow

```bash
# See pending HIL items
curl -s "http://localhost:8000/v1/hil?status=pending" | jq .

# Approve
curl -s -X POST http://localhost:8000/v1/hil/<item_id>/approve \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"approver_user_id": "ops-engineer"}' | jq .

# Reject
curl -s -X POST http://localhost:8000/v1/hil/<item_id>/reject \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"approver_user_id": "ops-engineer", "reason": "not ready"}' | jq .
```

On approval, the agent graph resumes automatically in the background and dispatches the job to the platform worker.

---

## 6. Monitoring the queue

```bash
# Queue depth + job details
curl -s http://localhost:8000/v1/queue/stats | jq .
```

Returns active jobs (with action type, investigation ID, model URI) and any dead-letter queue (DLQ) entries for failed jobs.

---

## 7. Promoting a retrained model to Production

After a retrain job completes, the new model version is registered in MLflow but not yet live. Promote it explicitly:

```bash
curl -s -X POST http://localhost:8001/v1/promote \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model_name": "bank-marketing-classifier", "version": "<new_version>"}' | jq .
```

This transitions the target version to `Production` and archives whatever was previously Production.

---

## 8. Rollback

Rollback is handled automatically by the agent when it decides `rollback` and HIL approves. It promotes the `model_uri_at_open` version back to Production via `transition_model_version_stage`.

To trigger a rollback manually:

```bash
curl -s -X POST http://localhost:8001/v1/actions \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "investigation_id": "<uuid>",
    "action": "rollback",
    "target_model_uri": "models:/bank-marketing-classifier/2",
    "approver_user_id": "ops-engineer",
    "payload": {}
  }' | jq .
```

---

## 9. Checking MLflow registry state

MLflow runs locally at `file:./mlruns`. To inspect via the UI:

```bash
cd platform
uv run mlflow ui --port 5001
# open http://localhost:5001
```

---

## 10. Environment variables reference

| Variable | Service | Description |
|---|---|---|
| `DATABASE_URL` | all | Postgres connection string |
| `REDIS_URL` | all | Redis connection string |
| `AGENT_TOKEN` | platform + backend | Shared bearer token for write endpoints |
| `OPENAI_API_KEY` | backend | OpenAI key (checked first) |
| `ANTHROPIC_API_KEY` | backend | Anthropic key (fallback if no OpenAI key) |
| `DRIFT_CHECK_INTERVAL_SECONDS` | platform | Auto drift check interval (default 600) |
| `DRIFT_WINDOW_SIZE` | platform | Number of recent predictions to score (default 1000) |
| `OPERATING_THRESHOLD` | platform | Model prediction threshold (default 0.340) |
| `MODEL_VERSION` | platform | Active MLflow model version (default `2`) |
| `LANGSMITH_API_KEY` | backend | Optional LangSmith tracing |
| `LANGSMITH_TRACING` | backend | Set to `true` to enable tracing |
