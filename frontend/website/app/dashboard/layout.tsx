"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

const NAV = [
  { href: "/dashboard", label: "Overview", icon: "◈" },
  { href: "/dashboard/registry", label: "Registry", icon: "◇" },
  { href: "/dashboard/investigations", label: "Investigations", icon: "◉" },
  { href: "/dashboard/hil", label: "HIL Inbox", icon: "◎" },
  { href: "/dashboard/queue", label: "Queue", icon: "◌" },
  { href: "/dashboard/demo", label: "Demo Controls", icon: "◆" },
]

function SettingsModal({ onClose }: { onClose: () => void }) {
  const [backend, setBackend] = useState(
    typeof window !== "undefined" ? (localStorage.getItem("dtc_backend_url") ?? "http://localhost:8000") : ""
  )
  const [platform, setPlatform] = useState(
    typeof window !== "undefined" ? (localStorage.getItem("dtc_platform_url") ?? "http://localhost:8001") : ""
  )
  const [token, setToken] = useState(
    typeof window !== "undefined" ? (localStorage.getItem("dtc_agent_token") ?? "") : ""
  )

  function save() {
    localStorage.setItem("dtc_backend_url", backend)
    localStorage.setItem("dtc_platform_url", platform)
    localStorage.setItem("dtc_agent_token", token)
    onClose()
    window.location.reload()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[2rem] border border-white/[0.08] bg-[#0e0e14] p-8 shadow-2xl">
        <h2 className="text-lg font-semibold text-white mb-6">Connection settings</h2>
        <div className="space-y-4">
          {[
            { label: "Backend URL", value: backend, set: setBackend, placeholder: "http://localhost:8000" },
            { label: "Platform URL", value: platform, set: setPlatform, placeholder: "http://localhost:8001" },
            { label: "Agent Token", value: token, set: setToken, placeholder: "your-token" },
          ].map((f) => (
            <div key={f.label}>
              <label className="text-[11px] text-white/35 font-mono uppercase tracking-widest block mb-1.5">
                {f.label}
              </label>
              <input
                value={f.value}
                onChange={(e) => f.set(e.target.value)}
                placeholder={f.placeholder}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white/80 font-mono placeholder:text-white/20 focus:outline-none focus:border-white/20"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-7">
          <button
            onClick={save}
            className="flex-1 py-2.5 rounded-xl bg-[#4ade80] text-[#08080d] text-sm font-semibold hover:bg-[#86efac] transition-colors"
          >
            Save & reload
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-white/[0.08] text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [settings, setSettings] = useState(false)

  return (
    <div className="flex min-h-[100dvh] bg-[#111118]">
      {settings && <SettingsModal onClose={() => setSettings(false)} />}

      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col border-r border-white/[0.05] py-6 px-4">
        <Link href="/" className="flex items-center gap-2.5 mb-8 px-2">
          <div className="w-7 h-7 rounded-lg bg-[#4ade80]/10 border border-[#4ade80]/25 flex items-center justify-center shrink-0">
            <span className="text-[#4ade80] text-[9px] font-mono font-bold">DTC</span>
          </div>
          <span className="text-[13px] text-white/50 tracking-tight">Co-Pilot</span>
        </Link>

        <nav className="flex-1 space-y-0.5">
          {NAV.map((item) => {
            const active = item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] transition-colors duration-150 ${
                  active
                    ? "bg-white/[0.06] text-white"
                    : "text-white/40 hover:text-white/70 hover:bg-white/[0.03]"
                }`}
              >
                <span className="text-[10px] opacity-60">{item.icon}</span>
                {item.label}
                {item.label === "HIL Inbox" && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-400" />
                )}
              </Link>
            )
          })}
        </nav>

        <button
          onClick={() => setSettings(true)}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] text-white/30 hover:text-white/60 hover:bg-white/[0.03] transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Settings
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
