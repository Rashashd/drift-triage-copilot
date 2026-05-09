"use client"

import { useEffect, useState } from "react"
import { getHILItems, approveHIL, rejectHIL, getInvestigation } from "@/lib/api"

type HILItem = {
  id: string
  investigation_id: string
  proposed_action: string
  status: string
  approver_user_id: string | null
  created_at: string
  resolved_at: string | null
}

type InvestigationContext = {
  severity: string
  previous_severity: string | null
  model_name: string
  model_version: string
}

const SEVERITY_COLORS: Record<string, string> = {
  low: "text-[#4ade80] bg-[#4ade80]/8 border-[#4ade80]/20",
  medium: "text-yellow-400 bg-yellow-500/8 border-yellow-500/20",
  high: "text-[#fb923c] bg-[#fb923c]/8 border-[#fb923c]/20",
  critical: "text-[#f87171] bg-[#f87171]/8 border-[#f87171]/20",
}

export default function HILPage() {
  const [items, setItems] = useState<HILItem[]>([])
  const [investigations, setInvestigations] = useState<Record<string, InvestigationContext>>({})
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [approverId, setApproverId] = useState("demo-operator")
  const [acting, setActing] = useState<string | null>(null)
  const [messages, setMessages] = useState<Record<string, { ok: boolean; msg: string }>>({})

  async function load() {
    setLoading(true)
    setErr("")
    try {
      const data: HILItem[] = await getHILItems("pending")
      setItems(data)
      const invs = await Promise.allSettled(
        data.map((item) => getInvestigation(item.investigation_id))
      )
      const map: Record<string, InvestigationContext> = {}
      data.forEach((item, i) => {
        const r = invs[i]
        if (r.status === "fulfilled") map[item.investigation_id] = r.value
      })
      setInvestigations(map)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  async function act(id: string, action: "approve" | "reject") {
    setActing(id)
    try {
      const fn = action === "approve" ? approveHIL : rejectHIL
      const res = await fn(id, approverId)
      setMessages((m) => ({ ...m, [id]: { ok: true, msg: `${action}d — investigation ${res.investigation_id?.slice(0, 8)}` } }))
      setItems((prev) => prev.filter((i) => i.id !== id))
    } catch (e: unknown) {
      setMessages((m) => ({ ...m, [id]: { ok: false, msg: e instanceof Error ? e.message : String(e) } }))
    } finally {
      setActing(null)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">HIL Inbox</h1>
          <p className="text-sm text-white/35 mt-0.5">Pending human approval gates</p>
        </div>
        <button onClick={load} className="px-4 py-2 rounded-xl border border-white/[0.08] text-sm text-white/40 hover:text-white/70 hover:border-white/[0.15] transition-colors font-mono">
          Refresh
        </button>
      </div>

      {/* Approver ID */}
      <div className="mb-6 flex items-center gap-3">
        <label className="text-[11px] font-mono text-white/30 uppercase tracking-widest shrink-0">Approver</label>
        <input
          value={approverId}
          onChange={(e) => setApproverId(e.target.value)}
          className="flex-1 bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-2 text-sm text-white/70 font-mono placeholder:text-white/20 focus:outline-none focus:border-white/[0.15] max-w-xs"
        />
      </div>

      {err && <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/20 text-sm text-red-400 font-mono">{err}</div>}

      {/* Feedback messages */}
      {Object.entries(messages).map(([id, m]) => (
        <div key={id} className={`mb-3 px-4 py-3 rounded-xl border text-sm font-mono ${m.ok ? "bg-[#4ade80]/5 border-[#4ade80]/20 text-[#4ade80]" : "bg-red-500/5 border-red-500/20 text-red-400"}`}>
          {m.msg}
        </div>
      ))}

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => <div key={i} className="rounded-[1.5rem] border border-white/[0.05] bg-white/[0.02] p-6 animate-pulse h-40" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.02] p-8 text-center">
          <p className="text-sm text-white/30">No pending approvals.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const inv = investigations[item.investigation_id]
            const severityClass = inv ? (SEVERITY_COLORS[inv.severity] ?? "text-white/40 bg-white/[0.04] border-white/[0.06]") : ""
            return (
              <div key={item.id} className="rounded-[1.5rem] border border-white/[0.07] bg-white/[0.02] p-6">
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <p className="text-[10px] text-white/25 font-mono mb-1">Model</p>
                    <p className="text-sm font-mono text-white/60">{inv ? `${inv.model_name} v${inv.model_version}` : item.investigation_id.slice(0, 8) + "…"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/25 font-mono mb-1">Proposed action</p>
                    <p className="text-sm font-mono text-sky-400">{item.proposed_action}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/25 font-mono mb-1">Severity</p>
                    {inv
                      ? <span className={`px-2 py-0.5 rounded-md border text-[10px] font-mono ${severityClass}`}>{inv.severity}{inv.previous_severity ? ` ← ${inv.previous_severity}` : ""}</span>
                      : <span className="text-sm font-mono text-white/25">—</span>
                    }
                  </div>
                  <div>
                    <p className="text-[10px] text-white/25 font-mono mb-1">Created</p>
                    <p className="text-sm font-mono text-white/40">{new Date(item.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => act(item.id, "approve")}
                    disabled={acting === item.id}
                    className="py-2.5 rounded-xl bg-[#4ade80]/8 border border-[#4ade80]/20 text-sm text-[#4ade80] font-medium hover:bg-[#4ade80]/14 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {acting === item.id ? "…" : "Approve"}
                  </button>
                  <button
                    onClick={() => act(item.id, "reject")}
                    disabled={acting === item.id}
                    className="py-2.5 rounded-xl bg-[#f87171]/8 border border-[#f87171]/20 text-sm text-[#f87171] font-medium hover:bg-[#f87171]/14 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {acting === item.id ? "…" : "Reject"}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
