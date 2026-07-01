"use client"

import { useState, useEffect, useCallback, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { Dumbbell, Apple, Plus, X } from "lucide-react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import toast from "react-hot-toast"
import { cn } from "@/lib/utils"
import type { Client, WorkoutPlan, NutritionPlan, Profile } from "@/types"

type TabKey = "workout" | "nutrition"

interface WorkoutPlanWithClient extends WorkoutPlan {
  clientName: string
}

interface NutritionPlanWithClient extends NutritionPlan {
  clientName: string
}

interface ClientOption {
  clientId: string
  name: string
}

function PlanSkeleton() {
  return (
    <div className="bg-[#161616] border border-[#222222] rounded-2xl p-4 space-y-3 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="w-40 h-4 rounded bg-[#222222]" />
          <div className="w-24 h-3 rounded bg-[#222222]" />
        </div>
        <div className="w-14 h-5 rounded-full bg-[#222222]" />
      </div>
      <div className="flex gap-2">
        <div className="w-16 h-4 rounded-full bg-[#222222]" />
        <div className="w-20 h-4 rounded-full bg-[#222222]" />
      </div>
    </div>
  )
}

const inputClass =
  "w-full bg-[#1A1A1A] border border-[#333333] rounded-2xl h-14 px-4 text-white outline-none focus:border-[#C9A84C] transition-colors placeholder:text-[#555555] text-sm"

export default function PlansPage() {
  const router = useRouter()
  const supabase = createClient()

  const [tab, setTab] = useState<TabKey>("workout")
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlanWithClient[]>([])
  const [nutritionPlans, setNutritionPlans] = useState<NutritionPlanWithClient[]>([])
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Modal form state
  const [selectedClientId, setSelectedClientId] = useState("")
  const [planName, setPlanName] = useState("")
  const [weeks, setWeeks] = useState("12")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      const coachId = userData.user.id

      // Fetch clients, workout plans, and nutrition plans in parallel
      const [clientRes, workoutRes, nutritionRes] = await Promise.all([
        supabase
          .from("clients")
          .select("id, user_id")
          .eq("coach_id", coachId),
        supabase
          .from("workout_plans")
          .select("*")
          .eq("coach_id", coachId)
          .order("created_at", { ascending: false }),
        supabase
          .from("nutrition_plans")
          .select("*")
          .eq("coach_id", coachId)
          .order("created_at", { ascending: false }),
      ])

      const clients = (clientRes.data as Pick<Client, "id" | "user_id">[] | null) ?? []
      const userIds = clients.map((c) => c.user_id).filter((uid): uid is string => uid !== null)

      // Fetch profiles for client names
      let nameByUserId = new Map<string, string>()
      if (userIds.length > 0) {
        const { data: profileRows } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", userIds)
        const profiles = (profileRows as Pick<Profile, "id" | "name">[] | null) ?? []
        for (const p of profiles) {
          nameByUserId.set(p.id, p.name)
        }
      }

      // Map client_id → user_id
      const userIdByClientId = new Map<string, string>()
      for (const c of clients) {
        if (c.user_id) userIdByClientId.set(c.id, c.user_id)
      }

      function resolveClientName(clientId: string): string {
        const uid = userIdByClientId.get(clientId)
        if (!uid) return "Unknown"
        return nameByUserId.get(uid) ?? "Unknown"
      }

      // Build client options for the create modal
      const options: ClientOption[] = clients.map((c) => ({
        clientId: c.id,
        name: resolveClientName(c.id),
      }))
      setClientOptions(options)

      // Enrich plans with client names
      const wPlans = (workoutRes.data as WorkoutPlan[] | null) ?? []
      setWorkoutPlans(
        wPlans.map((p) => ({ ...p, clientName: resolveClientName(p.client_id) }))
      )

      const nPlans = (nutritionRes.data as NutritionPlan[] | null) ?? []
      setNutritionPlans(
        nPlans.map((p) => ({ ...p, clientName: resolveClientName(p.client_id) }))
      )
    } catch {
      toast.error("Failed to load plans")
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function openModal() {
    setSelectedClientId(clientOptions[0]?.clientId ?? "")
    setPlanName("")
    setWeeks("12")
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
  }

  async function handleCreatePlan(e: FormEvent) {
    e.preventDefault()
    if (!selectedClientId) {
      toast.error("Select a client")
      return
    }
    if (!planName.trim()) {
      toast.error("Enter a plan name")
      return
    }
    const weeksNum = Number(weeks)
    if (!weeksNum || weeksNum < 1 || weeksNum > 52) {
      toast.error("Weeks must be between 1 and 52")
      return
    }

    setIsSubmitting(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error("Not authenticated")

      const { error } = await supabase.from("workout_plans").insert({
        client_id: selectedClientId,
        coach_id: userData.user.id,
        name: planName.trim(),
        weeks: weeksNum,
        is_active: true,
        is_template: false,
      })

      if (error) throw error

      toast.success("Plan created!")
      closeModal()
      setTab("workout")
      fetchData()
    } catch {
      toast.error("Failed to create plan")
    } finally {
      setIsSubmitting(false)
    }
  }

  const tabs: { key: TabKey; label: string; icon: typeof Dumbbell }[] = [
    { key: "workout", label: "Workout", icon: Dumbbell },
    { key: "nutrition", label: "Nutrition", icon: Apple },
  ]

  return (
    <div className="p-4 space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <h1
          className="text-xl font-bold text-white"
          style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
        >
          Plans
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 h-9 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
              tab === t.key
                ? "bg-[#C9A84C]/15 text-[#C9A84C]"
                : "text-[#555555] hover:text-white"
            )}
          >
            <t.icon className="size-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <PlanSkeleton key={i} />
          ))}
        </div>
      ) : tab === "workout" ? (
        workoutPlans.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#161616] border border-[#222222] rounded-2xl py-16 flex flex-col items-center gap-4"
          >
            <Dumbbell className="size-12 text-[#333333]" />
            <div className="text-center">
              <p className="text-white font-semibold">No workout plans yet</p>
              <p className="text-sm text-[#A0A0A0] mt-1">
                Create plans from the client detail page
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {workoutPlans.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push(`/coach/clients/${plan.client_id}`)}
                className="bg-[#161616] border border-[#222222] rounded-2xl p-4 cursor-pointer hover:bg-[#1A1A1A] transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{plan.name}</p>
                    <p className="text-[#C9A84C] text-xs mt-0.5 truncate">{plan.clientName}</p>
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0",
                      plan.is_active
                        ? "bg-green-500/15 text-green-400"
                        : "bg-[#222222] text-[#555555]"
                    )}
                  >
                    {plan.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[#555555] text-xs">{plan.weeks} weeks</span>
                  <span className="text-[#333333]">·</span>
                  <span className="text-[#555555] text-xs">
                    {format(new Date(plan.created_at), "d MMM yyyy")}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )
      ) : nutritionPlans.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#161616] border border-[#222222] rounded-2xl py-16 flex flex-col items-center gap-4"
        >
          <Apple className="size-12 text-[#333333]" />
          <div className="text-center">
            <p className="text-white font-semibold">No nutrition plans yet</p>
            <p className="text-sm text-[#A0A0A0] mt-1">
              Create plans from the client detail page
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {nutritionPlans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push(`/coach/clients/${plan.client_id}`)}
              className="bg-[#161616] border border-[#222222] rounded-2xl p-4 cursor-pointer hover:bg-[#1A1A1A] transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[#C9A84C] text-xs font-medium truncate">{plan.clientName}</p>
                <span
                  className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0",
                    plan.is_active
                      ? "bg-green-500/15 text-green-400"
                      : "bg-[#222222] text-[#555555]"
                  )}
                >
                  {plan.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              {/* Macro chips */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {plan.total_calories !== null && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#C9A84C]/10 text-[#C9A84C]">
                    {plan.total_calories} kcal
                  </span>
                )}
                {plan.protein_g !== null && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                    P {plan.protein_g}g
                  </span>
                )}
                {plan.carbs_g !== null && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400">
                    C {plan.carbs_g}g
                  </span>
                )}
                {plan.fats_g !== null && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400">
                    F {plan.fats_g}g
                  </span>
                )}
              </div>
              <p className="text-[#555555] text-xs mt-2">
                {format(new Date(plan.created_at), "d MMM yyyy")}
              </p>
            </motion.div>
          ))}
        </div>
      )}

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={openModal}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-[#C9A84C] text-black flex items-center justify-center shadow-lg z-40"
        aria-label="Create workout plan"
      >
        <Plus className="size-6" />
      </motion.button>

      {/* Create Plan Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50"
              onClick={closeModal}
            />

            {/* Bottom sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#111111] rounded-t-3xl border border-[#222222] z-50 max-h-[85vh] flex flex-col"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-12 h-1 rounded-full bg-[#333333]" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
                <h2
                  className="text-white font-bold text-xl"
                  style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
                >
                  Create Workout Plan
                </h2>
                <button
                  onClick={closeModal}
                  className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center text-[#A0A0A0] hover:text-white transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Form */}
              <form
                onSubmit={handleCreatePlan}
                className="flex-1 overflow-y-auto px-5 pb-8 space-y-4"
              >
                {/* Client Picker */}
                <div>
                  <label className="text-xs text-[#A0A0A0] mb-1.5 block">Client *</label>
                  <div className="relative">
                    <select
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className={cn(
                        "w-full appearance-none bg-[#1A1A1A] border border-[#333333] rounded-2xl h-14 px-4 text-white outline-none focus:border-[#C9A84C] transition-colors text-sm",
                        !selectedClientId && "text-[#555555]"
                      )}
                    >
                      {clientOptions.length === 0 ? (
                        <option value="" disabled>
                          No clients yet
                        </option>
                      ) : (
                        <>
                          <option value="" disabled>
                            Select client
                          </option>
                          {clientOptions.map((c) => (
                            <option
                              key={c.clientId}
                              value={c.clientId}
                              className="bg-[#1A1A1A] text-white"
                            >
                              {c.name}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                        <path
                          d="M1 1l5 5 5-5"
                          stroke="#555555"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Plan Name */}
                <div>
                  <label className="text-xs text-[#A0A0A0] mb-1.5 block">Plan Name *</label>
                  <input
                    type="text"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="12-Week Transformation"
                    className={inputClass}
                  />
                </div>

                {/* Weeks */}
                <div>
                  <label className="text-xs text-[#A0A0A0] mb-1.5 block">
                    Duration (weeks) *
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={weeks}
                    onChange={(e) => setWeeks(e.target.value)}
                    min="1"
                    max="52"
                    placeholder="12"
                    className={inputClass}
                  />
                </div>

                {/* Submit */}
                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  whileTap={{ scale: 0.97 }}
                  className="w-full h-14 rounded-2xl bg-[#C9A84C] text-black font-bold text-base flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    "Create Plan"
                  )}
                </motion.button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
