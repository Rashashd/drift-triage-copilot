"use client"

import { useState, useEffect, useRef } from "react"
import {
  motion,
  useMotionValue,
  useSpring,
  useInView,
} from "framer-motion"

const GITHUB_URL = "https://github.com/your-org/drift-triage-copilot"

// ── Ease ──────────────────────────────────────────────────────────────────────
const ease = [0.16, 1, 0.3, 1] as const

// ── Magnetic Button ───────────────────────────────────────────────────────────
function MagneticButton({
  children,
  className,
  href,
}: {
  children: React.ReactNode
  className?: string
  href?: string
}) {
  const ref = useRef<HTMLAnchorElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 100, damping: 20 })
  const sy = useSpring(y, { stiffness: 100, damping: 20 })

  function onMove(e: React.MouseEvent) {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    x.set((e.clientX - (r.left + r.width / 2)) * 0.28)
    y.set((e.clientY - (r.top + r.height / 2)) * 0.28)
  }

  function onLeave() {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.a
      ref={ref}
      href={href}
      style={{ x: sx, y: sy }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
      className={className}
    >
      {children}
    </motion.a>
  )
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const cb = () => setScrolled(window.scrollY > 24)
    window.addEventListener("scroll", cb, { passive: true })
    return () => window.removeEventListener("scroll", cb)
  }, [])

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease }}
      className={`fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-10 h-16 transition-all duration-500 ${
        scrolled
          ? "border-b border-white/[0.06] bg-[#111118]/75 backdrop-blur-2xl"
          : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-[#4ade80]/10 border border-[#4ade80]/25 flex items-center justify-center shrink-0">
          <span className="text-[#4ade80] text-[9px] font-mono font-bold tracking-tight">DTC</span>
        </div>
        <span className="text-[13px] text-white/50 hidden sm:block tracking-tight">
          Drift Triage Co-Pilot
        </span>
      </div>

      <MagneticButton
        href={GITHUB_URL}
        className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.09] text-[13px] text-white/50 hover:text-white/80 hover:border-white/[0.18] transition-colors duration-200"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
        </svg>
        GitHub
      </MagneticButton>
    </motion.header>
  )
}

// ── Hero terminal ─────────────────────────────────────────────────────────────
const LOG_LINES = [
  { t: "euribor3m       PSI 0.341  HIGH", c: "text-[#fb923c]" },
  { t: "cons.price.idx  PSI 0.189  MED ", c: "text-yellow-400" },
  { t: "severity  low → HIGH", c: "text-[#fb923c] font-semibold" },
  { t: "agent: investigation #a7f2b3c1 open", c: "text-[#4ade80]" },
  { t: "agent: interrupt → HIL inbox", c: "text-sky-400" },
  { t: "hil: approved by operator", c: "text-[#4ade80]" },
  { t: "platform: v3 promoted → Production", c: "text-[#4ade80] font-semibold" },
]

function HeroTerminal() {
  return (
    <div className="relative">
      <div className="absolute -inset-px rounded-[2rem] bg-gradient-to-b from-[#4ade80]/8 via-transparent to-transparent pointer-events-none" />
      <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.025] backdrop-blur-sm overflow-hidden shadow-[0_32px_64px_-24px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-1.5 px-5 py-3.5 border-b border-white/[0.05]">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]/70" />
          <span className="ml-4 text-[11px] text-white/25 font-mono tracking-wide">
            agent.log — drift-triage-copilot
          </span>
        </div>

        <div className="px-5 py-5 font-mono text-[11px] leading-relaxed space-y-1.5">
          {LOG_LINES.map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
              className={`${line.c} whitespace-pre`}
            >
              <span className="text-white/15 select-none mr-3">›</span>
              {line.t}
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-4 divide-x divide-white/[0.05] border-t border-white/[0.05]">
          {[
            { label: "model", value: "v2 · Prod" },
            { label: "AUC", value: "0.8136", accent: true },
            { label: "recall", value: "0.7899", accent: true },
            { label: "status", value: "LIVE", live: true },
          ].map((m) => (
            <div key={m.label} className="px-4 py-3">
              <p className="text-[9px] text-white/25 font-mono uppercase tracking-widest mb-0.5">
                {m.label}
              </p>
              {m.live ? (
                <div className="flex items-center gap-1.5">
                  <motion.div
                    animate={{ opacity: [1, 0.25] }}
                    transition={{ repeat: Infinity, duration: 1.4 }}
                    className="w-1.5 h-1.5 rounded-full bg-[#4ade80]"
                  />
                  <span className="text-[11px] font-mono text-[#4ade80]">{m.value}</span>
                </div>
              ) : (
                <p className={`text-[11px] font-mono ${m.accent ? "text-[#4ade80]" : "text-white/55"}`}>
                  {m.value}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative min-h-[100dvh] flex items-center px-6 md:px-10 pt-20 pb-20 overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-[#4ade80]/[0.04] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-sky-500/[0.03] blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-20 items-center">
        {/* Left */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.15, ease }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#4ade80]/20 bg-[#4ade80]/[0.06] mb-9"
          >
            <motion.span
              animate={{ opacity: [1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-1.5 h-1.5 rounded-full bg-[#4ade80]"
            />
            <span className="text-[11px] text-[#4ade80] font-mono tracking-wide">
              AIE Bootcamp · Week 5
            </span>
          </motion.div>

          <h1 className="text-[52px] md:text-[60px] lg:text-[64px] font-bold leading-[1.04] tracking-[-0.02em] text-white mb-7">
            When your model
            <br />
            drifts, the system
            <br />
            <span className="text-[#4ade80]">investigates.</span>
          </h1>

          <p className="text-[17px] text-white/45 leading-[1.7] max-w-[480px] mb-11">
            Drift Triage Co-Pilot monitors a live bank-marketing classifier,
            scores incoming traffic for feature and output distribution shift,
            then dispatches a LangGraph agent to triage, propose, and execute
            approved remediation — without waking anyone at 2am.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <MagneticButton
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#4ade80] text-[#111118] text-[14px] font-semibold hover:bg-[#86efac] transition-colors duration-200"
            >
              Open Dashboard
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M7 17L17 7M17 7H7M17 7v10" />
              </svg>
            </MagneticButton>
            <MagneticButton
              href={GITHUB_URL}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-white/[0.09] text-[14px] text-white/50 hover:text-white/80 hover:border-white/[0.18] transition-colors duration-200"
            >
              View on GitHub
            </MagneticButton>
            <MagneticButton
              href="#capabilities"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-white/[0.09] text-[14px] text-white/50 hover:text-white/80 hover:border-white/[0.18] transition-colors duration-200"
            >
              Architecture
            </MagneticButton>
          </div>
        </motion.div>

        {/* Right */}
        <motion.div
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease, delay: 0.2 }}
        >
          <HeroTerminal />
        </motion.div>
      </div>
    </section>
  )
}

// ── Pipeline ──────────────────────────────────────────────────────────────────
const STEPS = [
  {
    n: "01",
    title: "Serve",
    body: "FastAPI + HistGradientBoosting pipeline. Every prediction logged to Postgres with timestamp and features.",
  },
  {
    n: "02",
    title: "Score",
    body: "Async background loop runs PSI on numeric features and χ² on categoricals against a frozen training reference.",
  },
  {
    n: "03",
    title: "Investigate",
    body: "LangGraph supervisor opens an investigation, classifies severity, proposes the lowest-risk remediation action.",
  },
  {
    n: "04",
    title: "Approve",
    body: "Retrain and rollback require human sign-off via the HIL inbox. Replay runs autonomously below the risk threshold.",
  },
  {
    n: "05",
    title: "Remediate",
    body: "Redis worker executes the action — retraining a new version in MLflow or rolling back to a validated checkpoint.",
  },
]

function Pipeline() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-80px" })

  return (
    <section ref={ref} className="px-6 md:px-10 py-28">
      <div className="max-w-7xl mx-auto">
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5 }}
          className="text-[10px] font-mono text-white/25 uppercase tracking-[0.2em] mb-14"
        >
          How it works
        </motion.p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-px bg-white/[0.05] rounded-2xl overflow-hidden border border-white/[0.05]">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 18 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, delay: i * 0.07, ease }}
              className="bg-[#111118] p-7 hover:bg-white/[0.015] transition-colors duration-300 group"
            >
              <span className="text-[10px] font-mono text-[#4ade80]/40 mb-5 block tracking-widest">
                {s.n}
              </span>
              <h3 className="text-[15px] font-semibold text-white mb-3 group-hover:text-[#4ade80] transition-colors duration-300">
                {s.title}
              </h3>
              <p className="text-[13px] text-white/35 leading-relaxed">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Bento: PSI bars ───────────────────────────────────────────────────────────
function PSIBar({ label, value }: { label: string; value: number }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const max = 0.55
  const pct = Math.min((value / max) * 100, 100)
  const color =
    value >= 0.5
      ? "#f87171"
      : value >= 0.25
      ? "#fb923c"
      : value >= 0.1
      ? "#fbbf24"
      : "#4ade80"

  return (
    <div ref={ref} className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-white/35 font-mono">{label}</span>
        <span className="text-[11px] font-mono tabular-nums" style={{ color }}>
          {value.toFixed(3)}
        </span>
      </div>
      <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={inView ? { width: `${pct}%` } : { width: 0 }}
          transition={{ duration: 1.1, delay: 0.25, ease }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  )
}

// ── Bento: Agent steps ────────────────────────────────────────────────────────
function AgentSteps() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const steps = [
    { done: true, text: "Received drift webhook" },
    { done: true, text: "Loaded Postgres checkpoint" },
    { done: true, text: "Scored euribor3m: 0.341" },
    { done: true, text: "Severity classified: HIGH" },
    { done: false, text: "Proposed action: retrain" },
    { done: false, text: "Interrupt → HIL inbox" },
  ]

  return (
    <div ref={ref} className="space-y-2.5">
      {steps.map((s, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ delay: i * 0.09, duration: 0.4 }}
          className="flex items-center gap-3"
        >
          <div
            className={`w-4 h-4 rounded-full shrink-0 flex items-center justify-center border ${
              s.done
                ? "bg-[#4ade80]/8 border-[#4ade80]/25"
                : "bg-white/[0.03] border-white/[0.08]"
            }`}
          >
            {s.done ? (
              <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3.5">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : (
              <motion.div
                animate={{ opacity: [1, 0.2] }}
                transition={{ repeat: Infinity, duration: 1.1, delay: i * 0.18 }}
                className="w-1.5 h-1.5 rounded-full bg-sky-400"
              />
            )}
          </div>
          <span
            className={`text-[11px] font-mono ${
              s.done ? "text-white/40" : "text-sky-400"
            }`}
          >
            {s.text}
          </span>
        </motion.div>
      ))}
    </div>
  )
}

// ── Bento: Queue ──────────────────────────────────────────────────────────────
function QueueViz() {
  const [depth, setDepth] = useState(3)
  useEffect(() => {
    const id = setInterval(
      () => setDepth((d) => (d <= 0 ? 5 : d - 1)),
      1700
    )
    return () => clearInterval(id)
  }, [])

  const bars = [18, 28, 38, 50, 64, 80]

  return (
    <div>
      <div className="flex items-end gap-1.5 mb-5">
        {bars.map((h, i) => (
          <motion.div
            key={i}
            animate={{ height: i < depth ? `${h}px` : "8px" }}
            transition={{ duration: 0.55, ease }}
            className={`w-7 rounded-sm ${
              i < depth ? "bg-[#4ade80]" : "bg-white/[0.05]"
            }`}
          />
        ))}
        <div className="ml-3 pb-0">
          <p className="text-3xl font-bold text-white tabular-nums">{depth}</p>
          <p className="text-[10px] text-white/25 font-mono mt-0.5">jobs in queue</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {[
          { job: "retrain", id: "#c8d2", s: "running" },
          { job: "replay ", id: "#b1f4", s: "queued" },
          { job: "rollbck", id: "#e9a2", s: "done" },
        ].map((j) => (
          <div
            key={j.id}
            className="flex items-center justify-between text-[11px] font-mono py-1.5 border-b border-white/[0.04] last:border-0"
          >
            <span className="text-white/40">
              {j.job} <span className="text-white/20">{j.id}</span>
            </span>
            <span
              className={
                j.s === "running"
                  ? "text-sky-400"
                  : j.s === "done"
                  ? "text-[#4ade80]"
                  : "text-white/25"
              }
            >
              {j.s}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Bento Grid ────────────────────────────────────────────────────────────────
function BentoGrid() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-60px" })

  const card =
    "rounded-[2rem] border border-white/[0.06] bg-white/[0.02] p-7 overflow-hidden relative group transition-all duration-300 hover:border-white/[0.1] hover:bg-white/[0.035] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.12)]"

  return (
    <section ref={ref} id="capabilities" className="px-6 md:px-10 py-24">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="mb-14"
        >
          <p className="text-[10px] font-mono text-white/25 uppercase tracking-[0.2em] mb-3">
            Capabilities
          </p>
          <h2 className="text-[36px] md:text-[42px] font-bold text-white tracking-tight">
            Production-grade,
            <span className="text-white/40"> end-to-end.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Detection — 2/3 */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.04, ease }}
            className={`${card} md:col-span-2`}
          >
            <div className="absolute -top-10 -right-10 w-64 h-64 rounded-full bg-[#fb923c]/[0.05] blur-3xl pointer-events-none" />
            <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-3">
              Detection Engine
            </p>
            <h3 className="text-[17px] font-semibold text-white mb-7">
              PSI + χ² drift scoring on every rolling window
            </h3>
            <div className="space-y-3.5">
              <PSIBar label="euribor3m" value={0.341} />
              <PSIBar label="cons.price.idx" value={0.189} />
              <PSIBar label="emp.var.rate" value={0.092} />
              <PSIBar label="nr.employed" value={0.048} />
              <PSIBar label="poutcome (χ²)" value={0.021} />
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-[#fb923c]/10 border border-[#fb923c]/20 text-[10px] font-mono text-[#fb923c]">
                severity: HIGH
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono text-white/35">
                window: 1 000 rows
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono text-white/35">
                interval: 10 min
              </span>
            </div>
          </motion.div>

          {/* Registry — 1/3 */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1, ease }}
            className={card}
          >
            <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-[#4ade80]/[0.06] blur-3xl pointer-events-none" />
            <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-3">
              Model Registry
            </p>
            <h3 className="text-[17px] font-semibold text-white mb-7">
              MLflow-backed promotion gate
            </h3>
            <div className="space-y-0 divide-y divide-white/[0.04]">
              {[
                { v: "v3", stage: "Staging", tc: "text-yellow-400", bc: "bg-yellow-500/8 border-yellow-500/20" },
                { v: "v2", stage: "Production", tc: "text-[#4ade80]", bc: "bg-[#4ade80]/8 border-[#4ade80]/20" },
                { v: "v1", stage: "Archived", tc: "text-white/25", bc: "bg-white/[0.03] border-white/[0.06]" },
              ].map((m) => (
                <div key={m.v} className="flex items-center justify-between py-3">
                  <span className="text-[13px] text-white/50 font-mono">{m.v}</span>
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-mono ${m.bc} ${m.tc}`}>
                    {m.stage}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-white/[0.05]">
              <p className="text-[10px] text-white/20 font-mono leading-relaxed">
                AUC 0.8136 · F1 0.3558
                <br />
                Recall 0.7899 · threshold 0.340
              </p>
            </div>
          </motion.div>

          {/* Agent — 1/3 */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.15, ease }}
            className={card}
          >
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-sky-500/[0.05] blur-3xl pointer-events-none" />
            <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-3">
              LangGraph Agent
            </p>
            <h3 className="text-[17px] font-semibold text-white mb-6">
              Supervisor pattern with Postgres checkpoints
            </h3>
            <AgentSteps />
          </motion.div>

          {/* HIL — 1/3 */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, ease }}
            className={card}
          >
            <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-3">
              Human in the Loop
            </p>
            <h3 className="text-[17px] font-semibold text-white mb-6">
              Approval gates for high-risk actions
            </h3>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 space-y-3">
              {[
                { k: "investigation", v: "#a7f2b3c1", mono: true },
                { k: "proposed", v: "retrain", tag: "sky" },
                { k: "severity", v: "HIGH", tag: "orange" },
              ].map((row) => (
                <div key={row.k} className="flex items-center justify-between">
                  <span className="text-[11px] text-white/35">{row.k}</span>
                  {row.tag ? (
                    <span
                      className={`px-2 py-0.5 rounded-md border text-[10px] font-mono ${
                        row.tag === "sky"
                          ? "bg-sky-500/8 border-sky-500/20 text-sky-400"
                          : "bg-[#fb923c]/8 border-[#fb923c]/20 text-[#fb923c]"
                      }`}
                    >
                      {row.v}
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono text-white/30">{row.v}</span>
                  )}
                </div>
              ))}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button className="py-2 rounded-xl bg-[#4ade80]/8 border border-[#4ade80]/20 text-[11px] text-[#4ade80] font-medium hover:bg-[#4ade80]/14 transition-colors">
                  Approve
                </button>
                <button className="py-2 rounded-xl bg-[#f87171]/8 border border-[#f87171]/20 text-[11px] text-[#f87171] font-medium hover:bg-[#f87171]/14 transition-colors">
                  Reject
                </button>
              </div>
            </div>
          </motion.div>

          {/* Queue — 1/3 */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.25, ease }}
            className={card}
          >
            <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-3">
              Redis Queue
            </p>
            <h3 className="text-[17px] font-semibold text-white mb-6">
              RQ + dead-letter monitoring
            </h3>
            <QueueViz />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// ── Tech Stack ────────────────────────────────────────────────────────────────
const STACK = [
  { name: "FastAPI", detail: "Model serving + agent API" },
  { name: "LangGraph", detail: "Supervisor agent + Postgres checkpoints" },
  { name: "MLflow", detail: "Model registry + versioning" },
  { name: "scikit-learn", detail: "HistGradientBoosting pipeline" },
  { name: "PostgreSQL", detail: "Predictions, HIL inbox, audit log" },
  { name: "Redis + RQ", detail: "Action queue + dead-letter" },
  { name: "OpenAI / Claude", detail: "LLM reasoning backbone" },
  { name: "Streamlit", detail: "Operator dashboard" },
  { name: "structlog", detail: "Structured key-value logging" },
  { name: "Docker Compose", detail: "Full-stack orchestration" },
  { name: "asyncpg", detail: "Async Postgres driver" },
  { name: "Pydantic v2", detail: "Contracts + validation" },
]

function TechStack() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-60px" })

  return (
    <section ref={ref} className="px-6 md:px-10 py-24 border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto">
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5 }}
          className="text-[10px] font-mono text-white/25 uppercase tracking-[0.2em] mb-10"
        >
          Stack
        </motion.p>
        <div className="flex flex-wrap gap-2.5">
          {STACK.map((tech, i) => (
            <motion.div
              key={tech.name}
              initial={{ opacity: 0, scale: 0.88 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: i * 0.04, duration: 0.38, ease }}
              className="relative group"
            >
              <div className="px-4 py-2 rounded-full border border-white/[0.07] bg-white/[0.02] text-[13px] text-white/50 group-hover:text-white/75 group-hover:border-white/[0.14] group-hover:bg-white/[0.04] transition-all duration-200 cursor-default">
                {tech.name}
              </div>
              <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-[#111118] border border-white/[0.09] text-[10px] text-white/45 whitespace-nowrap font-mono opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-10">
                {tech.detail}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="px-6 md:px-10 py-10 border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <p className="text-[12px] text-white/20 font-mono">
          Drift Triage Co-Pilot · AIE Bootcamp Week 5
        </p>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] text-white/20 hover:text-white/45 transition-colors duration-200 font-mono"
        >
          github →
        </a>
      </div>
    </footer>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Page() {
  return (
    <main className="relative bg-[#111118] text-white overflow-x-hidden">
      <Nav />
      <Hero />
      <Pipeline />
      <BentoGrid />
      <TechStack />
      <Footer />
    </main>
  )
}
