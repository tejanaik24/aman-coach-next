"use client"

import { useState, useEffect, useCallback, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { Dumbbell, Apple, Plus, X } from "lucide-react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import toast from "react-hot-toast"
import { useStaggerReveal } from "@/hooks/useStaggerReveal"
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
  return <div className="bg-bg-card rounded-2xl h-20 skeleton-pulse" />
}

const inputClass =
  "w-full bg-bg-elevated border border-border-subtle focus:border-accent-gold rounded-xl h-14 px-4 text-text-primary outline-none transition-colors placeholder:text-text-muted/60 text-sm font-semibold"

export default function PlansPage() {
  const router = useRouter()
  const supabase = createClient()

  const [tab, setTab] = useState<TabKey>("workout")
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlanWithClient[]>([])
  const [nutritionPlans, setNutritionPlans] = useState<NutritionPlanWithClient[]>([])
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalType, setModalType] = useState<TabKey>("workout")

  // Modal form state — shared
  const [selectedClientId, setSelectedClientId] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Workout fields
  const [planName, setPlanName] = useState("")
  const [weeks, setWeeks] = useState("12")
  // Nutrition fields
  const [calories, setCalories] = useState("")
  const [protein, setProtein] = useState("")
  const [carbs, setCarbs] = useState("")
  const [fats, setFats] = useState("")

  const listRef = useStaggerReveal<HTMLDivElement>([isLoading, tab])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      const coachId = userData.user.id

      const [clientRes, workoutRes, nutritionRes] = await Promise.all([
        supabase.from("clients").select("id, user_id").eq("coach_id", coachId),
        supabase.from("workout_plans").select("*").eq("coach_id", coachId).order("created_at", { ascending: false }),
        supabase.from("nutrition_plans").select("*").eq("coach_id", coachId).order("created_at", { ascending: false }),
      ])

      const clients = (clientRes.data as Pick<Client, "id" | "user_id">[] | null) ?? []
      const userIds = clients.map((c) => c.user_id).filter((uid): uid is string => uid !== null)

      const nameByUserId = new Map<string, string>()
      if (userIds.length > 0) {
        const { data: profileRows } = await supabase.from("profiles").select("id, name").in("id", userIds)
        const profiles = (profileRows as Pick<Profile, "id" | "name">[] | null) ?? []
        for (const p of profiles) nameByUserId.set(p.id, p.name)
      }

      const userIdByClientId = new Map<string, string>()
      for (const c of clients) if (c.user_id) userIdByClientId.set(c.id, c.user_id)

      function resolveClientName(clientId: string): string {
        const uid = userIdByClientId.get(clientId)
        if (!uid) return "Unknown"
        return nameByUserId.get(uid) ?? "Unknown"
      }

      setClientOptions(clients.map((c) => ({ clientId: c.id, name: resolveClientName(c.id) })))

      const wPlans = (workoutRes.data as WorkoutPlan[] | null) ?? []
      setWorkoutPlans(wPlans.map((p) => ({ ...p, clientName: resolveClientName(p.client_id) })))

      const nPlans = (nutritionRes.data as NutritionPlan[] | null) ?? []
      setNutritionPlans(nPlans.map((p) => ({ ...p, clientName: resolveClientName(p.client_id) })))
    } catch {
      toast.error("Failed to load plans")
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function openModal(type: TabKey) {
    setModalType(type)
    setSelectedClientId(clientOptions[0]?.clientId ?? "")
    setPlanName("")
    setWeeks("12")
    setCalories("")
    setProtein("")
    setCarbs("")
    setFats("")
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
  }

  async function handleCreatePlan(e: FormEvent) {
    e.preventDefault()
    if (!selectedClientId) { toast.error("Select a client"); return }

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    setIsSubmitting(true)
    try {
      if (modalType === "workout") {
        if (!planName.trim()) { toast.error("Enter a plan name"); return }
        const weeksNum = Number(weeks)
        if (!weeksNum || weeksNum < 1 || weeksNum > 52) { toast.error("Weeks must be between 1 and 52"); return }

        const { data: inserted, error } = await supabase.from("workout_plans").insert({
          client_id: selectedClientId,
          coach_id: userData.user.id,
          name: planName.trim(),
          weeks: weeksNum,
          is_active: true,
          is_template: false,
        }).select("id").single()
        if (error) throw error
        toast.success("Plan created!")
        router.push(`/plans/workout/${inserted.id}`)
      } else {
        const { data: inserted, error } = await supabase.from("nutrition_plans").insert({
          client_id: selectedClientId,
          coach_id: userData.user.id,
          total_calories: calories ? Number(calories) : null,
          protein_g: protein ? Number(protein) : null,
          carbs_g: carbs ? Number(carbs) : null,
          fats_g: fats ? Number(fats) : null,
          is_active: true,
        }).select("id").single()
        if (error) throw error
        toast.success("Plan created!")
        router.push(`/plans/nutrition/${inserted.id}`)
      }
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
    <div className="relative min-h-full bg-bg-primary">
      <div className="ghost-bg" style={{ backgroundImage: "url(/images/backgrounds/ghost-plans.jpg)" }} />
      <div className="grain-overlay" />
      <div className="relative z-10 px-5 pt-2 space-y-5 pb-8">
      <h2 className="font-heading font-bold text-xl text-text-primary tracking-tight">
        Plans Builder
      </h2>

      {/* Create action bento */}
      <div className="grid grid-cols-2 gap-3.5">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => openModal("workout")}
          className="relative rounded-2xl bg-bg-card border border-border-subtle backdrop-blur-xl p-4 h-[110px] flex flex-col justify-between text-left cursor-pointer"
        >
          <Dumbbell className="w-6 h-6 text-accent-gold" />
          <span className="font-heading font-bold text-xs text-text-primary uppercase leading-tight">Create<br />Workout Plan</span>
          <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-accent-gold flex items-center justify-center">
            <Plus className="w-4 h-4 text-bg-primary" />
          </div>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => openModal("nutrition")}
          className="relative rounded-2xl bg-accent-gold/10 border border-accent-gold/40 shadow-[0_0_24px_rgba(255,184,0,0.15)] backdrop-blur-xl p-4 h-[110px] flex flex-col justify-between text-left cursor-pointer"
        >
          <Apple className="w-6 h-6 text-accent-gold" />
          <span className="font-heading font-bold text-xs text-text-primary uppercase leading-tight">Create<br />Diet Plan</span>
          <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-accent-gold flex items-center justify-center">
            <Plus className="w-4 h-4 text-bg-primary" />
          </div>
        </motion.button>
      </div>

      {/* Tabs */}
      <div className="flex bg-bg-elevated p-1 rounded-full border border-border-subtle select-none">
        {tabs.map((t) => {
          const isSelected = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 h-9 rounded-full text-xs font-heading font-bold uppercase tracking-wide flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                isSelected ? "bg-accent-gold text-bg-primary" : "text-text-muted"
              }`}
            >
              <t.icon className="size-3.5" />
              {t.label}
            </button>
          )
        })}
      </div>

      <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider -mb-2">Active Client Plans</p>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <PlanSkeleton key={i} />)}
        </div>
      ) : tab === "workout" ? (
        workoutPlans.length === 0 ? (
          <div className="bg-bg-card/80 border border-border-subtle backdrop-blur-xl rounded-2xl py-16 flex flex-col items-center gap-4">
            <Dumbbell className="size-12 text-text-muted/40" />
            <div className="text-center">
              <p className="text-text-primary font-heading font-bold">No workout plans yet</p>
              <p className="text-sm text-text-muted mt-1">Create one above</p>
            </div>
          </div>
        ) : (
          <div ref={listRef} className="space-y-3">
            {workoutPlans.map((plan) => (
              <motion.div
                key={plan.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push(`/plans/workout/${plan.id}`)}
                className="reveal-item bg-bg-card/80 border border-border-subtle backdrop-blur-xl rounded-2xl p-4 cursor-pointer flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-bg-elevated flex items-center justify-center flex-shrink-0 border border-accent-gold/30">
                  <span className="text-accent-gold text-xs font-heading font-bold">{plan.clientName.slice(0, 2).toUpperCase()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-text-primary font-heading font-bold text-xs truncate">{plan.name}</p>
                  <p className="text-text-muted text-[10px] mt-0.5">Assigned: {plan.clientName}</p>
                </div>
                <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0 ${
                  plan.is_active ? "bg-accent-gold/15 border border-accent-gold/30 text-accent-gold" : "bg-bg-elevated text-text-muted"
                }`}>
                  {plan.is_active ? "Active" : "Inactive"}
                </span>
              </motion.div>
            ))}
          </div>
        )
      ) : nutritionPlans.length === 0 ? (
        <div className="bg-bg-card/80 border border-border-subtle backdrop-blur-xl rounded-2xl py-16 flex flex-col items-center gap-4">
          <Apple className="size-12 text-text-muted/40" />
          <div className="text-center">
            <p className="text-text-primary font-heading font-bold">No diet plans yet</p>
            <p className="text-sm text-text-muted mt-1">Create one above</p>
          </div>
        </div>
      ) : (
        <div ref={listRef} className="space-y-3">
          {nutritionPlans.map((plan) => (
            <motion.div
              key={plan.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push(`/plans/nutrition/${plan.id}`)}
              className="reveal-item bg-bg-card/80 border border-border-subtle backdrop-blur-xl rounded-2xl p-4 cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-text-primary font-heading font-bold text-xs">{plan.clientName}</p>
                <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0 ${
                  plan.is_active ? "bg-accent-gold/15 border border-accent-gold/30 text-accent-gold" : "bg-bg-elevated text-text-muted"
                }`}>
                  {plan.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {plan.total_calories !== null && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-accent-gold/15 text-accent-gold">{plan.total_calories} kcal</span>
                )}
                {plan.protein_g !== null && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-bg-elevated text-text-primary">P {plan.protein_g}g</span>}
                {plan.carbs_g !== null && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-bg-elevated text-text-primary">C {plan.carbs_g}g</span>}
                {plan.fats_g !== null && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-bg-elevated text-text-primary">F {plan.fats_g}g</span>}
              </div>
              <p className="text-text-muted text-[10px] mt-2">{format(new Date(plan.created_at), "d MMM yyyy")}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Plan Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50"
              onClick={closeModal}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-bg-surface border-t border-border-subtle rounded-t-3xl z-50 max-h-[85vh] flex flex-col"
            >
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-12 h-1 rounded-full bg-text-muted/30" />
              </div>

              <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
                <h2 className="font-heading font-bold text-lg text-text-primary">
                  Create {modalType === "workout" ? "Workout" : "Diet"} Plan
                </h2>
                <button onClick={closeModal} className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center text-text-muted cursor-pointer">
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleCreatePlan} className="flex-1 overflow-y-auto px-5 pb-8 space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wide mb-1.5 block">Client *</label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className={inputClass}
                  >
                    {clientOptions.length === 0 ? (
                      <option value="" disabled>No clients yet</option>
                    ) : (
                      <>
                        <option value="" disabled>Select client</option>
                        {clientOptions.map((c) => (
                          <option key={c.clientId} value={c.clientId}>{c.name}</option>
                        ))}
                      </>
                    )}
                  </select>
                </div>

                {modalType === "workout" ? (
                  <>
                    <div>
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-wide mb-1.5 block">Plan Name *</label>
                      <input type="text" value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="12-Week Transformation" className={inputClass} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-wide mb-1.5 block">Duration (weeks) *</label>
                      <input type="number" inputMode="numeric" value={weeks} onChange={(e) => setWeeks(e.target.value)} min="1" max="52" placeholder="12" className={inputClass} />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-wide mb-1.5 block">Daily Calories</label>
                      <input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="2600" className={inputClass} />
                    </div>
                    <div className="grid grid-cols-3 gap-2.5">
                      <div>
                        <label className="text-[9px] font-bold text-text-muted uppercase tracking-wide mb-1 block">Protein (g)</label>
                        <input type="number" value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="180" className={`${inputClass} h-12 text-xs`} />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-text-muted uppercase tracking-wide mb-1 block">Carbs (g)</label>
                        <input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} placeholder="300" className={`${inputClass} h-12 text-xs`} />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-text-muted uppercase tracking-wide mb-1 block">Fats (g)</label>
                        <input type="number" value={fats} onChange={(e) => setFats(e.target.value)} placeholder="75" className={`${inputClass} h-12 text-xs`} />
                      </div>
                    </div>
                  </>
                )}

                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  whileTap={{ scale: 0.97 }}
                  className="w-full h-14 rounded-full bg-accent-gold text-bg-primary font-heading font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-60 mt-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-bg-primary/30 border-t-bg-primary rounded-full animate-spin" />
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
    </div>
  )
}
