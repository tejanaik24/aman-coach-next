"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Plus, Check, MessageCircle } from "lucide-react"
import { format } from "date-fns"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"
import AddClientModal from "@/components/coach/AddClientModal"
import ProfileMenu from "@/components/shared/ProfileMenu"
import { markInvoicePaid } from "@/lib/payments"
import { fetchQuickManage, waLink, TILE_LABELS, TILE_ORDER, type QMRow, type TileKey } from "@/lib/quick-manage"

type FollowupResult = "successful" | "again" | "wrong_number" | "rate_too_high" | "other"

const RESULTS: { key: FollowupResult; label: string }[] = [
  { key: "successful", label: "Successful" },
  { key: "again", label: "Follow up again" },
  { key: "wrong_number", label: "Wrong number" },
  { key: "rate_too_high", label: "Rate too high" },
  { key: "other", label: "Other" },
]

const AGAIN_CHIPS = [
  { label: "Tomorrow", days: 1 },
  { label: "In 3 days", days: 3 },
  { label: "In 1 week", days: 7 },
]

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/10 ${className}`} />
}

export default function QuickManagePage() {
  const router = useRouter()
  const [rows, setRows] = useState<QMRow[] | null>(null)
  const [open, setOpen] = useState<TileKey | null>(null)
  const [coachId, setCoachId] = useState<string | null>(null)
  const [coachName, setCoachName] = useState("Aman")
  const [coachEmail, setCoachEmail] = useState<string | null>(null)
  const [coachAvatar, setCoachAvatar] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [todayStr, setTodayStr] = useState("")
  const [sheetRow, setSheetRow] = useState<QMRow | null>(null)
  const [pickingDate, setPickingDate] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    setTodayStr(format(new Date(), "EEEE, d MMM"))
  }, [])

  const load = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setRows([]); return }
      setCoachId(user.id)
      setCoachEmail(user.email ?? null)
      const [profileRes, list] = await Promise.all([
        supabase.from("profiles").select("name, avatar_url").eq("id", user.id).single(),
        fetchQuickManage(supabase, user.id),
      ])
      if (profileRes.data) {
        setCoachName(profileRes.data.name)
        setCoachAvatar(profileRes.data.avatar_url)
      }
      setRows(list)
    } catch (e) {
      console.error("Quick Manage load failed:", e)
      setLoadError(e instanceof Error ? e.message : "unknown error")
      setRows([])
    }
  }, [])

  useEffect(() => { load() }, [load])

  const counts = useMemo(() => {
    const c = {} as Record<TileKey, number>
    for (const k of TILE_ORDER) c[k] = 0
    for (const r of rows ?? []) c[r.tile]++
    return c
  }, [rows])

  // the opened tile defaults to the first one that has something in it
  const openTile = open ?? TILE_ORDER.find((k) => counts[k] > 0) ?? null

  const removeRow = (id: string) => setRows((rs) => (rs ?? []).filter((r) => r.id !== id))
  const totalTodo = TILE_ORDER.reduce((n, k) => n + counts[k], 0)

  async function markPaid(r: QMRow) {
    if (r.action.kind !== "paid") return
    setBusy(true)
    const ok = await markInvoicePaid(r.action.feeId, r.name, r.phone ?? undefined)
    setBusy(false)
    if (ok) { toast.success(`${r.name} marked paid`); removeRow(r.id) }
    else toast.error("Could not mark paid. Try again.")
  }

  async function doneEnquiry(r: QMRow) {
    if (r.action.kind !== "enquiry") return
    const supabase = createClient()
    const { error } = await supabase
      .from("form_submissions")
      .update({ status: "reviewed", reviewed_at: new Date().toISOString(), reviewed_by: coachId })
      .eq("id", r.action.submissionId)
    if (error) { toast.error("Could not save. Try again."); return }
    removeRow(r.id)
  }

  async function saveFollowupResult(result: FollowupResult, againDays?: number) {
    if (!sheetRow || sheetRow.action.kind !== "followup" || !coachId) return
    const { followupId, clientId } = sheetRow.action
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase
      .from("followups")
      .update({ result, done_at: new Date().toISOString() })
      .eq("id", followupId)
    if (!error && result === "again" && againDays) {
      const due = format(new Date(Date.now() + againDays * 86400000), "yyyy-MM-dd")
      await supabase.from("followups").insert({ client_id: clientId, coach_id: coachId, type: "other", due_date: due })
    }
    setBusy(false)
    if (error) { toast.error("Could not save. Try again."); return }
    toast.success(result === "again" ? "Follow-up set" : "Saved")
    removeRow(sheetRow.id)
    setSheetRow(null)
    setPickingDate(false)
  }

  const visible = (rows ?? []).filter((r) => r.tile === openTile)

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="px-5 pt-8 pb-32 max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-text-muted text-sm font-medium">{todayStr}</p>
            <h1 className="font-heading italic text-4xl mt-1">Quick Manage</h1>
            <p className="text-text-muted text-base mt-1">
              {loadError ? "Could not load. Check internet and reopen." : rows === null ? "Loading…" : totalTodo === 0 ? "Nothing waiting. All done ✅" : `${totalTodo} thing${totalTodo === 1 ? "" : "s"} need you today`}
            </p>
          </div>
          <button type="button" onClick={() => setIsProfileOpen(true)} aria-label="Profile" className="shrink-0 cursor-pointer">
            {coachAvatar ? (
              <img src={coachAvatar} alt={coachName} className="w-12 h-12 rounded-full object-cover border border-accent-orange/60" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center border border-accent-orange/60">
                <span className="text-accent-orange text-sm font-heading font-bold">{coachName.slice(0, 2).toUpperCase()}</span>
              </div>
            )}
          </button>
        </div>

        <ProfileMenu
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          name={coachName}
          email={coachEmail}
          avatarUrl={coachAvatar}
          role="coach"
          onNameUpdated={setCoachName}
        />

        {/* Tiles */}
        {rows === null ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {TILE_ORDER.map((k) => {
              const active = openTile === k
              const n = counts[k]
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setOpen(k)}
                  className={`text-left rounded-2xl p-4 min-h-[96px] transition-colors cursor-pointer ${
                    active ? "ring-2 ring-accent-orange" : ""
                  } ${n > 0 ? "bg-[#F3EDE2] text-[#181310]" : "bg-white/5 text-text-muted"}`}
                >
                  <p className="font-heading text-4xl leading-none tabular-nums">{n}</p>
                  <p className="text-sm font-semibold mt-2 leading-tight">{TILE_LABELS[k]}</p>
                </button>
              )
            })}
          </div>
        )}

        {/* List for the opened tile */}
        {rows !== null && openTile && (
          <section aria-label={TILE_LABELS[openTile]} className="space-y-3">
            <h2 className="text-lg font-semibold">{TILE_LABELS[openTile]}</h2>
            {visible.length === 0 ? (
              <p className="text-text-muted text-base py-6">Nothing here. All done ✅</p>
            ) : (
              visible.map((r) => {
                const wa = waLink(r.phone, r.waText)
                return (
                  <div key={r.id} className="rounded-2xl bg-bg-card border border-border-subtle p-4">
                    <button
                      type="button"
                      onClick={() => r.clientId && router.push(`/clients/${r.clientId}`)}
                      className="text-left w-full cursor-pointer"
                    >
                      <p className="text-lg font-semibold leading-tight">{r.name}</p>
                      <p className="text-text-muted text-base mt-1">{r.reason}</p>
                    </button>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {wa ? (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-12 rounded-xl bg-[#25D366] text-black font-bold text-base flex items-center justify-center gap-2"
                        >
                          <MessageCircle className="w-5 h-5" /> WhatsApp
                        </a>
                      ) : (
                        <span className="h-12 rounded-xl bg-white/5 text-text-muted text-sm flex items-center justify-center">No number</span>
                      )}
                      {r.action.kind === "paid" ? (
                        <button type="button" disabled={busy} onClick={() => markPaid(r)} className="h-12 rounded-xl bg-accent-orange text-black font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer">
                          <Check className="w-5 h-5" /> Paid
                        </button>
                      ) : r.action.kind === "enquiry" ? (
                        <button type="button" onClick={() => doneEnquiry(r)} className="h-12 rounded-xl bg-accent-orange text-black font-bold text-base flex items-center justify-center gap-2 cursor-pointer">
                          <Check className="w-5 h-5" /> Done
                        </button>
                      ) : r.action.kind === "followup" ? (
                        <button type="button" onClick={() => { setSheetRow(r); setPickingDate(false) }} className="h-12 rounded-xl bg-accent-orange text-black font-bold text-base flex items-center justify-center gap-2 cursor-pointer">
                          <Check className="w-5 h-5" /> Done
                        </button>
                      ) : (
                        <button type="button" disabled={!r.clientId} onClick={() => r.clientId && router.push(`/clients/${r.clientId}`)} className="h-12 rounded-xl bg-white/10 text-white font-bold text-base cursor-pointer disabled:opacity-40">
                          Open
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </section>
        )}

        {/* Everything else, in plain words */}
        {rows !== null && (
          <div className="grid grid-cols-1 gap-2 pt-2">
            {[
              { href: "/checkins", label: "All check-ins" },
              { href: "/submissions", label: "Forms and enquiries" },
              { href: "/coach/schedule", label: "Call bookings" },
            ].map((l) => (
              <button key={l.href} type="button" onClick={() => router.push(l.href)} className="h-12 rounded-xl bg-white/5 text-white font-semibold text-base cursor-pointer text-left px-4">
                {l.label}
              </button>
            ))}
          </div>
        )}

        {/* Add client */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          aria-label="Add client"
          className="fixed right-5 bottom-28 z-40 h-14 px-5 rounded-full bg-accent-orange text-black font-bold text-base flex items-center gap-2 shadow-[0_8px_30px_rgba(255,106,26,0.35)] cursor-pointer"
        >
          <Plus className="w-5 h-5" /> Add client
        </button>
      </div>

      <AddClientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={load} />

      {/* Follow-up result sheet: one tap logs the outcome */}
      {sheetRow && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/70" onClick={() => setSheetRow(null)}>
          <div className="w-full max-w-lg mx-auto rounded-t-3xl bg-bg-card border-t border-border-subtle p-5 pb-8" onClick={(e) => e.stopPropagation()}>
            <p className="text-text-muted text-sm">{sheetRow.name}</p>
            <h3 className="font-heading italic text-2xl mb-4">{pickingDate ? "Follow up when?" : "How did it go?"}</h3>
            <div className="grid gap-2">
              {pickingDate
                ? AGAIN_CHIPS.map((c) => (
                    <button key={c.days} disabled={busy} onClick={() => saveFollowupResult("again", c.days)} className="h-14 rounded-xl bg-[#F3EDE2] text-[#181310] font-bold text-lg cursor-pointer disabled:opacity-50">
                      {c.label}
                    </button>
                  ))
                : RESULTS.map((r) => (
                    <button
                      key={r.key}
                      disabled={busy}
                      onClick={() => (r.key === "again" ? setPickingDate(true) : saveFollowupResult(r.key))}
                      className="h-14 rounded-xl bg-[#F3EDE2] text-[#181310] font-bold text-lg cursor-pointer disabled:opacity-50"
                    >
                      {r.label}
                    </button>
                  ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
