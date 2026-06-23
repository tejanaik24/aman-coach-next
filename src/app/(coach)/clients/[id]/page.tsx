"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import {
  ChevronLeft,
  Dumbbell,
  ClipboardList,
  IndianRupee,
  MessageSquare,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { format, differenceInDays } from "date-fns"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { ClientWithProfile, Checkin, Fee, WorkoutPlan, NutritionPlan } from "@/types"

type Tab = "overview" | "plans" | "checkins" | "fees"

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function statusBadge(status: string): string {
  if (status === "active") return "bg-green-500/15 text-green-400"
  if (status === "paused") return "bg-yellow-500/15 text-yellow-400"
  return "bg-[#222222] text-[#555555]"
}

function feeStatusBadge(status: string): string {
  if (status === "paid") return "bg-green-500/15 text-green-400"
  if (status === "overdue") return "bg-red-500/15 text-red-400"
  return "bg-yellow-500/15 text-yellow-400"
}

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  if (!value) return null
  const pct = (value / 10) * 100
  const color = value >= 8 ? "#22c55e" : value >= 5 ? "#f59e0b" : "#ef4444"
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[#A0A0A0]">{label}</span>
        <span className="text-white font-medium">{value}/10</span>
      </div>
      <div className="h-1.5 bg-[#222222] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-[#222222] rounded", className)} />
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
    const { data: clientRow } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .single()

    if (!clientRow) {
      setIsLoading(false)
      return
    }

    let profile = null
    if (clientRow.user_id) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", clientRow.user_id)
        .single()
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
    const { error } = await supabase
      .from("fees")
      .update({ status: "paid", paid_date: paidDate })
      .eq("id", feeId)
    if (error) { toast.error("Failed to update fee"); return }
    setFees((prev) =>
      prev.map((f) =>
        f.id === feeId ? { ...f, status: "paid" as const, paid_date: paidDate } : f
      )
    )
    toast.success("Fee marked as paid")
  }

  async function handleSaveFeedback(checkinId: string) {
    const feedback = feedbackDraft[checkinId]
    if (!feedback?.trim()) return
    setSavingFeedback(checkinId)
    const supabase = createClient()
    const now = new Date().toISOString()
    const { error } = await supabase
      .from("checkins")
      .update({ coach_feedback: feedback.trim(), reviewed_at: now })
      .eq("id", checkinId)
    setSavingFeedback(null)
    if (error) { toast.error("Failed to save feedback"); return }
    setCheckins((prev) =>
      prev.map((c) =>
        c.id === checkinId ? { ...c, coach_feedback: feedback.trim(), reviewed_at: now } : c
      )
    )
    setFeedbackDraft((prev) => ({ ...prev, [checkinId]: "" }))
    toast.success("Feedback saved")
  }

  const name = client?.profile?.name ?? "Unknown"
  const phone = client?.profile?.phone
  const daysActive = client
    ? differenceInDays(new Date(), new Date(client.start_date))
    : 0
  const latestCheckin = checkins[0]
  const activeWorkout = workoutPlans.find((p) => p.is_active)
  const activeNutrition = nutritionPlans.find((p) => p.is_active)
  const totalPaid = fees
    .filter((f) => f.status === "paid")
    .reduce((s, f) => s + Number(f.amount), 0)

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "plans", label: "Plans" },
    { key: "checkins", label: "Check-ins" },
    { key: "fees", label: "Fees" },
  ]

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 bg-[#0A0A0A] sticky top-0 z-10">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-[#A0A0A0] hover:text-white transition-colors"
        >
          <ChevronLeft className="size-5" />
          <span className="text-sm">Back</span>
        </button>
        {isLoading ? (
          <Skeleton className="w-32 h-5" />
        ) : (
          <h1
            className="text-white font-bold text-base"
            style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
          >
            {name}
          </h1>
        )}
        <div className="w-16" />
      </div>

      <div className="px-4 pb-8 space-y-4">
        {/* Profile hero */}
        {isLoading ? (
          <div className="bg-[#161616] border border-[#222222] rounded-2xl p-5 space-y-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#222222]" />
              <div className="space-y-2">
                <Skeleton className="w-32 h-5" />
                <Skeleton className="w-20 h-4" />
              </div>
            </div>
          </div>
        ) : client ? (
          <div className="bg-[#161616] border border-[#222222] rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#C9A84C] flex items-center justify-center flex-shrink-0">
                <span className="text-black text-xl font-bold">{getInitials(name)}</span>
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">{name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {client.goal && (
                    <span className="text-xs text-[#C9A84C] bg-[#C9A84C]/10 px-2 py-0.5 rounded-full">
                      {client.goal}
                    </span>
                  )}
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full capitalize",
                      statusBadge(client.status)
                    )}
                  >
                    {client.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { label: "Start Date", value: format(new Date(client.start_date), "d MMM yy") },
                { label: "Package", value: client.package_name ?? "—" },
                { label: "Days Active", value: daysActive.toString() },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <p className="text-white text-sm font-semibold truncate">{item.value}</p>
                  <p className="text-[#555555] text-xs mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>

            {phone && (
              <a
                href={`https://wa.me/${phone.replace("+", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full h-10 rounded-xl bg-[#1A1A1A] border border-[#333333] text-sm text-white hover:border-[#C9A84C] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                WhatsApp {phone}
              </a>
            )}
          </div>
        ) : null}

        {/* Quick actions */}
        {!isLoading && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Dumbbell, label: "Assign Plan", action: () => router.push("/coach/plans") },
              {
                icon: ClipboardList,
                label: "Check-in",
                action: () => setActiveTab("checkins"),
              },
              { icon: IndianRupee, label: "Record Fee", action: () => setActiveTab("fees") },
            ].map(({ icon: Icon, label, action }) => (
              <motion.button
                key={label}
                whileTap={{ scale: 0.96 }}
                onClick={action}
                className="bg-[#1A1A1A] border border-[#222222] rounded-xl p-3 flex flex-col items-center gap-1.5 hover:border-[#333333] transition-colors"
              >
                <Icon className="size-5 text-[#C9A84C]" />
                <span className="text-[#A0A0A0] text-xs">{label}</span>
              </motion.button>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="sticky top-[60px] z-10 bg-[#0A0A0A] -mx-4 px-4 py-2">
          <div className="flex border-b border-[#1E1E1E]">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  "flex-1 pb-2.5 text-xs font-medium transition-colors relative",
                  activeTab === t.key ? "text-white" : "text-[#555555]"
                )}
              >
                {t.label}
                {activeTab === t.key && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-px bg-[#C9A84C]"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {/* OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-4">
                {activeWorkout ? (
                  <div className="bg-[#161616] border border-[#222222] rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Dumbbell className="size-4 text-[#C9A84C]" />
                      <span className="text-white text-sm font-semibold">Current Workout Plan</span>
                    </div>
                    <p className="text-white font-medium">{activeWorkout.name}</p>
                    <p className="text-[#A0A0A0] text-xs mt-1">
                      {activeWorkout.weeks} weeks · Created{" "}
                      {format(new Date(activeWorkout.created_at), "d MMM yyyy")}
                    </p>
                  </div>
                ) : (
                  <div className="bg-[#161616] border border-[#222222] rounded-2xl p-4 text-center">
                    <Dumbbell className="size-6 text-[#333333] mx-auto mb-2" />
                    <p className="text-[#555555] text-sm">No workout plan assigned</p>
                  </div>
                )}

                {activeNutrition ? (
                  <div className="bg-[#161616] border border-[#222222] rounded-2xl p-4">
                    <p className="text-white text-sm font-semibold mb-3">Current Nutrition Plan</p>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {[
                        { label: "Calories", value: activeNutrition.total_calories, unit: "kcal", color: "#C9A84C" },
                        { label: "Protein", value: activeNutrition.protein_g, unit: "g", color: "#3b82f6" },
                        { label: "Carbs", value: activeNutrition.carbs_g, unit: "g", color: "#22c55e" },
                        { label: "Fats", value: activeNutrition.fats_g, unit: "g", color: "#f97316" },
                      ].map((m) => (
                        <div key={m.label} className="bg-[#1A1A1A] rounded-xl p-2">
                          <p className="text-white text-sm font-bold">{m.value ?? "—"}</p>
                          <p className="text-xs mt-0.5" style={{ color: m.color }}>{m.unit}</p>
                          <p className="text-[#555555] text-xs">{m.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#161616] border border-[#222222] rounded-2xl p-4 text-center">
                    <p className="text-[#555555] text-sm">No nutrition plan assigned</p>
                  </div>
                )}

                {latestCheckin ? (
                  <div className="bg-[#161616] border border-[#222222] rounded-2xl p-4">
                    <p className="text-white text-sm font-semibold mb-3">
                      Latest Check-in{" "}
                      <span className="text-[#555555] font-normal text-xs">
                        · Week {latestCheckin.week_number} ·{" "}
                        {format(new Date(latestCheckin.submitted_at), "d MMM")}
                      </span>
                    </p>
                    <div className="space-y-2.5">
                      {latestCheckin.weight && (
                        <div className="flex justify-between text-sm">
                          <span className="text-[#A0A0A0]">Weight</span>
                          <span className="text-white font-medium">
                            {latestCheckin.weight} kg
                          </span>
                        </div>
                      )}
                      <ScoreBar label="Energy" value={latestCheckin.energy_level} />
                      <ScoreBar label="Sleep" value={latestCheckin.sleep_quality} />
                      <ScoreBar label="Workout adherence" value={latestCheckin.adherence_workout} />
                      <ScoreBar label="Nutrition adherence" value={latestCheckin.adherence_nutrition} />
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#161616] border border-[#222222] rounded-2xl p-4 text-center">
                    <p className="text-[#555555] text-sm">No check-ins yet</p>
                  </div>
                )}
              </div>
            )}

            {/* PLANS */}
            {activeTab === "plans" && (
              <div className="space-y-4">
                <div>
                  <p className="text-[#A0A0A0] text-xs font-medium mb-2 uppercase tracking-wider">
                    Workout Plans
                  </p>
                  {workoutPlans.length === 0 ? (
                    <div className="bg-[#161616] border border-[#222222] rounded-2xl p-6 text-center">
                      <p className="text-[#555555] text-sm">No workout plans yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {workoutPlans.map((p) => (
                        <div
                          key={p.id}
                          className="bg-[#161616] border border-[#222222] rounded-2xl p-4 flex items-center justify-between"
                        >
                          <div>
                            <p className="text-white text-sm font-medium">{p.name}</p>
                            <p className="text-[#555555] text-xs mt-0.5">
                              {p.weeks} weeks · {format(new Date(p.created_at), "d MMM yyyy")}
                            </p>
                          </div>
                          {p.is_active && (
                            <span className="text-xs bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full">
                              Active
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-[#A0A0A0] text-xs font-medium mb-2 uppercase tracking-wider">
                    Nutrition Plans
                  </p>
                  {nutritionPlans.length === 0 ? (
                    <div className="bg-[#161616] border border-[#222222] rounded-2xl p-6 text-center">
                      <p className="text-[#555555] text-sm">No nutrition plans yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {nutritionPlans.map((p) => (
                        <div
                          key={p.id}
                          className="bg-[#161616] border border-[#222222] rounded-2xl p-4 flex items-center justify-between"
                        >
                          <div>
                            <p className="text-white text-sm font-medium">
                              {p.total_calories ? `${p.total_calories} kcal` : "Nutrition Plan"}
                            </p>
                            <p className="text-[#555555] text-xs mt-0.5">
                              P {p.protein_g}g · C {p.carbs_g}g · F {p.fats_g}g
                            </p>
                          </div>
                          {p.is_active && (
                            <span className="text-xs bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full">
                              Active
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => router.push("/coach/plans")}
                  className="w-full h-12 rounded-2xl bg-[#1A1A1A] border border-[#333333] text-[#A0A0A0] text-sm font-medium hover:border-[#C9A84C] hover:text-[#C9A84C] transition-colors"
                >
                  Assign New Plan
                </motion.button>
              </div>
            )}

            {/* CHECK-INS */}
            {activeTab === "checkins" && (
              <div className="space-y-3">
                {checkins.length === 0 ? (
                  <div className="bg-[#161616] border border-[#222222] rounded-2xl p-10 text-center">
                    <p className="text-[#555555] text-sm">No check-ins yet</p>
                  </div>
                ) : (
                  checkins.map((c) => {
                    const isExpanded = expandedCheckin === c.id
                    const avgScore =
                      [c.adherence_workout, c.adherence_nutrition]
                        .filter((v): v is number => v !== null)
                        .reduce((a, b, _, arr) => a + b / arr.length, 0) || null

                    return (
                      <div
                        key={c.id}
                        className="bg-[#161616] border border-[#222222] rounded-2xl overflow-hidden"
                      >
                        <button
                          onClick={() =>
                            setExpandedCheckin(isExpanded ? null : c.id)
                          }
                          className="w-full flex items-center justify-between p-4 text-left hover:bg-[#1A1A1A] transition-colors"
                        >
                          <div>
                            <p className="text-white text-sm font-medium">
                              Week {c.week_number ?? "—"}
                            </p>
                            <p className="text-[#555555] text-xs mt-0.5">
                              {format(new Date(c.submitted_at), "d MMM yyyy, h:mm a")}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {c.reviewed_at ? (
                              <span className="text-xs bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Check className="size-3" /> Reviewed
                              </span>
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-[#C9A84C]" />
                            )}
                            {avgScore !== null && (
                              <span className="text-xs text-[#A0A0A0]">
                                {Math.round(avgScore)}/10
                              </span>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="size-4 text-[#555555]" />
                            ) : (
                              <ChevronDown className="size-4 text-[#555555]" />
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-3 border-t border-[#1E1E1E] pt-3">
                            {c.weight && (
                              <div className="flex justify-between text-sm">
                                <span className="text-[#A0A0A0]">Weight</span>
                                <span className="text-white font-medium">{c.weight} kg</span>
                              </div>
                            )}
                            <div className="space-y-2">
                              <ScoreBar label="Energy" value={c.energy_level} />
                              <ScoreBar label="Sleep" value={c.sleep_quality} />
                              <ScoreBar label="Workout" value={c.adherence_workout} />
                              <ScoreBar label="Nutrition" value={c.adherence_nutrition} />
                            </div>
                            {c.notes && (
                              <div className="bg-[#1A1A1A] rounded-xl p-3">
                                <p className="text-[#A0A0A0] text-xs mb-1">Client Note</p>
                                <p className="text-white text-sm">{c.notes}</p>
                              </div>
                            )}
                            {c.coach_feedback ? (
                              <div className="bg-[#C9A84C]/5 border border-[#C9A84C]/20 rounded-xl p-3">
                                <p className="text-[#C9A84C] text-xs mb-1">Your Feedback</p>
                                <p className="text-white text-sm">{c.coach_feedback}</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <textarea
                                  value={feedbackDraft[c.id] ?? ""}
                                  onChange={(e) =>
                                    setFeedbackDraft((prev) => ({
                                      ...prev,
                                      [c.id]: e.target.value,
                                    }))
                                  }
                                  placeholder="Add your feedback..."
                                  rows={2}
                                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[#C9A84C] transition-colors placeholder:text-[#555555] resize-none"
                                />
                                <motion.button
                                  whileTap={{ scale: 0.97 }}
                                  disabled={!feedbackDraft[c.id]?.trim() || savingFeedback === c.id}
                                  onClick={() => handleSaveFeedback(c.id)}
                                  className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#C9A84C] text-black text-xs font-semibold disabled:opacity-50"
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

            {/* FEES */}
            {activeTab === "fees" && (
              <div className="space-y-3">
                {fees.length > 0 && (
                  <div className="bg-[#161616] border border-[#222222] rounded-2xl p-4 flex justify-between items-center">
                    <span className="text-[#A0A0A0] text-sm">Total Paid</span>
                    <span className="text-white font-bold text-lg">
                      ₹{totalPaid.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}

                {fees.length === 0 ? (
                  <div className="bg-[#161616] border border-[#222222] rounded-2xl p-10 text-center">
                    <p className="text-[#555555] text-sm">No fee records yet</p>
                  </div>
                ) : (
                  fees.map((f) => (
                    <div
                      key={f.id}
                      className="bg-[#161616] border border-[#222222] rounded-2xl p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-white font-semibold">
                            ₹{Number(f.amount).toLocaleString("en-IN")}
                          </p>
                          <p className="text-[#555555] text-xs mt-0.5">
                            Due {format(new Date(f.due_date), "d MMM yyyy")}
                          </p>
                          {f.paid_date && (
                            <p className="text-green-400 text-xs mt-0.5">
                              Paid {format(new Date(f.paid_date), "d MMM yyyy")}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={cn(
                              "text-xs px-2 py-0.5 rounded-full capitalize",
                              feeStatusBadge(f.status)
                            )}
                          >
                            {f.status}
                          </span>
                          {(f.status === "pending" || f.status === "overdue") && (
                            <motion.button
                              whileTap={{ scale: 0.97 }}
                              onClick={() => handleMarkAsPaid(f.id)}
                              className="text-xs text-[#C9A84C] border border-[#C9A84C]/30 px-2.5 py-1 rounded-lg hover:bg-[#C9A84C]/10 transition-colors"
                            >
                              Mark Paid
                            </motion.button>
                          )}
                        </div>
                      </div>
                      {f.notes && (
                        <p className="text-[#555555] text-xs mt-2">{f.notes}</p>
                      )}
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
