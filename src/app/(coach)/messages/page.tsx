"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { ArrowLeft, MessageCircle, RefreshCw } from "lucide-react"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/useAuth"

type Row = {
  id: string
  from_phone: string
  client_id: string | null
  msg_type: string
  body: string | null
  received_at: string
  forward_status: "pending" | "sent" | "delivered" | "read" | "failed"
  forward_error: string | null
  read_by_coach_at: string | null
  clientName?: string
}

const STATUS: Record<Row["forward_status"], { label: string; cls: string }> = {
  pending: { label: "Sending…", cls: "bg-white/10 text-text-muted" },
  sent: { label: "Sent to your WhatsApp", cls: "bg-white/10 text-text-muted" },
  delivered: { label: "Delivered to your WhatsApp ✓✓", cls: "bg-[#25D366]/15 text-[#25D366]" },
  read: { label: "You read it ✓✓", cls: "bg-[#25D366]/15 text-[#25D366]" },
  failed: { label: "Did NOT reach your WhatsApp", cls: "bg-red-500/15 text-red-400" },
}

export default function CoachMessagesPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [onlyFailed, setOnlyFailed] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    if (!user?.id) return
    const supabase = createClient()
    const { data, error } = await supabase
      .from("whatsapp_inbound")
      .select("id, from_phone, client_id, msg_type, body, received_at, forward_status, forward_error, read_by_coach_at")
      .order("received_at", { ascending: false })
      .limit(100)
    if (error) {
      toast.error("Could not load messages")
      setRows([])
      return
    }
    const list = (data ?? []) as Row[]
    const ids = Array.from(new Set(list.map((r) => r.client_id).filter(Boolean))) as string[]
    if (ids.length) {
      const { data: cs } = await supabase.from("clients").select("id, profile:profiles!user_id(name)").in("id", ids)
      const names = new Map(
        ((cs ?? []) as unknown as { id: string; profile: { name: string } | { name: string }[] | null }[]).map((c) => [
          c.id,
          (Array.isArray(c.profile) ? c.profile[0]?.name : c.profile?.name) || "",
        ]),
      )
      list.forEach((r) => { if (r.client_id) r.clientName = names.get(r.client_id) || undefined })
    }
    setRows(list)
    // Opening this page counts as reading everything on it.
    if (list.some((r) => !r.read_by_coach_at)) {
      await supabase.from("whatsapp_inbound").update({ read_by_coach_at: new Date().toISOString() }).is("read_by_coach_at", null)
    }
  }

  useEffect(() => { load() }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function retry(id: string) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/coach/messages/${id}/retry`, { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) toast.error(data.error || "Could not send again")
      else if (data.status === "failed") toast.error("Still not delivered. Use the Reply button.")
      else toast.success("Sent to your WhatsApp again")
      await load()
    } finally {
      setBusyId(null)
    }
  }

  const shown = (rows ?? []).filter((r) => !onlyFailed || r.forward_status === "failed")
  const failedCount = (rows ?? []).filter((r) => r.forward_status === "failed").length

  return (
    <main className="px-4 pt-6 pb-8 max-w-[430px] mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" aria-label="Back" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-heading italic text-3xl leading-none">Messages</h1>
          <p className="text-text-muted text-sm mt-1">Everything clients sent to the business WhatsApp</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => setOnlyFailed(false)} className={`h-10 px-4 rounded-full text-sm font-semibold cursor-pointer ${!onlyFailed ? "bg-accent-orange text-black" : "bg-white/5 text-text-muted"}`}>
          All
        </button>
        <button type="button" onClick={() => setOnlyFailed(true)} className={`h-10 px-4 rounded-full text-sm font-semibold cursor-pointer ${onlyFailed ? "bg-accent-orange text-black" : "bg-white/5 text-text-muted"}`}>
          Not delivered{failedCount ? ` (${failedCount})` : ""}
        </button>
      </div>

      {rows === null ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="animate-pulse rounded-2xl bg-white/10 h-28" />)}</div>
      ) : shown.length === 0 ? (
        <p className="text-text-muted text-base py-8">{onlyFailed ? "Every message reached you ✅" : "No messages yet."}</p>
      ) : (
        shown.map((r) => {
          const st = STATUS[r.forward_status]
          const unread = !r.read_by_coach_at
          return (
            <div key={r.id} className={`rounded-2xl bg-bg-card border p-4 ${unread ? "border-accent-orange/60" : "border-border-subtle"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {r.client_id ? (
                    <Link href={`/clients/${r.client_id}`} className="text-lg font-semibold leading-tight block truncate">
                      {r.clientName || "Client"}
                    </Link>
                  ) : (
                    <p className="text-lg font-semibold leading-tight">Not a client yet</p>
                  )}
                  <p className="text-text-muted text-sm">+{r.from_phone}</p>
                </div>
                <p className="text-text-muted text-xs shrink-0 tabular-nums">{format(new Date(r.received_at), "d MMM, h:mm a")}</p>
              </div>

              <p className="text-base mt-3 whitespace-pre-wrap break-words">
                {r.body || (r.msg_type === "text" ? "(empty)" : `Sent a ${r.msg_type}. Open WhatsApp on the business number to see it.`)}
              </p>

              <p className={`inline-block text-xs font-semibold rounded-full px-3 py-1 mt-3 ${st.cls}`}>{st.label}</p>
              {r.forward_status === "failed" && r.forward_error && (
                <p className="text-text-muted text-xs mt-2 break-words">Why: {r.forward_error}</p>
              )}

              <div className="grid grid-cols-2 gap-2 mt-3">
                <a
                  href={`https://wa.me/${r.from_phone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-12 rounded-xl bg-[#25D366] text-black font-bold text-base flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-5 h-5" /> Reply
                </a>
                {r.forward_status === "failed" ? (
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => retry(r.id)}
                    className="h-12 rounded-xl bg-accent-orange text-black font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className="w-5 h-5" /> Send again
                  </button>
                ) : (
                  <span className="h-12 rounded-xl bg-white/5 text-text-muted text-sm flex items-center justify-center">Saved ✅</span>
                )}
              </div>
            </div>
          )
        })
      )}
    </main>
  )
}
