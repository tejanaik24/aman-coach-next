"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import {
  ArrowLeft,
  Dumbbell,
  ClipboardList,
  IndianRupee,
  MessageSquare,
  Check,
  ChevronDown,
  ChevronUp,
  User,
  FileText,
} from "lucide-react"
import { format, differenceInDays } from "date-fns"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"
import type { ClientWithProfile, Checkin, Fee, WorkoutPlan, NutritionPlan } from "@/types"

type Tab = "overview" | "checkins" | "plans" | "fees"

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
}

function statusBadge(status: string): string {
  if (status === "active") return "bg-lime-electric text-charcoal-deep"
  return "bg-white/70 text-charcoal-deep"
}

function feeStatusBadge(status: string): string {
  if (status === "paid") return "bg-lime-tint border border-lime-electric/30 text-charcoal-deep"
  if (status === "overdue") return "bg-red-50 border border-red-100 text-red-700"
  return "bg-cream text-charcoal-deep"
}

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  if (value === null || value === undefined) return null
  const pct = (value / 10) * 100
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-charcoal-muted">{label}</span>
        <span className="text-charcoal-deep font-bold">{value}/10</span>
      </div>
      <div className="h-1.5 bg-cream rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-lime-electric transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-white/50 rounded ${className ?? ""}`} />
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
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [expandedCheckin, setExpandedCheckin] = useState<string | null>(null)
  const [feedbackDraft, setFeedbackDraft] = useState<Record<string, string>>({})
  const [savingFeedback, setSavingFeedback] = useState<string | null>(null)

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

    const [r1, r2, r3, r4] = await Promise.allSettled([
      supabase.from("checkins").select("*").eq("client_id", id).order("submitted_at", { ascending: false }),
      supabase.from("fees").select("*").eq("client_id", id).order("due_date", { ascending: false }),
      supabase.from("workout_plans").select("*").eq("client_id", id).order("created_at", { ascending: false }),
      supabase.from("nutrition_plans").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    ])

    if (r1.status === "fulfilled") setCheckins(r1.value.data ?? [])
    if (r2.status === "fulfilled") setFees(r2.value.data ?? [])
    if (r3.status === "fulfilled") setWorkoutPlans(r3.value.data ?? [])
    if (r4.status === "fulfilled") setNutritionPlans(r4.value.data ?? [])
    setIsLoading(false)
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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
    const supabase = createClient()
    const now = new Date().toISOString()
    const { error } = await supabase.from("checkins").update({ coach_feedback: feedback.trim(), reviewed_at: now }).eq("id", checkinId)
    setSavingFeedback(null)
    if (error) { toast.error("Failed to save feedback"); return }
    setCheckins((prev) => prev.map((c) => (c.id === checkinId ? { ...c, coach_feedback: feedback.trim(), reviewed_at: now } : c)))
    setFeedbackDraft((prev) => ({ ...prev, [checkinId]: "" }))
    toast.success("Feedback saved")
  }

  const name = client?.profile?.name ?? "Unknown"
  const phone = client?.profile?.phone
  const avatarUrl = client?.profile?.avatar_url ?? null
  const daysActive = client ? differenceInDays(new Date(), new Date(client.start_date)) : 0
  const activeWorkout = workoutPlans.find((p) => p.is_active)
  const activeNutrition = nutritionPlans.find((p) => p.is_active)
  const totalPaid = fees.filter((f) => f.status === "paid").reduce((s, f) => s + Number(f.amount), 0)

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "checkins", label: "Check-ins" },
    { key: "plans", label: "Plans" },
    { key: "fees", label: "Fees" },
  ]

  return (
    <div className="bg-cream min-h-full pb-24">
      {/* Hero header */}
      <div className="relative w-full h-[220px] overflow-hidden bg-charcoal-deep">
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-lime-electric font-montserrat font-black text-6xl">{name !== "Unknown" ? getInitials(name) : ""}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-cream via-charcoal-deep/30 to-transparent" />

        <button
          onClick={() => router.push("/clients")}
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/75 backdrop-blur-md flex items-center justify-center text-charcoal-deep shadow-sm"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div className="absolute bottom-4 left-5 right-5">
          {isLoading ? (
            <Skeleton className="w-32 h-6" />
          ) : (
            <>
              {client && (
                <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow ${statusBadge(client.status)}`}>
                  {client.status} Client
                </span>
              )}
              <h2 className="font-montserrat font-black text-xl text-charcoal-deep tracking-tight mt-2.5 leading-none">{name}</h2>
              {client?.goal && <p className="text-[10px] text-charcoal-muted font-bold mt-1">Goal: {client.goal}</p>}
            </>
          )}
        </div>
      </div>

      <div className="px-5 pt-5 flex flex-col gap-5">
        {/* Quick actions */}
        {!isLoading && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Dumbbell, label: "Assign Plan", action: () => router.push("/plans") },
              { icon: ClipboardList, label: "Check-in", action: () => setActiveTab("checkins") },
              { icon: IndianRupee, label: "Record Fee", action: () => setActiveTab("fees") },
            ].map(({ icon: Icon, label, action }) => (
              <motion.button
                key={label}
                whileTap={{ scale: 0.96 }}
                onClick={action}
                className="bg-white rounded-2xl shadow-bento p-3 flex flex-col items-center gap-1.5"
              >
                <Icon className="size-5 text-charcoal-deep" />
                <span className="text-charcoal-muted text-[10px] font-semibold">{label}</span>
              </motion.button>
            ))}
          </div>
        )}

        {phone && (
          <a
            href={`https://wa.me/${phone.replace("+", "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full h-11 rounded-full bg-white shadow-bento text-xs font-bold text-charcoal-deep"
          >
            WhatsApp {phone}
          </a>
        )}

        {/* Tab bar */}
        <div className="flex bg-white p-1 rounded-full border border-charcoal-muted/5 shadow-sm relative select-none">
          {tabs.map((t) => {
            const isSelected = activeTab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className="flex-1 py-2 text-center text-[10px] font-montserrat font-black uppercase tracking-wider rounded-full relative z-10"
              >
                {isSelected && (
                  <motion.div
                    layoutId="detail-active-tab"
                    className="absolute inset-0 bg-charcoal-deep rounded-full"
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  />
                )}
                <span className={`relative z-20 ${isSelected ? "text-lime-electric" : "text-charcoal-muted"}`}>{t.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {activeTab === "overview" && (
              <div className="space-y-4">
                <div className="bg-white rounded-card-mobile p-4.5 shadow-bento space-y-3">
                  <h3 className="font-montserrat font-bold text-xs text-charcoal-deep uppercase tracking-wider border-b border-cream pb-2 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-lime-electric" />
                    Client Details
                  </h3>
                  {client && (
                    <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                      <div>
                        <span className="text-[9px] text-charcoal-muted uppercase">Start Date</span>
                        <p className="font-montserrat font-bold text-charcoal-deep mt-0.5">{format(new Date(client.start_date), "d MMM yy")}</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-charcoal-muted uppercase">Days Active</span>
                        <p className="font-montserrat font-bold text-charcoal-deep mt-0.5">{daysActive}</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-charcoal-muted uppercase">Package</span>
                        <p className="font-montserrat font-bold text-charcoal-deep mt-0.5">{client.package_name ?? "—"}</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-charcoal-muted uppercase">Fee</span>
                        <p className="font-montserrat font-bold text-charcoal-deep mt-0.5">₹{Number(client.fee_amount).toLocaleString("en-IN")}/mo</p>
                      </div>
                    </div>
                  )}
                </div>

                {activeWorkout ? (
                  <div className="bg-white rounded-card-mobile p-4.5 shadow-bento">
                    <div className="flex items-center gap-2 mb-3">
                      <Dumbbell className="size-4 text-charcoal-deep" />
                      <span className="text-charcoal-deep text-xs font-bold uppercase tracking-wider">Current Workout Plan</span>
                    </div>
                    <p className="text-charcoal-deep font-montserrat font-bold">{activeWorkout.name}</p>
                    <p className="text-charcoal-muted text-xs mt-1">{activeWorkout.weeks} weeks · Created {format(new Date(activeWorkout.created_at), "d MMM yyyy")}</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-card-mobile p-4.5 shadow-bento text-center">
                    <p className="text-charcoal-muted text-sm">No workout plan assigned</p>
                  </div>
                )}

                {activeNutrition && (
                  <div className="bg-white rounded-card-mobile p-4.5 shadow-bento">
                    <p className="text-charcoal-deep text-xs font-bold uppercase tracking-wider mb-3">Current Nutrition Plan</p>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {[
                        { label: "Calories", value: activeNutrition.total_calories },
                        { label: "Protein", value: activeNutrition.protein_g },
                        { label: "Carbs", value: activeNutrition.carbs_g },
                        { label: "Fats", value: activeNutrition.fats_g },
                      ].map((m) => (
                        <div key={m.label} className="bg-cream rounded-xl p-2">
                          <p className="text-charcoal-deep text-sm font-montserrat font-bold">{m.value ?? "—"}</p>
                          <p className="text-charcoal-muted text-[9px] mt-0.5">{m.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Measurements progress table */}
                {checkins.some((c) => c.form_data?.measurements) && (
                  <div className="bg-white rounded-card-mobile p-4.5 shadow-bento space-y-3.5">
                    <h3 className="font-montserrat font-bold text-xs text-charcoal-deep uppercase tracking-wider border-b border-cream pb-2 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-lime-electric" />
                      Check-in Metrics
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-semibold">
                        <thead>
                          <tr className="text-[9px] text-charcoal-muted uppercase tracking-wider border-b border-cream">
                            <th className="py-1">Week</th>
                            <th className="py-1">Weight</th>
                            <th className="py-1">Abdomen</th>
                            <th className="py-1">Hips</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-cream text-charcoal-deep font-montserrat">
                          {[...checkins].reverse().map((c) => {
                            const m = c.form_data?.measurements
                            return (
                              <tr key={c.id}>
                                <td className="py-2.5 text-charcoal-muted">W{c.week_number ?? "?"}</td>
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
                  <div className="bg-white rounded-card-mobile shadow-bento p-10 text-center">
                    <p className="text-charcoal-muted text-sm">No check-ins yet</p>
                  </div>
                ) : (
                  checkins.map((c) => {
                    const isExpanded = expandedCheckin === c.id
                    const avgScore =
                      [c.adherence_workout, c.adherence_nutrition].filter((v): v is number => v !== null).reduce((a, b, _, arr) => a + b / arr.length, 0) || null

                    return (
                      <div key={c.id} className="bg-white rounded-card-mobile shadow-bento overflow-hidden">
                        <button
                          onClick={() => setExpandedCheckin(isExpanded ? null : c.id)}
                          className="w-full flex items-center justify-between p-4 text-left"
                        >
                          <div>
                            <p className="text-charcoal-deep text-sm font-bold">Week {c.week_number ?? "—"}</p>
                            <p className="text-charcoal-muted text-xs mt-0.5">{format(new Date(c.submitted_at), "d MMM yyyy, h:mm a")}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {c.reviewed_at ? (
                              <span className="text-[9px] bg-lime-tint border border-lime-electric/30 text-charcoal-deep px-2 py-0.5 rounded-full flex items-center gap-1 font-bold uppercase">
                                <Check className="size-3" /> Reviewed
                              </span>
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-lime-electric" />
                            )}
                            {avgScore !== null && <span className="text-xs text-charcoal-muted font-bold">{Math.round(avgScore)}/10</span>}
                            {isExpanded ? <ChevronUp className="size-4 text-charcoal-muted" /> : <ChevronDown className="size-4 text-charcoal-muted" />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-3 border-t border-cream pt-3">
                            {c.form_data ? (
                              <div className="space-y-2 text-xs">
                                <p className="text-charcoal-muted"><span className="font-bold text-charcoal-deep">Workout deviation:</span> {c.form_data.training.workout_deviation || "—"}</p>
                                <p className="text-charcoal-muted"><span className="font-bold text-charcoal-deep">Diet:</span> {c.form_data.diet.diet_deviation}</p>
                                <p className="text-charcoal-muted"><span className="font-bold text-charcoal-deep">Sleep:</span> {c.form_data.general.sleep_quality || "—"}</p>
                              </div>
                            ) : null}
                            <div className="space-y-2">
                              <ScoreBar label="Workout adherence" value={c.adherence_workout} />
                              <ScoreBar label="Nutrition adherence" value={c.adherence_nutrition} />
                            </div>
                            {c.notes && (
                              <div className="bg-cream rounded-xl p-3">
                                <p className="text-charcoal-muted text-[10px] uppercase font-bold mb-1">Client Note</p>
                                <p className="text-charcoal-deep text-sm">{c.notes}</p>
                              </div>
                            )}
                            {c.coach_feedback ? (
                              <div className="bg-lime-tint border border-lime-electric/30 rounded-xl p-3">
                                <p className="text-charcoal-deep text-[10px] uppercase font-bold mb-1">Your Feedback</p>
                                <p className="text-charcoal-deep text-sm">{c.coach_feedback}</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <textarea
                                  value={feedbackDraft[c.id] ?? ""}
                                  onChange={(e) => setFeedbackDraft((prev) => ({ ...prev, [c.id]: e.target.value }))}
                                  placeholder="Add your feedback..."
                                  rows={2}
                                  className="w-full bg-cream border-2 border-transparent focus:border-lime-electric rounded-input px-3 py-2 text-charcoal-deep text-xs font-semibold outline-none resize-none"
                                />
                                <motion.button
                                  whileTap={{ scale: 0.97 }}
                                  disabled={!feedbackDraft[c.id]?.trim() || savingFeedback === c.id}
                                  onClick={() => handleSaveFeedback(c.id)}
                                  className="flex items-center gap-1.5 h-9 px-4 rounded-full bg-lime-electric text-charcoal-deep text-xs font-bold disabled:opacity-50"
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
              <div className="space-y-4">
                <div>
                  <p className="text-charcoal-muted text-xs font-bold mb-2 uppercase tracking-wider">Workout Plans</p>
                  {workoutPlans.length === 0 ? (
                    <div className="bg-white rounded-card-mobile shadow-bento p-6 text-center">
                      <p className="text-charcoal-muted text-sm">No workout plans yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {workoutPlans.map((p) => (
                        <div key={p.id} className="bg-white rounded-card-mobile shadow-bento p-4 flex items-center justify-between">
                          <div>
                            <p className="text-charcoal-deep text-sm font-bold">{p.name}</p>
                            <p className="text-charcoal-muted text-xs mt-0.5">{p.weeks} weeks · {format(new Date(p.created_at), "d MMM yyyy")}</p>
                          </div>
                          {p.is_active && <span className="text-[9px] bg-lime-tint border border-lime-electric/30 text-charcoal-deep px-2 py-0.5 rounded-full font-bold uppercase">Active</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-charcoal-muted text-xs font-bold mb-2 uppercase tracking-wider">Nutrition Plans</p>
                  {nutritionPlans.length === 0 ? (
                    <div className="bg-white rounded-card-mobile shadow-bento p-6 text-center">
                      <p className="text-charcoal-muted text-sm">No nutrition plans yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {nutritionPlans.map((p) => (
                        <div key={p.id} className="bg-white rounded-card-mobile shadow-bento p-4 flex items-center justify-between">
                          <div>
                            <p className="text-charcoal-deep text-sm font-bold">{p.total_calories ? `${p.total_calories} kcal` : "Nutrition Plan"}</p>
                            <p className="text-charcoal-muted text-xs mt-0.5">P {p.protein_g}g · C {p.carbs_g}g · F {p.fats_g}g</p>
                          </div>
                          {p.is_active && <span className="text-[9px] bg-lime-tint border border-lime-electric/30 text-charcoal-deep px-2 py-0.5 rounded-full font-bold uppercase">Active</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => router.push("/plans")}
                  className="w-full h-12 rounded-full bg-white shadow-bento text-charcoal-deep text-sm font-bold"
                >
                  Assign New Plan
                </motion.button>
              </div>
            )}

            {activeTab === "fees" && (
              <div className="space-y-3">
                {fees.length > 0 && (
                  <div className="bg-white rounded-card-mobile shadow-bento p-4 flex justify-between items-center">
                    <span className="text-charcoal-muted text-sm font-semibold">Total Paid</span>
                    <span className="text-charcoal-deep font-montserrat font-black text-lg">₹{totalPaid.toLocaleString("en-IN")}</span>
                  </div>
                )}

                {fees.length === 0 ? (
                  <div className="bg-white rounded-card-mobile shadow-bento p-10 text-center">
                    <p className="text-charcoal-muted text-sm">No fee records yet</p>
                  </div>
                ) : (
                  fees.map((f) => (
                    <div key={f.id} className="bg-white rounded-card-mobile shadow-bento p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-charcoal-deep font-montserrat font-bold">₹{Number(f.amount).toLocaleString("en-IN")}</p>
                          <p className="text-charcoal-muted text-xs mt-0.5">Due {format(new Date(f.due_date), "d MMM yyyy")}</p>
                          {f.paid_date && <p className="text-charcoal-deep text-xs mt-0.5 font-semibold">Paid {format(new Date(f.paid_date), "d MMM yyyy")}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${feeStatusBadge(f.status)}`}>{f.status}</span>
                          {(f.status === "pending" || f.status === "overdue") && (
                            <motion.button
                              whileTap={{ scale: 0.97 }}
                              onClick={() => handleMarkAsPaid(f.id)}
                              className="text-[10px] font-bold text-charcoal-deep bg-lime-electric px-2.5 py-1 rounded-full"
                            >
                              Mark Paid
                            </motion.button>
                          )}
                        </div>
                      </div>
                      {f.notes && <p className="text-charcoal-muted text-xs mt-2">{f.notes}</p>}
                    </div>
                  ))
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
