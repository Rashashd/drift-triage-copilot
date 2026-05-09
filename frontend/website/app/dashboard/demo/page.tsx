"use client"

import { useState } from "react"
import { injectPredictions, triggerDriftCheck } from "@/lib/api"

type DriftResult = {
  severity: string
  previous_severity: string
  webhook_emitted: boolean
  [key: string]: unknown
}

const SEVERITY_COLORS: Record<string, string> = {
  low: "text-[#4ade80]",
  medium: "text-yellow-400",
  high: "text-[#fb923c]",
  critical: "text-[#f87171]",
}

export default function DemoPage() {
  const [n, setN] = useState(200)
  const [injecting, setInjecting] = useState(false)
  const [checking, setChecking] = useState(false)
  const [injectResult, setInjectResult] = useState<string | null>(null)
  const [driftResult, setDriftResult] = useState<DriftResult | null>(null)
  const [driftErr, setDriftErr] = useState<string | null>(null)

  async function handleInject() {
    setInjecting(true)
    setInjectResult(null)
    try {
      const { ok, fail } = await injectPredictions(n)
      setInjectResult(
        fail === 0
          ? `Sent ${ok} shifted predictions. Click "Trigger Check Now" to detect drift.`
          : `Sent ${ok} ok / ${fail} failed — check platform logs.`
      )
    } catch (e: unknown) {
      setInjectResult(`Error: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setInjecting(false)
    }
  }

  async function handleCheck() {
    setChecking(true)
    setDriftResult(null)
    setDriftErr(null)
    try {
      const res = await triggerDriftCheck()
      setDriftResult(res)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes("409")) {
        setDriftErr("409 — prediction window is empty. Inject some predictions first.")
      } else {
        setDriftErr(msg)
      }
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Demo Controls</h1>
        <p className="text-sm text-white/35 mt-0.5">Inject shifted predictions and trigger drift detection</p>
      </div>

      {/* PSI guide */}
      <div className="mb-8 rounded-[1.5rem] border border-white/[0.06] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.05]">
          <p className="text-[11px] font-mono text-white/30 uppercase tracking-widest">PSI threshold guide</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.04]">
              {["N requests", "Expected PSI", "Severity", "Action"].map((h) => (
                <th key={h} className="text-left px-5 py-2.5 text-[10px] font-mono text-white/20 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { n: "~50", psi: "< 0.1", sev: "low", action: "no-op", c: "text-[#4ade80]" },
              { n: "~100", psi: "0.1 – 0.25", sev: "medium", action: "replay", c: "text-yellow-400" },
              { n: "~150", psi: "0.25 – 0.5", sev: "high", action: "retrain (HIL)", c: "text-[#fb923c]" },
              { n: "~200", psi: "≥ 0.5", sev: "critical", action: "rollback (HIL)", c: "text-[#f87171]" },
            ].map((row) => (
              <tr key={row.n} className="border-b border-white/[0.03] last:border-0">
                <td className="px-5 py-3 font-mono text-[12px] text-white/40">{row.n}</td>
                <td className="px-5 py-3 font-mono text-[12px] text-white/40">{row.psi}</td>
                <td className={`px-5 py-3 font-mono text-[12px] font-medium ${row.c}`}>{row.sev}</td>
                <td className="px-5 py-3 font-mono text-[12px] text-white/40">{row.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* N input */}
      <div className="mb-6">
        <label className="text-[11px] font-mono text-white/30 uppercase tracking-widest block mb-2">
          Prediction requests to inject
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={n}
            min={10}
            step={50}
            onChange={(e) => setN(Number(e.target.value))}
            className="w-32 bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-2.5 text-sm text-white/80 font-mono focus:outline-none focus:border-white/[0.15]"
          />
          <div className="flex gap-2">
            {[50, 100, 150, 200].map((v) => (
              <button
                key={v}
                onClick={() => setN(v)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-mono transition-colors ${
                  n === v
                    ? "bg-white/[0.08] text-white border border-white/[0.12]"
                    : "text-white/30 hover:text-white/55 border border-white/[0.05]"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={handleInject}
          disabled={injecting}
          className="py-3.5 rounded-xl bg-[#4ade80] text-[#08080d] text-sm font-semibold hover:bg-[#86efac] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {injecting ? `Sending ${n} requests…` : "Inject Drift"}
        </button>
        <button
          onClick={handleCheck}
          disabled={checking}
          className="py-3.5 rounded-xl border border-white/[0.09] text-sm text-white/60 hover:text-white/85 hover:border-white/[0.18] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {checking ? "Running check…" : "Trigger Check Now"}
        </button>
      </div>

      {/* Inject result */}
      {injectResult && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.07] text-sm text-white/60 font-mono">
          {injectResult}
        </div>
      )}

      {/* Drift check error */}
      {driftErr && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-[#fb923c]/5 border border-[#fb923c]/20 text-sm text-[#fb923c] font-mono">
          {driftErr}
        </div>
      )}

      {/* Drift check result */}
      {driftResult && (
        <div className="rounded-[1.5rem] border border-white/[0.07] bg-white/[0.02] p-6">
          <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-4">Drift check result</p>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-[10px] text-white/25 font-mono mb-1">Severity</p>
              <p className={`text-lg font-bold font-mono ${SEVERITY_COLORS[driftResult.severity] ?? "text-white"}`}>
                {driftResult.severity}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-white/25 font-mono mb-1">Previous</p>
              <p className="text-lg font-bold font-mono text-white/50">{driftResult.previous_severity}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/25 font-mono mb-1">Webhook</p>
              <p className={`text-sm font-mono ${driftResult.webhook_emitted ? "text-[#4ade80]" : "text-white/30"}`}>
                {driftResult.webhook_emitted ? "emitted" : "not emitted"}
              </p>
            </div>
          </div>
          <details className="group">
            <summary className="text-[11px] text-white/25 font-mono cursor-pointer hover:text-white/45">
              Full payload
            </summary>
            <pre className="mt-3 text-[10px] text-white/30 font-mono overflow-auto">
              {JSON.stringify(driftResult, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}
