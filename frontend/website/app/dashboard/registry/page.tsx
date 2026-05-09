"use client"

import { useEffect, useState } from "react"
import { getModelInfo, getStagingInfo, promote } from "@/lib/api"

type ModelInfo = { model_name: string; model_version: string; model_uri: string }
type StagingInfo = { model_name: string; staging_version: string | null; model_uri: string | null }

export default function RegistryPage() {
  const [prod, setProd] = useState<ModelInfo | null>(null)
  const [staging, setStaging] = useState<StagingInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [promoting, setPromoting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string; checklist?: { name: string; passed: boolean; detail?: string }[] } | null>(null)

  async function load() {
    setLoading(true)
    setErr("")
    setResult(null)
    try {
      const [p, s] = await Promise.all([getModelInfo(), getStagingInfo()])
      setProd(p)
      setStaging(s)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  async function handlePromote() {
    if (!staging?.staging_version || !staging.model_name) return
    setPromoting(true)
    setResult(null)
    try {
      const res = await promote({
        model_name: staging.model_name,
        target_version: staging.staging_version,
        approver_user_id: "dashboard-operator",
        request_id: crypto.randomUUID(),
        reason: "Manual promotion from dashboard",
      })
      setResult({ ok: res.promoted, msg: res.message, checklist: res.checklist })
      if (res.promoted) load()
    } catch (e: unknown) {
      setResult({ ok: false, msg: e instanceof Error ? e.message : String(e) })
    } finally {
      setPromoting(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Registry</h1>
          <p className="text-sm text-white/35 mt-0.5">MLflow model versions</p>
        </div>
        <button onClick={load} className="px-4 py-2 rounded-xl border border-white/[0.08] text-sm text-white/40 hover:text-white/70 hover:border-white/[0.15] transition-colors font-mono">
          Refresh
        </button>
      </div>

      {err && <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/20 text-sm text-red-400 font-mono">{err}</div>}

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => <div key={i} className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.02] p-6 animate-pulse h-36" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Production */}
          <div className="rounded-[1.5rem] border border-[#4ade80]/15 bg-[#4ade80]/[0.02] p-6">
            <div className="flex items-center justify-between mb-5">
              <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest">Production</p>
              <span className="px-2.5 py-1 rounded-full bg-[#4ade80]/10 border border-[#4ade80]/20 text-[10px] font-mono text-[#4ade80]">active</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { k: "Name", v: prod?.model_name },
                { k: "Version", v: prod?.model_version },
                { k: "URI", v: prod?.model_uri },
              ].map((f) => (
                <div key={f.k}>
                  <p className="text-[10px] text-white/25 font-mono mb-1">{f.k}</p>
                  <p className="text-sm text-white/70 font-mono truncate">{f.v ?? "—"}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Staging */}
          <div className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.02] p-6">
            <div className="flex items-center justify-between mb-5">
              <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest">Staging candidate</p>
              {staging?.staging_version
                ? <span className="px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-[10px] font-mono text-yellow-400">ready</span>
                : <span className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono text-white/30">none</span>
              }
            </div>

            {staging?.staging_version ? (
              <>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { k: "Name", v: staging.model_name },
                    { k: "Version", v: staging.staging_version },
                    { k: "URI", v: staging.model_uri },
                  ].map((f) => (
                    <div key={f.k}>
                      <p className="text-[10px] text-white/25 font-mono mb-1">{f.k}</p>
                      <p className="text-sm text-white/70 font-mono truncate">{f.v ?? "—"}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handlePromote}
                  disabled={promoting}
                  className="w-full py-3 rounded-xl bg-[#4ade80] text-[#08080d] text-sm font-semibold hover:bg-[#86efac] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {promoting ? "Promoting…" : "Promote to Production"}
                </button>
              </>
            ) : (
              <p className="text-sm text-white/30">No model in Staging — nothing to promote.</p>
            )}
          </div>

          {/* Result */}
          {result && (
            <div className={`rounded-[1.5rem] border p-6 ${result.ok ? "border-[#4ade80]/20 bg-[#4ade80]/[0.03]" : "border-red-500/20 bg-red-500/[0.03]"}`}>
              <p className={`text-sm font-mono ${result.ok ? "text-[#4ade80]" : "text-red-400"}`}>{result.msg}</p>
              {result.checklist && !result.ok && (
                <div className="mt-4 space-y-1.5">
                  {result.checklist.filter((c) => !c.passed).map((c) => (
                    <p key={c.name} className="text-[11px] text-red-400/70 font-mono">
                      ✗ {c.name}{c.detail ? `: ${c.detail}` : ""}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
