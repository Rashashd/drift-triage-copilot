"use client"

import { useEffect, useState } from "react"
import { getInvestigations } from "@/lib/api"

type Investigation = {
  id: string
  model_name: string
  model_version: string
  severity: string
  previous_severity: string | null
  status: string
  action_decided: string | null
  is_stale: boolean
  summary: string | null
  resolution: string | null
  created_at: string
}

const SEVERITY_COLORS: Record<string, string> = {
  low: "text-[#4ade80] bg-[#4ade80]/8 border-[#4ade80]/20",
  medium: "text-yellow-400 bg-yellow-500/8 border-yellow-500/20",
  high: "text-[#fb923c] bg-[#fb923c]/8 border-[#fb923c]/20",
  critical: "text-[#f87171] bg-[#f87171]/8 border-[#f87171]/20",
}

const STATUS_COLORS: Record<string, string> = {
  open: "text-sky-400 bg-sky-500/8 border-sky-500/20",
  pending_approval: "text-yellow-400 bg-yellow-500/8 border-yellow-500/20",
  resolved: "text-white/30 bg-white/[0.04] border-white/[0.06]",
}

function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-md border text-[10px] font-mono ${colorClass}`}>
      {label}
    </span>
  )
}

export default function InvestigationsPage() {
  const [items, setItems] = useState<Investigation[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [filter, setFilter] = useState("all")
  const [selected, setSelected] = useState<Investigation | null>(null)

  async function load() {
    setLoading(true)
    setErr("")
    try {
      const data = await getInvestigations(filter === "all" ? undefined : filter, 100)
      setItems(data)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filter])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Investigations</h1>
          <p className="text-sm text-white/35 mt-0.5">Drift events the agent has opened or closed</p>
        </div>
        <button onClick={load} className="px-4 py-2 rounded-xl border border-white/[0.08] text-sm text-white/40 hover:text-white/70 hover:border-white/[0.15] transition-colors font-mono">
          Refresh
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {["all", "open", "pending_approval", "resolved"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-mono transition-colors ${
              filter === s
                ? "bg-white/[0.08] text-white border border-white/[0.12]"
                : "text-white/35 hover:text-white/60 border border-transparent"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {err && <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/20 text-sm text-red-400 font-mono">{err}</div>}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 animate-pulse h-14" />)}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-white/30">No investigations yet.</p>
      ) : (
        <div className="rounded-[1.5rem] border border-white/[0.06] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {["Created", "Severity", "Status", "Action", "Summary", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-mono text-white/25 uppercase tracking-widest">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-pointer"
                  onClick={() => setSelected(selected?.id === inv.id ? null : inv)}
                >
                  <td className="px-4 py-3 font-mono text-[11px] text-white/40">
                    {new Date(inv.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={inv.severity} colorClass={SEVERITY_COLORS[inv.severity] ?? "text-white/40 bg-white/[0.04] border-white/[0.06]"} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={inv.status} colorClass={STATUS_COLORS[inv.status] ?? "text-white/40 bg-white/[0.04] border-white/[0.06]"} />
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-white/40">{inv.action_decided ?? "—"}</td>
                  <td className="px-4 py-3 max-w-[280px]">
                    {inv.summary
                      ? <span className="text-[11px] text-white/45 leading-snug line-clamp-2">{inv.summary}</span>
                      : <span className="text-[11px] text-white/15 font-mono">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-white/20 text-[11px] font-mono shrink-0">{inv.id.slice(0, 8)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail drawer */}
      {selected && (
        <div className="mt-4 rounded-[1.5rem] border border-white/[0.08] bg-white/[0.02] p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-mono text-white/30">Investigation {selected.id}</p>
            <button onClick={() => setSelected(null)} className="text-white/30 hover:text-white/60 text-lg">×</button>
          </div>
          {selected.summary && (
            <div className="mb-4 pb-4 border-b border-white/[0.05]">
              <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-1.5">Summary</p>
              <p className="text-sm text-white/60 leading-relaxed">{selected.summary}</p>
            </div>
          )}
          {selected.resolution && (
            <div className="mb-4 pb-4 border-b border-white/[0.05]">
              <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-1.5">Resolution</p>
              <p className="text-sm text-white/70 leading-relaxed">{selected.resolution}</p>
            </div>
          )}
          <pre className="text-[11px] text-white/35 font-mono overflow-auto">
            {JSON.stringify(selected, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
