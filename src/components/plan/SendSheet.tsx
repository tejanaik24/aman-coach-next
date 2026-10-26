"use client"

import { useState } from "react"
import toast from "react-hot-toast"
import { CheckCircle2, MessageCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { waLink } from "@/lib/quick-manage"
import { openUrl } from "@/lib/utils"
import { saveDoc, saveToLibrary } from "@/lib/plan/store"
import { uploadPlanFile, schedulePlanUpdateReminder } from "@/lib/plan/send"
import { ReminderPicker, inWeeks } from "@/components/coach/ReminderPicker"
import type { PlanDoc } from "@/lib/plan/types"
import { Sheet, Label, inputCls } from "./parts"

/** Make the PDF, give it to the client in the app, set Aman's reminder, then WhatsApp. */
export default function SendSheet({ doc, client, onClose, onSent }: {
  doc: PlanDoc
  client: { name: string; phone: string | null } | null
  onClose: () => void
  onSent: (d: PlanDoc) => void
}) {
  const first = (client?.name ?? "").trim().split(/\s+/)[0] || "there"
  const [reminder, setReminder] = useState(inWeeks(2))
  const [asTemplate, setAsTemplate] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const page = doc.kind === "diet" ? "diet" : "workout"
  const [msg, setMsg] = useState(
    `Hi ${first}, here is your updated ${doc.title ? `"${doc.title}" ` : ""}${doc.kind} plan, go through it thoroughly, let me know if you have any doubts. GOOD LUCK 💪\n\nOpen it in your app: ${typeof window !== "undefined" ? window.location.origin : ""}/${page}`,
  )

  async function send() {
    if (!doc.client_id) return
    setBusy(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) throw new Error("Not signed in")
      await saveDoc(doc.id, { title: doc.title, period_start: doc.period_start, period_end: doc.period_end, data: doc.data })

      const { renderPlanPdf } = await import("@/lib/plan/pdf-client")
      const blob = await renderPlanPdf(doc)
      const safe = `${first} ${doc.kind} ${doc.period_start ?? ""}`.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "plan"
      const path = await uploadPlanFile(new File([blob], `${safe}.pdf`, { type: "application/pdf" }), `${safe}.pdf`)

      const { data: cd, error } = await sb.from("client_documents").insert({
        coach_id: user.id, client_id: doc.client_id, kind: doc.kind, title: doc.title || (doc.kind === "workout" ? "Workout plan" : "Diet plan"),
        file_path: path, note: null, is_template: false,
      }).select("id").single()
      if (error) throw error

      await schedulePlanUpdateReminder(user.id, doc.client_id, doc.kind, reminder)
      const sentAt = new Date().toISOString()
      await sb.from("plan_docs").update({ sent_at: sentAt, document_id: cd.id }).eq("id", doc.id)
      if (asTemplate) {
        await sb.from("plan_docs").insert({ coach_id: user.id, client_id: null, kind: doc.kind, title: doc.title, data: { ...doc.data, base: undefined, markChanges: false }, is_template: true })
      }
      await saveToLibrary(doc.data).catch(() => {}) // library is a convenience; never block a send
      onSent({ ...doc, sent_at: sentAt, document_id: cd.id })
      setDone(true)
    } catch (e) {
      const m = typeof e === "object" && e !== null && "message" in e ? String((e as { message: unknown }).message) : ""
      toast.error(m || "Could not send. Try again.")
    } finally {
      setBusy(false)
    }
  }

  const wa = waLink(client?.phone ?? null, msg)

  if (done) return (
    <Sheet title="Sent" onClose={onClose}>
      <div className="text-center py-4">
        <CheckCircle2 className="size-14 text-success mx-auto" />
        <p className="text-lg font-semibold mt-3">{client?.name} can now see it in the app.</p>
        <p className="text-text-muted text-sm mt-1">Your reminder to update it is set.</p>
      </div>
      {wa && (
        <button type="button" onClick={() => openUrl(wa)} className="w-full h-14 rounded-2xl bg-[#25D366] text-black font-bold text-lg flex items-center justify-center gap-2 cursor-pointer">
          <MessageCircle className="size-5" /> Tell {first} on WhatsApp
        </button>
      )}
      <button type="button" onClick={onClose} className="w-full h-12 rounded-2xl bg-white/5 font-semibold cursor-pointer">Done</button>
    </Sheet>
  )

  return (
    <Sheet
      title="Send plan"
      onClose={() => !busy && onClose()}
      footer={
        <button type="button" disabled={busy} onClick={send} className="w-full h-14 rounded-2xl bg-accent-orange text-black font-bold text-lg disabled:opacity-60 cursor-pointer">
          {busy ? "Making PDF & sending…" : `Send to ${first}`}
        </button>
      }
    >
      <div>
        <Label hint="you can edit">WhatsApp message</Label>
        <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={5} className={`${inputCls} py-3 text-sm resize-none`} />
      </div>
      <ReminderPicker value={reminder} onChange={setReminder} />
      <label className="flex items-center gap-3 text-base cursor-pointer">
        <input type="checkbox" checked={asTemplate} onChange={(e) => setAsTemplate(e.target.checked)} className="size-6 accent-[#FF6A1A]" />
        Also save as a template for other clients
      </label>
    </Sheet>
  )
}
