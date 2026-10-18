"use client"

import { useState } from "react"

interface Props {
  title: string
  subtitle?: string
  current: string // YYYY-MM-DD
  type?: string
  onSave: (date: string) => void | Promise<void>
  onClose: () => void
}

// A real date picker for moving a follow-up. Replaces the old box that asked Aman to type "2026-12-01".
export default function ChangeDateSheet({ title, subtitle, current, type, onSave, onClose }: Props) {
  const [date, setDate] = useState(current)
  const [saving, setSaving] = useState(false)

  const isClose = (() => {
    if (type !== "checkin" || !date) return false
    const d = new Date(date + "T00:00:00")
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const diff = Math.round((d.getTime() - now.getTime()) / 86400000)
    return diff <= 2
  })()

  async function save() {
    if (!date || saving) return
    setSaving(true)
    try { await onSave(date) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/70" onClick={onClose}>
      <div className="w-full max-w-lg mx-auto rounded-t-3xl bg-bg-card border-t border-border-subtle p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        {subtitle && <p className="text-text-muted text-sm">{subtitle}</p>}
        <h3 className="font-heading italic text-2xl mb-4">{title}</h3>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full h-14 rounded-2xl bg-[#1A1A1A] border border-[#333333] px-4 text-white text-base outline-none focus:border-[#C9A84C] mb-4"
        />
        {isClose && (
          <p className="text-accent-orange text-xs mb-3">
            Reminder goes to the client 2 days before. This date is close, so it was sent now.
          </p>
        )}
        <button
          type="button"
          disabled={!date || saving}
          onClick={save}
          className="w-full h-14 rounded-2xl bg-[#C9A84C] text-black font-bold text-lg disabled:opacity-60 cursor-pointer"
        >
          {saving ? "Saving…" : "Save date"}
        </button>
      </div>
    </div>
  )
}
