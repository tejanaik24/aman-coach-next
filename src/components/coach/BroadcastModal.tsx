"use client"

import { useState, useEffect, useMemo } from "react"
import { X, MessageCircle, Check, Eye, Send, Users } from "lucide-react"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"
import { waLink } from "@/lib/quick-manage"

interface Props {
  isOpen: boolean
  onClose: () => void
}

interface BroadcastClient {
  id: string
  userId: string
  name: string
  phone: string | null
  notificationsEnabled: boolean
}

type Step = "compose" | "preview" | "confirm"

export default function BroadcastModal({ isOpen, onClose }: Props) {
  const [clients, setClients] = useState<BroadcastClient[]>([])
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<"all" | "selected">("all")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState("")
  const [step, setStep] = useState<Step>("compose")
  const [confirmed, setConfirmed] = useState(false)
  const [sending, setSending] = useState(false)
  const [apiNotice, setApiNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setStep("compose")
    setConfirmed(false)
    setApiNotice(null)
    setLoading(true)
    const supabase = createClient()
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: cs } = await supabase
          .from("clients")
          .select("id, user_id, profile:profiles!user_id(name, phone, notifications_enabled)")
          .eq("coach_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })

        const list: BroadcastClient[] = ((cs ?? []) as unknown as {
          id: string
          user_id: string
          profile: { name: string | null; phone: string | null; notifications_enabled?: boolean } | { name: string | null; phone: string | null; notifications_enabled?: boolean }[] | null
        }[]).map((row) => {
          const p = Array.isArray(row.profile) ? row.profile[0] : row.profile
          return {
            id: row.id,
            userId: row.user_id,
            name: p?.name || "Client",
            phone: p?.phone || null,
            notificationsEnabled: p?.notifications_enabled !== false,
          }
        })
        setClients(list)
        setSelectedIds(new Set(list.filter((c) => c.notificationsEnabled).map((c) => c.id)))
      } catch {
        toast.error("Could not load active clients")
      } finally {
        setLoading(false)
      }
    })()
  }, [isOpen])

  const targetClients = useMemo(() => {
    if (mode === "all") return clients.filter((c) => c.notificationsEnabled)
    return clients.filter((c) => selectedIds.has(c.id) && c.notificationsEnabled)
  }, [clients, mode, selectedIds])

  if (!isOpen) return null

  const toggleClient = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const formatForClient = (clientName: string) => {
    const first = clientName.trim().replace(/\s+/g, " ") || "there"
    const body = message.trim().replace(/\{\{\s*name\s*\}\}/gi, first)
    return `Hi ${first},\n\n${body}\n\n— Coach Aman Khurana`
  }

  async function handleSendBroadcast(dryRun = false) {
    if (!confirmed || targetClients.length === 0 || !message.trim()) return
    setSending(true)
    setApiNotice(null)
    try {
      const res = await fetch("/api/coach/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          clientIds: targetClients.map((c) => c.id),
          dryRun,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data.message || data.error || "Could not send broadcast"
        setApiNotice(msg)
        toast.error(msg)
        return
      }
      if (data.sentCount > 0 && !data.dryRun) {
        toast.success(`Broadcast sent to ${data.sentCount}/${data.total} client(s)`)
        onClose()
      } else {
        const msg =
          data.message ||
          "WhatsApp automatic sending is not active. Use the Send on WhatsApp buttons."
        setApiNotice(msg)
        toast.error(msg)
        setStep("preview")
      }
    } catch {
      toast.error("Could not send broadcast")
    } finally {
      setSending(false)
    }
  }

  const sampleClient = targetClients[0] ?? { name: "Rahul", phone: null }

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-[#111111] border border-border-subtle p-5 pb-8 max-h-[92vh] overflow-y-auto space-y-4 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-accent-orange">WhatsApp Broadcast</p>
            <h3 className="font-heading text-2xl">Broadcast Message</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-9 rounded-full bg-white/10 flex items-center justify-center text-text-muted hover:text-white cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
          <div className={`py-1.5 rounded-lg ${step === "compose" ? "bg-accent-orange text-black" : "bg-white/5 text-text-muted"}`}>
            1. Write &amp; Pick
          </div>
          <div className={`py-1.5 rounded-lg ${step === "preview" ? "bg-accent-orange text-black" : "bg-white/5 text-text-muted"}`}>
            2. Preview
          </div>
          <div className={`py-1.5 rounded-lg ${step === "confirm" ? "bg-accent-orange text-black" : "bg-white/5 text-text-muted"}`}>
            3. Confirm
          </div>
        </div>

        {apiNotice && (
          <div className="rounded-2xl bg-amber-500/15 border border-amber-500/40 p-3.5 text-xs font-semibold text-amber-200">
            {apiNotice}
          </div>
        )}

        {step === "compose" && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">Send to</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("all")}
                  className={`h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === "all" ? "bg-accent-orange text-black" : "bg-white/5 text-text-muted border border-border-subtle"
                  }`}
                >
                  <Users className="size-4" /> All active clients ({clients.filter((c) => c.notificationsEnabled).length})
                </button>
                <button
                  type="button"
                  onClick={() => setMode("selected")}
                  className={`h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === "selected" ? "bg-accent-orange text-black" : "bg-white/5 text-text-muted border border-border-subtle"
                  }`}
                >
                  <Check className="size-4" /> Choose clients ({selectedIds.size})
                </button>
              </div>
            </div>

            {mode === "selected" && (
              <div className="max-h-44 overflow-y-auto rounded-xl bg-black/50 border border-border-subtle p-2.5 space-y-1.5">
                {loading ? (
                  <p className="text-xs text-text-muted p-2">Loading clients…</p>
                ) : clients.length === 0 ? (
                  <p className="text-xs text-text-muted p-2">No active clients found.</p>
                ) : (
                  clients.map((c) => (
                    <label
                      key={c.id}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer ${
                        selectedIds.has(c.id) ? "bg-accent-orange/15 border border-accent-orange/30" : "bg-white/5"
                      } ${!c.notificationsEnabled ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          disabled={!c.notificationsEnabled}
                          checked={selectedIds.has(c.id) && c.notificationsEnabled}
                          onChange={() => toggleClient(c.id)}
                          className="accent-[#C9A84C]"
                        />
                        <span className="font-semibold text-white">{c.name}</span>
                      </div>
                      <span className="text-[11px] text-text-muted">
                        {!c.notificationsEnabled ? "Notifications off" : c.phone || "No phone"}
                      </span>
                    </label>
                  ))
                )}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-text-muted">Message</label>
                <button
                  type="button"
                  onClick={() => setMessage((m) => (m ? `${m} {{name}}` : "Please submit your check-in and measurements today."))}
                  className="text-[11px] text-accent-orange font-semibold hover:underline cursor-pointer"
                >
                  + Insert sample text
                </button>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Write the message to send to your clients on WhatsApp..."
                className="w-full rounded-2xl bg-[#1A1A1A] border border-[#333333] p-3.5 text-sm text-white outline-none focus:border-accent-orange resize-none"
              />
              <p className="text-[11px] text-text-muted mt-1">
                Each client automatically receives &ldquo;Hi [First Name],&rdquo; at the top and &ldquo;— Coach Aman Khurana&rdquo; at the bottom.
              </p>
            </div>

            <button
              type="button"
              disabled={!message.trim() || targetClients.length === 0}
              onClick={() => setStep("preview")}
              className="w-full h-12 rounded-2xl bg-accent-orange text-black font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Eye className="size-4" /> Preview Broadcast ({targetClients.length} client{targetClients.length === 1 ? "" : "s"}) →
            </button>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-[#1A2E1A]/40 border border-[#25D366]/40 p-4 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#25D366]">
                WhatsApp Message Preview (Example: {sampleClient.name})
              </p>
              <p className="text-sm text-white whitespace-pre-wrap leading-relaxed font-medium">
                {formatForClient(sampleClient.name)}
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 border border-border-subtle p-3.5 space-y-2">
              <p className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Recipients ({targetClients.length}) — or tap WhatsApp to send directly
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1.5">
                {targetClients.map((c) => {
                  const wa = waLink(c.phone, formatForClient(c.name))
                  return (
                    <div key={c.id} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-black/40 text-xs">
                      <span className="font-semibold text-white">{c.name}</span>
                      {wa ? (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-md bg-[#25D366] text-black font-bold flex items-center gap-1"
                        >
                          <MessageCircle className="size-3" /> Send on WhatsApp
                        </a>
                      ) : (
                        <span className="text-text-muted">No phone</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStep("compose")}
                className="h-12 rounded-2xl bg-white/10 text-white font-bold text-sm cursor-pointer"
              >
                ← Edit Message
              </button>
              <button
                type="button"
                onClick={() => setStep("confirm")}
                className="h-12 rounded-2xl bg-accent-orange text-black font-bold text-sm cursor-pointer"
              >
                Next: Confirm →
              </button>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white/5 border border-border-subtle p-4 space-y-3">
              <p className="text-sm font-bold text-white">
                Ready to send to {targetClients.length} active client{targetClients.length === 1 ? "" : "s"}
              </p>
              <p className="text-xs text-text-muted">
                Uses Meta WhatsApp template <code className="text-accent-orange">coach_broadcast_update</code> (or direct WhatsApp message for clients within the 24-hour window). Clients with notifications turned off are automatically skipped.
              </p>
              <label className="flex items-start gap-2.5 pt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 accent-[#C9A84C] size-4"
                />
                <span className="text-xs font-semibold text-white">
                  I confirm I have reviewed the message preview and want to send this broadcast to {targetClients.length} client{targetClients.length === 1 ? "" : "s"}.
                </span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStep("preview")}
                className="h-12 rounded-2xl bg-white/10 text-white font-bold text-sm cursor-pointer"
              >
                ← Back to Preview
              </button>
              <button
                type="button"
                disabled={!confirmed || sending}
                onClick={() => handleSendBroadcast(false)}
                className="h-12 rounded-2xl bg-[#25D366] text-black font-bold text-sm flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Send className="size-4" />
                {sending ? "Sending…" : "Confirm & Send"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

