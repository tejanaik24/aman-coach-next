"use client"

import { useState } from "react"
import { format } from "date-fns"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"

interface Props {
  isOpen: boolean
  onClose: () => void
  clientId: string
  clientName: string
  onSaved?: () => void
}

const TYPES = [
  { key: "checkin", label: "Check-in" },
  { key: "payment", label: "Payment" },
  { key: "renewal", label: "Renewal" },
  { key: "feedback", label: "Feedback" },
  { key: "other", label: "Other" },
] as const

const WHEN = [
  { label: "Tomorrow", days: 1 },
  { label: "In 3 days", days: 3 },
  { label: "In 1 week", days: 7 },
  { label: "In 2 weeks", days: 14 },
]

const dayStr = (n: number) => format(new Date(Date.now() + n * 86400000), "yyyy-MM-dd")

export default function AddFollowupSheet({ isOpen, onClose, clientId, clientName, onSaved }: Props) {
  const [type, setType] = useState<(typeof TYPES)[number]["key"]>("checkin")
  const [date, setDate] = useState(dayStr(7))
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  async function save() {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not signed in")
      const { error } = await supabase.from("followups").insert({
        client_id: clientId,
        coach_id: user.id,
        type,
        due_date: date,
        note: note.trim() || null,
      })
      if (error) throw error
      toast.success(`Follow-up set for ${format(new Date(date + "T00:00:00"), "d MMM")}`)
      setNote("")
      onSaved?.()
      onClose()
    } catch {
      toast.error("Could not save. Try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-lg mx-auto rounded-t-3xl bg-bg-card border-t border-border-subtle p-5 pb-8 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-text-muted text-sm">{clientName}</p>
        <h3 className="font-heading italic text-2xl mb-4">Add follow-up</h3>

        <p className="text-sm text-text-muted mb-2">What for?</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setType(t.key)}
              className={`h-11 px-4 rounded-full font-semibold text-base cursor-pointer ${
                type === t.key ? "bg-accent-orange text-black" : "bg-white/10 text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <p className="text-sm text-text-muted mb-2">When?</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {WHEN.map((w) => (
            <button
              key={w.days}
              type="button"
              onClick={() => setDate(dayStr(w.days))}
              className={`h-11 px-4 rounded-full font-semibold text-base cursor-pointer ${
                date === dayStr(w.days) ? "bg-accent-orange text-black" : "bg-white/10 text-white"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
        <input
          type="date"
          value={date}
          min={dayStr(0)}
          onChange={(e) => setDate(e.target.value)}
          className="w-full h-14 rounded-2xl bg-[#1A1A1A] border border-[#333333] px-4 text-white text-base outline-none focus:border-[#C9A84C] mb-4"
        />

        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="w-full h-14 rounded-2xl bg-[#1A1A1A] border border-[#333333] px-4 text-white text-base outline-none focus:border-[#C9A84C] placeholder:text-[#555555] mb-5"
        />

        <button
          type="button"
          disabled={saving || !date}
          onClick={save}
          className="w-full h-14 rounded-2xl bg-[#C9A84C] text-black font-bold text-lg disabled:opacity-60 cursor-pointer"
        >
          {saving ? "Saving…" : "Save follow-up"}
        </button>
        {type === "checkin" && (
          <p className="text-text-muted text-sm mt-3 text-center">The client gets the check-in link on WhatsApp 2 days before.</p>
        )}
      </div>
    </div>
  )
}
