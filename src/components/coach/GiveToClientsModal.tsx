"use client"

import { useEffect, useState, useMemo } from "react"
import { format } from "date-fns"
import { X, Search, Check, Users, ArrowRight, ArrowLeft, Send, Calendar } from "lucide-react"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"
import { inWeeks, ReminderPicker } from "./SendPlanPanel"

interface Props {
  isOpen: boolean
  onClose: () => void
  planId: string
  planTitle: string
  planType?: "maker" | "pdf"
  kind?: string
  onSuccess?: () => void
}

interface ClientOption {
  id: string
  name: string
  phone: string | null
  pkg: string | null
}

export default function GiveToClientsModal({
  isOpen,
  onClose,
  planId,
  planTitle,
  planType = "pdf",
  kind = "workout",
  onSuccess,
}: Props) {
  const [step, setStep] = useState<"pick" | "confirm">("pick")
  const [clients, setClients] = useState<ClientOption[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [reminderDate, setReminderDate] = useState(() => inWeeks(4))
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setStep("pick")
    setSelectedIds(new Set())
    setSearch("")
    setLoading(true)

    ;(async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("clients")
          .select("id, package, status, profile:profiles!user_id(name, phone)")
          .eq("status", "active")
          .order("created_at", { ascending: false })

        if (error) throw error

        const list: ClientOption[] = ((data ?? []) as unknown as { id: string; package: string | null; profile: { name: string; phone: string | null } | { name: string; phone: string | null }[] | null }[]).map((c) => {
          const prof = Array.isArray(c.profile) ? c.profile[0] : c.profile
          return {
            id: c.id,
            name: prof?.name?.trim() || "Client",
            phone: prof?.phone || null,
            pkg: c.package || null,
          }
        })
        setClients(list)
      } catch (err) {
        console.error("Could not load clients:", err)
        toast.error("Could not load clients")
      } finally {
        setLoading(false)
      }
    })()
  }, [isOpen])

  if (!isOpen) return null

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase().trim()
    if (!q) return true
    return c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))
  })

  function toggleClient(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelectedIds(new Set(filtered.map((c) => c.id)))
  }

  function clearAll() {
    setSelectedIds(new Set())
  }

  const selectedList = clients.filter((c) => selectedIds.has(c.id))

  async function handleSend() {
    if (selectedIds.size === 0) return
    setSubmitting(true)

    try {
      const res = await fetch("/api/coach/plans/give-to-clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          planType,
          clientIds: Array.from(selectedIds),
          reminderDate,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(`Plan successfully given to ${data.count} client(s)!`)
        onSuccess?.()
        onClose()
      } else {
        toast.error(data.error || "Failed to give plan to clients")
      }
    } catch {
      toast.error("Network error. Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-bg-card border-t sm:border border-border-subtle p-5 pb-8 space-y-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-heading italic text-2xl">Give plan to clients</h3>
            <p className="text-accent-orange text-sm font-semibold truncate max-w-[280px]">
              {planTitle}
            </p>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label="Close"
            className="size-10 rounded-full bg-white/5 flex items-center justify-center text-text-muted hover:text-white cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {step === "pick" ? (
          <>
            {/* Reminder Date */}
            <div className="shrink-0">
              <ReminderPicker value={reminderDate} onChange={setReminderDate} />
            </div>

            {/* Search and select all */}
            <div className="space-y-2 shrink-0">
              <div className="relative">
                <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search clients..."
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#1A1A1A] border border-[#333333] text-white text-sm outline-none focus:border-[#C9A84C]"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-text-muted px-1">
                <span>
                  {selectedIds.size} of {clients.length} selected
                </span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-accent-orange font-semibold hover:underline cursor-pointer"
                  >
                    Select filtered ({filtered.length})
                  </button>
                  {selectedIds.size > 0 && (
                    <button
                      type="button"
                      onClick={clearAll}
                      className="text-text-muted hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Client List */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-[160px] max-h-[300px] pr-1">
              {loading ? (
                <div className="p-8 text-center text-text-muted text-sm">Loading clients…</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-text-muted text-sm">No clients match</div>
              ) : (
                filtered.map((c) => {
                  const checked = selectedIds.has(c.id)
                  return (
                    <div
                      key={c.id}
                      onClick={() => toggleClient(c.id)}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        checked
                          ? "bg-accent-orange/15 border-accent-orange/60"
                          : "bg-white/5 border-border-subtle hover:bg-white/10"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-base leading-tight text-white">{c.name}</p>
                        <p className="text-xs text-text-muted mt-0.5">
                          {c.pkg || "Coaching client"}
                          {c.phone ? ` · +${c.phone}` : ""}
                        </p>
                      </div>
                      <div
                        className={`size-6 rounded-lg border flex items-center justify-center shrink-0 ${
                          checked
                            ? "bg-accent-orange border-accent-orange text-black"
                            : "border-white/20 bg-transparent"
                        }`}
                      >
                        {checked && <Check className="size-4 stroke-[3]" />}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Next Button */}
            <div className="shrink-0 pt-2">
              <button
                type="button"
                disabled={selectedIds.size === 0}
                onClick={() => setStep("confirm")}
                className="w-full h-14 rounded-2xl bg-accent-orange text-black font-bold text-base flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-accent-orange/20"
              >
                Next ({selectedIds.size} selected) <ArrowRight className="size-5" />
              </button>
            </div>
          </>
        ) : (
          /* Step 2: Confirmation Screen */
          <div className="space-y-4">
            <div className="rounded-2xl bg-white/5 border border-border-subtle p-4 space-y-2">
              <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">
                Confirm sending to {selectedList.length} client(s):
              </p>
              <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1">
                {selectedList.map((c) => (
                  <div key={c.id} className="text-sm font-semibold flex items-center gap-2">
                    <span className="size-2 rounded-full bg-accent-orange" />
                    <span>{c.name}</span>
                    <span className="text-text-muted text-xs">({c.phone || "No phone"})</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-bg-elevated p-4 space-y-2 text-xs text-text-muted">
              <p className="font-semibold text-white text-sm">What happens:</p>
              <p>• Each client gets their own copy of the plan in their app.</p>
              <p>• Header is automatically personalized with their data and dates.</p>
              {reminderDate ? (
                <p>
                  • A plan update reminder will be scheduled for{" "}
                  <span className="text-white font-semibold">
                    {format(new Date(reminderDate + "T00:00:00"), "d MMM yyyy")}
                  </span>
                  .
                </p>
              ) : (
                <p>• No reminder date was set.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setStep("pick")}
                className="h-14 rounded-2xl bg-white/10 text-white font-bold text-base flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft className="size-4" /> Back
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSend}
                className="h-14 rounded-2xl bg-accent-orange text-black font-extrabold text-base flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-accent-orange/20"
              >
                {submitting ? "Sending…" : <><Send className="size-4" /> Confirm & Send</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
