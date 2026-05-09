const DEFAULT_BACKEND = "http://localhost:8000"
const DEFAULT_PLATFORM = "http://localhost:8001"

function cfg() {
  const envBackend = process.env.NEXT_PUBLIC_BACKEND_URL ?? DEFAULT_BACKEND
  const envPlatform = process.env.NEXT_PUBLIC_PLATFORM_URL ?? DEFAULT_PLATFORM
  const envToken = process.env.NEXT_PUBLIC_AGENT_TOKEN ?? ""
  if (typeof window === "undefined") {
    return { backendUrl: envBackend, platformUrl: envPlatform, agentToken: envToken }
  }
  return {
    backendUrl: localStorage.getItem("dtc_backend_url") ?? envBackend,
    platformUrl: localStorage.getItem("dtc_platform_url") ?? envPlatform,
    agentToken: localStorage.getItem("dtc_agent_token") ?? envToken,
  }
}

function authHeaders(): Record<string, string> {
  const token = cfg().agentToken
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function get(url: string) {
  const r = await fetch(url, { cache: "no-store" })
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
  return r.json()
}

async function post(url: string, body?: unknown, auth = false) {
  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(auth ? authHeaders() : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  })
  if (!r.ok) {
    const text = await r.text()
    throw new Error(`${r.status}: ${text}`)
  }
  return r.json()
}

// ── Platform ──────────────────────────────────────────────────────────────────

export async function getModelInfo() {
  return get(`${cfg().platformUrl}/v1/model/info`)
}

export async function getStagingInfo() {
  return get(`${cfg().platformUrl}/v1/model/staging`)
}

export async function promote(payload: {
  model_name: string
  target_version: string
  approver_user_id: string
  request_id: string
  reason?: string
}) {
  return post(`${cfg().platformUrl}/v1/promote`, payload, true)
}

export async function triggerDriftCheck() {
  return post(`${cfg().platformUrl}/v1/drift/check`, undefined, true)
}

export async function injectPredictions(n: number): Promise<{ ok: number; fail: number }> {
  const result = await post(`${cfg().platformUrl}/v1/demo/inject?n=${n}`, undefined, true)
  return { ok: result.inserted ?? n, fail: 0 }
}

// ── Backend ───────────────────────────────────────────────────────────────────

export async function getInvestigations(status?: string, limit = 100) {
  const params = new URLSearchParams({ limit: String(limit) })
  if (status) params.set("status", status)
  return get(`${cfg().backendUrl}/v1/investigations?${params}`)
}

export async function getInvestigation(id: string) {
  return get(`${cfg().backendUrl}/v1/investigations/${id}`)
}

export async function getHILItems(status = "pending") {
  const params = new URLSearchParams({ status })
  return get(`${cfg().backendUrl}/v1/hil?${params}`)
}

export async function approveHIL(itemId: string, approverId: string) {
  return post(`${cfg().backendUrl}/v1/hil/${itemId}/approve`, { approver_user_id: approverId }, true)
}

export async function rejectHIL(itemId: string, approverId: string) {
  return post(`${cfg().backendUrl}/v1/hil/${itemId}/reject`, { approver_user_id: approverId }, true)
}

export async function getQueueStats() {
  return get(`${cfg().backendUrl}/v1/queue/stats`)
}
