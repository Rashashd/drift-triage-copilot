"use client"

import { useEffect, useState } from "react"
import { getQueueStats } from "@/lib/api"

type QueueJob = {
  job_id: string
  action: string
  investigation_id: string
  model_uri: string
  approver_user_id: string | null
  enqueued_at: string | null
}

type Stats = { queue_depth: number; dlq_depth: number; jobs: QueueJob[]; dlq_jobs: QueueJob[] }

function JobRow({ job }: { job: QueueJob }) {
  return (
    <tr className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors">
      <td className="px-4 py-3 font-mono text-[11px] text-sky-400">{job.action}</td>
      <td className="px-4 py-3 font-mono text-[11px] text-white/35">{job.investigation_id?.slice(0, 8) ?? "—"}</td>
      <td className="px-4 py-3 font-mono text-[11px] text-white/25 truncate max-w-[200px]">{job.model_uri || "—"}</td>
      <td className="px-4 py-3 font-mono text-[11px] text-white/25">{job.approver_user_id ?? "—"}</td>
      <td className="px-4 py-3 font-mono text-[11px] text-white/25">
        {job.enqueued_at ? new Date(job.enqueued_at).toLocaleTimeString() : "—"}
      </td>
    </tr>
  )
}

export default function QueuePage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")

  async function load() {
    setLoading(true)
    setErr("")
    try {
      setStats(await getQueueStats())
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const TABLE_HEADERS = ["Action", "Investigation", "Model URI", "Approver", "Enqueued"]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Queue</h1>
          <p className="text-sm text-white/35 mt-0.5">Redis RQ job queue and dead-letter queue</p>
        </div>
        <button onClick={load} className="px-4 py-2 rounded-xl border border-white/[0.08] text-sm text-white/40 hover:text-white/70 hover:border-white/[0.15] transition-colors font-mono">
          Refresh
        </button>
      </div>

      {err && <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/20 text-sm text-red-400 font-mono">{err}</div>}

      {loading ? (
        <div className="grid grid-cols-2 gap-4 mb-8">
          {[1, 2].map((i) => <div key={i} className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.02] p-6 animate-pulse h-24" />)}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.02] p-6">
              <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-3">Queue depth</p>
              <p className={`text-4xl font-bold tabular-nums ${stats.queue_depth > 0 ? "text-sky-400" : "text-[#4ade80]"}`}>
                {stats.queue_depth}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.02] p-6">
              <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-3">DLQ depth</p>
              <p className={`text-4xl font-bold tabular-nums ${stats.dlq_depth > 0 ? "text-[#f87171]" : "text-[#4ade80]"}`}>
                {stats.dlq_depth}
              </p>
            </div>
          </div>

          {/* Jobs */}
          {[
            { title: "Jobs in queue", jobs: stats.jobs, accent: "sky" },
            { title: "Dead-letter queue", jobs: stats.dlq_jobs, accent: "red" },
          ].map(({ title, jobs }) => (
            <div key={title} className="mb-6 rounded-[1.5rem] border border-white/[0.06] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-white/[0.05]">
                <p className="text-[12px] font-mono text-white/40">{title} <span className="text-white/20">({jobs.length})</span></p>
              </div>
              {jobs.length === 0 ? (
                <p className="px-5 py-4 text-[12px] text-white/25 font-mono">empty — jobs are picked up by the worker within seconds</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.04]">
                      {TABLE_HEADERS.map((h) => (
                        <th key={h} className="text-left px-4 py-2.5 text-[10px] font-mono text-white/20 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((j) => <JobRow key={j.job_id} job={j} />)}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </>
      ) : null}
    </div>
  )
}
