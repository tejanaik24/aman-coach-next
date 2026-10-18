"use client"

import { useState } from "react"
import { format } from "date-fns"
import { MessageCircle } from "lucide-react"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"
import { waLink, buildFollowupWaText } from "@/lib/quick-manage"
import { openUrl } from "@/lib/utils"

interface Props {
  isOpen: boolean
  onClose: () => void
  clientId: string
  clientName: string
  clientPhone?: string | null
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
  { label: "Today", days: 0 },
  { label: "Tomorrow", days: 1 },
  { label: "In 3 days", days: 3 },
  { label: "In 1 week", days: 7 },
  { label: "In 2 weeks", days: 14 },
]

const dayStr = (n: number) => format(new Date(Date.now() + n * 86400000), "yyyy-MM-dd")

export default function AddFollowupSheet({ isOpen, onClose, clientId, clientName, clientPhone, onSaved }: Props) {
  const [type, setType] = useState<(typeof TYPES)[number]["key"]>("checkin")
  const [date, setDate] = useState(dayStr(7))
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  const isClose = (() => {
    if (type !== "checkin" || !date) return false
    const d = new Date(date + "T00:00:00")
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const diff = Math.round((d.getTime() - now.getTime()) / 86400000)
    return diff <= 2
  })()

  async function save(sendOnWhatsApp = false) {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not signed in")
      const cleanNote = note.trim() || null
      const { data: inserted, error } = await supabase.from("followups").insert({
        client_id: clientId,
        coach_id: user.id,
        type,
        due_date: date,
        note: cleanNote,
      }).select("id").single()
      if (error) throw error

      if (type === "checkin" && isClose && inserted?.id) {
        try {
          await fetch("/api/coach/followups/early-reminder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              followupId: inserted.id,
              clientId,
              dueDate: date,
            }),
          })
        } catch (err) {
          console.warn("Early checkin reminder failed:", err)
        }
      }

      toast.success(`Follow-up set for ${format(new Date(date + "T00:00:00"), "d MMM")}`)
      if (sendOnWhatsApp && clientPhone) {
        const wa = waLink(clientPhone, buildFollowupWaText(clientName, type, date, cleanNote))
        if (wa) openUrl(wa)
      }
      setNote("")
      onSaved?.()
      onClose()
    } catch {
      toast.error("Could not save. Try again.")
    } finally {
      setSaving(false)
    }
  }

  const canWhatsApp = Boolean(waLink(clientPhone ?? null, "hi"))

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

        {isClose && (
          <p className="text-accent-orange text-xs mb-3">
            Reminder goes to the client 2 days before. This date is close, so it was sent now.
          </p>
        )}

        <div className="space-y-2.5">
          <button
            type="button"
            disabled={saving || !date}
            onClick={() => save(false)}
            className="w-full h-14 rounded-2xl bg-[#C9A84C] text-black font-bold text-lg disabled:opacity-60 cursor-pointer"
          >
            {saving ? "Saving…" : "Save follow-up"}
          </button>
          {canWhatsApp && (
            <button
              type="button"
              disabled={saving || !date}
              onClick={() => save(true)}
              className="w-full h-14 rounded-2xl bg-[#25D366] text-black font-bold text-base flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              <MessageCircle className="size-5" />
              Save &amp; Send on WhatsApp now
            </button>
          )}
        </div>
        <p className="text-text-muted text-xs mt-3 text-center">
          Follow-ups show in Quick Manage and you can send the WhatsApp message anytime with one tap.
        </p>
      </div>
    </div>
  )
}
