"use client"

import { useEffect, useState } from "react"
import { getModelInfo, getInvestigations, getHILItems, getQueueStats } from "@/lib/api"

type Metric = { label: string; value: string | number; sub?: string; accent?: boolean; warn?: boolean }

function MetricCard({ label, value, sub, accent, warn }: Metric) {
  return (
    <div className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.02] p-6">
      <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-3">{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${accent ? "text-[#4ade80]" : warn ? "text-[#fb923c]" : "text-white"}`}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-white/30 font-mono mt-1">{sub}</p>}
    </div>
  )
}

export default function DashboardOverview() {
  const [data, setData] = useState<Metric[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")

  async function load() {
    setLoading(true)
    setErr("")
    try {
      const [model, invs, hil, queue] = await Promise.all([
        getModelInfo(),
        getInvestigations(undefined, 200),
        getHILItems("pending"),
        getQueueStats(),
      ])
      const open = invs.filter((i: { status: string }) => i.status === "open").length
      setData([
        { label: "Production model", value: `${model.model_name} v${model.model_version}`, sub: "MLflow registry" },
        { label: "Open investigations", value: open, accent: open === 0, warn: open > 0, sub: `${invs.length} total` },
        { label: "Pending HIL", value: hil.length, warn: hil.length > 0, accent: hil.length === 0, sub: "awaiting approval" },
        { label: "Queue depth", value: queue.queue_depth, sub: `DLQ: ${queue.dlq_depth}` },
      ])
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Overview</h1>
          <p className="text-sm text-white/35 mt-0.5">System health at a glance</p>
        </div>
        <button
          onClick={load}
          className="px-4 py-2 rounded-xl border border-white/[0.08] text-sm text-white/40 hover:text-white/70 hover:border-white/[0.15] transition-colors font-mono"
        >
          Refresh
        </button>
      </div>

      {err && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/20 text-sm text-red-400 font-mono">
          {err}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.02] p-6 animate-pulse h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {data.map((m) => <MetricCard key={m.label} {...m} />)}
        </div>
      )}
    </div>
  )
}
