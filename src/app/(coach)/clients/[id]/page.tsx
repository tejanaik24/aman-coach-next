"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import {
  ArrowLeft,
  Dumbbell,
  MessageSquare,
  Check,
  ChevronDown,
  ChevronUp,
  User,
  FileText,
  MessageCircle,
  Phone,
  CalendarPlus,
} from "lucide-react"
import { format, differenceInDays } from "date-fns"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"
import { useStaggerReveal } from "@/hooks/useStaggerReveal"
import BadgesGrid from "@/components/client/BadgesGrid"
import { getClientBadges, type ClientBadge } from "@/lib/badges"
import AddFollowupSheet from "@/components/coach/AddFollowupSheet"
import SendPlanPanel from "@/components/coach/SendPlanPanel"
import { waLink } from "@/lib/quick-manage"
import type { ClientWithProfile, Checkin, Fee, WorkoutPlan, NutritionPlan } from "@/types"

type Tab = "overview" | "checkins" | "plans" | "fees"

const FOLLOWUP_LABEL: Record<string, string> = { checkin: "Check-in", payment: "Payment", renewal: "Renewal", feedback: "Feedback", birthday: "Birthday", other: "Follow-up" }

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
}

function statusBadge(status: string): string {
  if (status === "active") return "bg-accent-orange text-bg-primary"
  return "bg-bg-elevated text-text-muted"
}

function feeStatusBadge(status: string): string {
  if (status === "paid") return "bg-accent-orange/15 border border-accent-orange/30 text-accent-orange"
  if (status === "overdue") return "bg-danger/10 border border-danger/30 text-danger"
  return "bg-bg-elevated text-text-muted"
}

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  if (value === null || value === undefined) return null
  const pct = (value / 10) * 100
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-text-muted">{label}</span>
        <span className="text-text-primary font-bold">{value}/10</span>
      </div>
      <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-accent-orange transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton-pulse rounded ${className ?? ""}`} />
}

export default function ClientDetailPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()

  const [client, setClient] = useState<ClientWithProfile | null>(null)
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [fees, setFees] = useState<Fee[]>([])
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([])
  const [nutritionPlans, setNutritionPlans] = useState<NutritionPlan[]>([])
  const [clientBadges, setClientBadges] = useState<ClientBadge[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [expandedCheckin, setExpandedCheckin] = useState<string | null>(null)
  const [feedbackDraft, setFeedbackDraft] = useState<Record<string, string>>({})
  const [savingFeedback, setSavingFeedback] = useState<string | null>(null)
  const [followups, setFollowups] = useState<{ id: string; type: string; due_date: string; note: string | null }[]>([])
  const [followupOpen, setFollowupOpen] = useState(false)

  const actionsRef = useStaggerReveal<HTMLDivElement>([isLoading])

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const { data: clientRow } = await supabase.from("clients").select("*").eq("id", id).single()

    if (!clientRow) { setIsLoading(false); return }

    let profile = null
    if (clientRow.user_id) {
      const { data } = await supabase.from("profiles").select("*").eq("id", clientRow.user_id).single()
      profile = data
    }
    setClient({ ...clientRow, profile })

    const [r1, r2, r3, r4, badges, r5] = await Promise.allSettled([
      supabase.from("checkins").select("*").eq("client_id", id).order("submitted_at", { ascending: false }),
      supabase.from("fees").select("*").eq("client_id", id).order("due_date", { ascending: false }),
      supabase.from("workout_plans").select("*").eq("client_id", id).order("created_at", { ascending: false }),
      supabase.from("nutrition_plans").select("*").eq("client_id", id).order("created_at", { ascending: false }),
      getClientBadges(id),
      supabase.from("followups").select("id, type, due_date, note").eq("client_id", id).is("done_at", null).order("due_date").limit(3),
    ])

    if (r1.status === "fulfilled") setCheckins(r1.value.data ?? [])
    if (r2.status === "fulfilled") setFees(r2.value.data ?? [])
    if (r3.status === "fulfilled") setWorkoutPlans(r3.value.data ?? [])
    if (r4.status === "fulfilled") setNutritionPlans(r4.value.data ?? [])
    if (badges.status === "fulfilled") setClientBadges(badges.value)
    if (r5.status === "fulfilled") setFollowups(r5.value.data ?? [])
    setIsLoading(false)
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function sendLoginLink() {
    try {
      const res = await fetch(`/api/coach/clients/${id}/login-link`, { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) { toast.error(data.error ?? "Could not make the login link"); return }
      const first = (client?.profile?.name ?? "").split(" ")[0] || "there"
      const text = `Hi ${first}, tap this link to open your Aman Khurana Fitness app (no password needed): ${data.url}`
      const wa = waLink(client?.profile?.phone ?? null, text)
      if (!wa) { await navigator.clipboard.writeText(data.url); toast.success("No number saved. Link copied."); return }
      if (!window.open(wa, "_blank", "noopener")) window.location.href = wa
    } catch {
      toast.error("Could not make the login link")
    }
  }

  async function handleMarkAsPaid(feeId: string) {
    const supabase = createClient()
    const paidDate = new Date().toISOString().split("T")[0]
    const { error } = await supabase.from("fees").update({ status: "paid", paid_date: paidDate }).eq("id", feeId)
    if (error) { toast.error("Failed to update fee"); return }
    setFees((prev) => prev.map((f) => (f.id === feeId ? { ...f, status: "paid" as const, paid_date: paidDate } : f)))
    toast.success("Fee marked as paid")
  }

  async function handleSaveFeedback(checkinId: string) {
    const feedback = feedbackDraft[checkinId]
    if (!feedback?.trim()) return
    setSavingFeedback(checkinId)
    const response = await fetch(`/api/coach/checkins/${checkinId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback: feedback.trim() }),
    })
    setSavingFeedback(null)
    if (!response.ok) { toast.error("Failed to save feedback"); return }
    const now = new Date().toISOString()
    setCheckins((prev) => prev.map((c) => (c.id === checkinId ? { ...c, coach_feedback: feedback.trim(), reviewed_at: now } : c)))
    setFeedbackDraft((prev) => ({ ...prev, [checkinId]: "" }))
    toast.success("Feedback saved")
  }

  const name = client?.profile?.name ?? "Unknown"
  const phone = client?.profile?.phone
  const avatarUrl = client?.profile?.avatar_url ?? null
  const waHref = waLink(phone ?? null, `Hi ${name.split(" ")[0]}, this is Aman. `)
  const daysActive = client ? differenceInDays(new Date(), new Date(client.start_date)) : 0
  const activeWorkout = workoutPlans.find((p) => p.is_active)
  const activeNutrition = nutritionPlans.find((p) => p.is_active)
  const totalPaid = fees.filter((f) => f.status === "paid").reduce((s, f) => s + Number(f.amount), 0)

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "checkins", label: "Check-ins" },
    { key: "plans", label: "Plans" },
    { key: "fees", label: "Money" },
  ]

  return (
    <div className="bg-bg-primary min-h-full pb-24">
      {/* Hero header */}
      <div className="relative w-full h-[220px] overflow-hidden bg-bg-elevated">
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-accent-orange font-heading font-bold text-6xl">{name !== "Unknown" ? getInitials(name) : ""}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-black/30 to-transparent" />

        <button
          onClick={() => router.push("/clients")}
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-text-primary cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div className="absolute bottom-4 left-5 right-5">
          {isLoading ? (
            <Skeleton className="w-32 h-6" />
          ) : (
            <>
              {client && (
                <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${statusBadge(client.status)}`}>
                  {client.status} Client
                </span>
              )}
              <h2 className="font-heading font-bold text-xl text-text-primary tracking-tight mt-2.5 leading-none">{name}</h2>
              {client?.goal && <p className="text-[10px] text-text-muted font-bold mt-1">Goal: {client.goal}</p>}
            </>
          )}
        </div>
      </div>

      <div className="px-5 pt-5 flex flex-col gap-5">
        {/* Quick actions: talk, call, follow-up */}
        {!isLoading && (
          <div className="grid grid-cols-3 gap-3">
            {waHref ? (
              <a href={waHref} target="_blank" rel="noopener noreferrer" className="h-14 rounded-2xl bg-[#25D366] text-black font-bold text-sm flex items-center justify-center gap-1.5">
                <MessageCircle className="size-5" /> WhatsApp
              </a>
            ) : (
              <span className="h-14 rounded-2xl bg-white/5 text-text-muted text-sm flex items-center justify-center">No number</span>
            )}
            {phone ? (
              <a href={`tel:${phone}`} className="h-14 rounded-2xl bg-white/10 text-white font-bold text-sm flex items-center justify-center gap-1.5">
                <Phone className="size-5" /> Call
              </a>
            ) : (
              <span className="h-14 rounded-2xl bg-white/5 text-text-muted text-sm flex items-center justify-center">No number</span>
            )}
            <button type="button" onClick={() => setFollowupOpen(true)} className="h-14 rounded-2xl bg-accent-orange text-black font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer">
              <CalendarPlus className="size-5" /> Follow-up
            </button>
          </div>
        )}

        {!isLoading && phone && (
          <button type="button" onClick={sendLoginLink} className="h-12 rounded-xl bg-white/5 text-text-muted font-semibold text-base cursor-pointer">
            Send app login link on WhatsApp
          </button>
        )}

        {/* Next follow-ups */}
        {!isLoading && followups.length > 0 && (
          <div className="rounded-2xl bg-bg-card border border-border-subtle p-4 space-y-2">
            <p className="text-sm text-text-muted">Next follow-ups</p>
            {followups.slice(0, 3).map((f) => (
              <p key={f.id} className="text-base">
                <span className="font-semibold">{format(new Date(f.due_date + "T00:00:00"), "d MMM")}</span>
                <span className="text-text-muted"> · {FOLLOWUP_LABEL[f.type] ?? "Follow-up"}{f.note ? ` · ${f.note}` : ""}</span>
              </p>
            ))}
          </div>
        )}

        {/* Tab bar */}
        <div className="flex bg-bg-elevated p-1 rounded-full border border-border-subtle relative select-none">
          {tabs.map((t) => {
            const isSelected = activeTab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className="flex-1 py-3 text-center text-[11px] font-heading font-bold uppercase tracking-normal rounded-full relative z-10 cursor-pointer"
              >
                {isSelected && (
                  <motion.div
                    layoutId="detail-active-tab"
                    className="absolute inset-0 bg-accent-orange rounded-full"
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  />
                )}
                <span className={`relative z-20 ${isSelected ? "text-bg-primary" : "text-text-muted"}`}>{t.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {activeTab === "overview" && (
              <div className="space-y-4">
                <div className="bg-[#F3EDE2] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.5)] rounded-2xl p-4.5 space-y-3">
                  <h3 className="font-heading font-bold text-xs text-[#181310] uppercase tracking-wider border-b border-[#181310]/[0.08] pb-2 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-accent-orange" />
                    Client Details
                  </h3>
                  {client && (
                    <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                      <div>
                        <span className="text-[9px] text-[#8A7F70] uppercase">Start Date</span>
                        <p className="font-heading font-bold text-[#181310] mt-0.5">{format(new Date(client.start_date), "d MMM yy")}</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-[#8A7F70] uppercase">Days Active</span>
                        <p className="font-heading font-bold text-[#181310] mt-0.5">{daysActive}</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-[#8A7F70] uppercase">Package</span>
                        <p className="font-heading font-bold text-[#181310] mt-0.5">{client.package_name ?? "—"}</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-[#8A7F70] uppercase">Fee</span>
                        <p className="font-heading font-bold text-[#181310] mt-0.5">₹{Number(client.fee_amount).toLocaleString("en-IN")}/mo</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Client Badges & Achievements — stays dark, BadgesGrid is built for the dark theme */}
                <div className="bg-bg-card/80 border border-border-subtle backdrop-blur-xl rounded-2xl p-4.5">
                  <BadgesGrid unlockedBadges={clientBadges} title="Client Achievements" showAll={true} />
                </div>

                {activeWorkout ? (
                  <div className="bg-[#F3EDE2] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.5)] rounded-2xl p-4.5">
                    <div className="flex items-center gap-2 mb-3">
                      <Dumbbell className="size-4 text-accent-orange" />
                      <span className="text-[#181310] text-xs font-bold uppercase tracking-wider">Current Workout Plan</span>
                    </div>
                    <p className="text-[#181310] font-heading font-bold">{activeWorkout.name}</p>
                    <p className="text-[#8A7F70] text-xs mt-1">{activeWorkout.weeks} weeks · Created {format(new Date(activeWorkout.created_at), "d MMM yyyy")}</p>
                  </div>
                ) : (
                  <div className="bg-[#F3EDE2] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.5)] rounded-2xl p-4.5 text-center">
                    <p className="text-[#8A7F70] text-sm">No workout plan assigned</p>
                  </div>
                )}

                {activeNutrition && (
                  <div className="bg-[#F3EDE2] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.5)] rounded-2xl p-4.5">
                    <p className="text-[#181310] text-xs font-bold uppercase tracking-wider mb-3">Current Nutrition Plan</p>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {[
                        { label: "Calories", value: activeNutrition.total_calories },
                        { label: "Protein", value: activeNutrition.protein_g },
                        { label: "Carbs", value: activeNutrition.carbs_g },
                        { label: "Fats", value: activeNutrition.fats_g },
                      ].map((m) => (
                        <div key={m.label} className="bg-[#181310]/5 rounded-xl p-2">
                          <p className="text-[#181310] text-sm font-heading font-bold">{m.value ?? "—"}</p>
                          <p className="text-[#8A7F70] text-[9px] mt-0.5">{m.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Measurements progress table */}
                {checkins.some((c) => c.form_data?.measurements) && (
                  <div className="bg-[#F3EDE2] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.5)] rounded-2xl p-4.5 space-y-3.5">
                    <h3 className="font-heading font-bold text-xs text-[#181310] uppercase tracking-wider border-b border-[#181310]/[0.08] pb-2 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-accent-orange" />
                      Check-in Metrics
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-semibold">
                        <thead>
                          <tr className="text-[9px] text-[#8A7F70] uppercase tracking-wider border-b border-[#181310]/[0.08]">
                            <th className="py-1">Week</th>
                            <th className="py-1">Weight</th>
                            <th className="py-1">Abdomen</th>
                            <th className="py-1">Hips</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#181310]/[0.08] text-[#181310] font-heading">
                          {[...checkins].reverse().map((c) => {
                            const m = c.form_data?.measurements
                            return (
                              <tr key={c.id}>
                                <td className="py-2.5 text-[#8A7F70]">W{c.week_number ?? "?"}</td>
                                <td className="py-2.5">{m?.weight ?? c.weight ?? "—"}{(m?.weight ?? c.weight) ? " kg" : ""}</td>
                                <td className="py-2.5">{m?.abdomen ? `${m.abdomen} cm` : "—"}</td>
                                <td className="py-2.5">{m?.hips ? `${m.hips} cm` : "—"}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "checkins" && (
              <div className="space-y-3">
                {checkins.length === 0 ? (
                  <div className="bg-[#F3EDE2] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.5)] rounded-2xl p-10 text-center">
                    <p className="text-[#8A7F70] text-sm">No check-ins yet</p>
                  </div>
                ) : (
                  checkins.map((c) => {
                    const isExpanded = expandedCheckin === c.id
                    const avgScore =
                      [c.adherence_workout, c.adherence_nutrition].filter((v): v is number => v !== null).reduce((a, b, _, arr) => a + b / arr.length, 0) || null

                    return (
                      <div key={c.id} className="bg-[#F3EDE2] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden">
                        <button
                          onClick={() => setExpandedCheckin(isExpanded ? null : c.id)}
                          className="w-full flex items-center justify-between p-4 text-left cursor-pointer"
                        >
                          <div>
                            <p className="text-[#181310] text-sm font-bold">Week {c.week_number ?? "—"}</p>
                            <p className="text-[#8A7F70] text-xs mt-0.5">{format(new Date(c.submitted_at), "d MMM yyyy, h:mm a")}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {c.reviewed_at ? (
                              <span className="text-[9px] bg-accent-orange/15 border border-accent-orange/30 text-accent-orange px-2 py-0.5 rounded-full flex items-center gap-1 font-bold uppercase">
                                <Check className="size-3" /> Reviewed
                              </span>
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-accent-orange" />
                            )}
                            {avgScore !== null && <span className="text-xs text-[#8A7F70] font-bold">{Math.round(avgScore)}/10</span>}
                            {isExpanded ? <ChevronUp className="size-4 text-[#8A7F70]" /> : <ChevronDown className="size-4 text-[#8A7F70]" />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-3 border-t border-[#181310]/[0.08] pt-3">
                            {c.form_data ? (
                              <div className="space-y-2 text-xs">
                                <p className="text-[#8A7F70]"><span className="font-bold text-[#181310]">Workout deviation:</span> {c.form_data.training.workout_deviation || "—"}</p>
                                <p className="text-[#8A7F70]"><span className="font-bold text-[#181310]">Diet:</span> {c.form_data.diet.diet_deviation}</p>
                                <p className="text-[#8A7F70]"><span className="font-bold text-[#181310]">Sleep:</span> {c.form_data.general.sleep_quality || "—"}</p>
                              </div>
                            ) : null}
                            <div className="space-y-2">
                              <ScoreBar label="Workout adherence" value={c.adherence_workout} />
                              <ScoreBar label="Nutrition adherence" value={c.adherence_nutrition} />
                            </div>
                            {c.notes && (
                              <div className="bg-[#181310]/5 rounded-xl p-3">
                                <p className="text-[#8A7F70] text-[10px] uppercase font-bold mb-1">Client Note</p>
                                <p className="text-[#181310] text-sm">{c.notes}</p>
                              </div>
                            )}
                            {c.coach_feedback ? (
                              <div className="bg-accent-orange/10 border border-accent-orange/30 rounded-xl p-3">
                                <p className="text-accent-orange text-[10px] uppercase font-bold mb-1">Your Feedback</p>
                                <p className="text-[#181310] text-sm">{c.coach_feedback}</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <textarea
                                  value={feedbackDraft[c.id] ?? ""}
                                  onChange={(e) => setFeedbackDraft((prev) => ({ ...prev, [c.id]: e.target.value }))}
                                  placeholder="Add your feedback..."
                                  rows={2}
                                  className="w-full bg-[#181310]/5 border border-[#181310]/[0.08] focus:border-accent-orange rounded-xl px-3 py-2 text-[#181310] text-xs font-semibold outline-none resize-none transition-colors"
                                />
                                <motion.button
                                  whileTap={{ scale: 0.97 }}
                                  disabled={!feedbackDraft[c.id]?.trim() || savingFeedback === c.id}
                                  onClick={() => handleSaveFeedback(c.id)}
                                  className="flex items-center gap-1.5 h-9 px-4 rounded-full bg-accent-orange text-bg-primary text-xs font-bold disabled:opacity-50 cursor-pointer"
                                >
                                  <MessageSquare className="size-3" />
                                  {savingFeedback === c.id ? "Saving..." : "Add Feedback"}
                                </motion.button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {activeTab === "plans" && (
              <div className="space-y-6">
                <SendPlanPanel clientId={id} clientName={name} phone={phone} />
                <details className="rounded-2xl border border-border-subtle p-4">
                  <summary className="text-base font-semibold cursor-pointer">Plans built inside the app (advanced)</summary>
                  <div className="mt-4">
              <div className="space-y-4">
                <div>
                  <p className="text-text-muted text-xs font-bold mb-2 uppercase tracking-wider">Workout Plans</p>
                  {workoutPlans.length === 0 ? (
                    <div className="bg-[#F3EDE2] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.5)] rounded-2xl p-6 text-center">
                      <p className="text-[#8A7F70] text-sm">No workout plans yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {workoutPlans.map((p) => (
                        <div key={p.id} className="bg-[#F3EDE2] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.5)] rounded-2xl p-4 flex items-center justify-between">
                          <div>
                            <p className="text-[#181310] text-sm font-bold">{p.name}</p>
                            <p className="text-[#8A7F70] text-xs mt-0.5">{p.weeks} weeks · {format(new Date(p.created_at), "d MMM yyyy")}</p>
                          </div>
                          {p.is_active && <span className="text-[9px] bg-accent-orange/15 border border-accent-orange/30 text-accent-orange px-2 py-0.5 rounded-full font-bold uppercase">Active</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-text-muted text-xs font-bold mb-2 uppercase tracking-wider">Nutrition Plans</p>
                  {nutritionPlans.length === 0 ? (
                    <div className="bg-[#F3EDE2] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.5)] rounded-2xl p-6 text-center">
                      <p className="text-[#8A7F70] text-sm">No nutrition plans yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {nutritionPlans.map((p) => (
                        <div key={p.id} className="bg-[#F3EDE2] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.5)] rounded-2xl p-4 flex items-center justify-between">
                          <div>
                            <p className="text-[#181310] text-sm font-bold">{p.total_calories ? `${p.total_calories} kcal` : "Nutrition Plan"}</p>
                            <p className="text-[#8A7F70] text-xs mt-0.5">P {p.protein_g}g · C {p.carbs_g}g · F {p.fats_g}g</p>
                          </div>
                          {p.is_active && <span className="text-[9px] bg-accent-orange/15 border border-accent-orange/30 text-accent-orange px-2 py-0.5 rounded-full font-bold uppercase">Active</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => router.push("/plans/builder")}
                  className="w-full h-12 rounded-full bg-bg-card/80 border border-border-subtle backdrop-blur-xl text-text-primary text-sm font-bold cursor-pointer"
                >
                  Assign New Plan
                </motion.button>
              </div>
                  </div>
                </details>
              </div>
            )}

            {activeTab === "fees" && (
              <div className="space-y-3">
                {fees.length > 0 && (
                  <div className="bg-[#F3EDE2] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.5)] rounded-2xl p-4 flex justify-between items-center">
                    <span className="text-[#8A7F70] text-sm font-semibold">Total Paid</span>
                    <span className="text-accent-orange font-heading font-bold text-lg">₹{totalPaid.toLocaleString("en-IN")}</span>
                  </div>
                )}

                {fees.length === 0 ? (
                  <div className="bg-[#F3EDE2] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.5)] rounded-2xl p-10 text-center">
                    <p className="text-[#8A7F70] text-sm">No fee records yet</p>
                  </div>
                ) : (
                  fees.map((f) => (
                    <div key={f.id} className="bg-[#F3EDE2] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.5)] rounded-2xl p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[#181310] font-heading font-bold">₹{Number(f.amount).toLocaleString("en-IN")}</p>
                          <p className="text-[#8A7F70] text-xs mt-0.5">Due {format(new Date(f.due_date), "d MMM yyyy")}</p>
                          {f.paid_date && <p className="text-[#181310] text-xs mt-0.5 font-semibold">Paid {format(new Date(f.paid_date), "d MMM yyyy")}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${feeStatusBadge(f.status)}`}>{f.status}</span>
                          {(f.status === "pending" || f.status === "overdue") && (
                            <motion.button
                              whileTap={{ scale: 0.97 }}
                              onClick={() => handleMarkAsPaid(f.id)}
                              className="text-[10px] font-bold text-bg-primary bg-accent-orange px-2.5 py-1 rounded-full cursor-pointer"
                            >
                              Mark Paid
                            </motion.button>
                          )}
                        </div>
                      </div>
                      {f.notes && <p className="text-[#8A7F70] text-xs mt-2">{f.notes}</p>}
                    </div>
                  ))
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {followupOpen && (
        <AddFollowupSheet
          isOpen
          onClose={() => setFollowupOpen(false)}
          clientId={id}
          clientName={name}
          onSaved={fetchData}
        />
      )}
    </div>
  )
}
