"use client"

import { use, useState, useEffect } from "react"
import { CoachLayout } from "@/components/layout/CoachLayout"
import { EmptyState } from "@/components/ui/EmptyState"
import { PageSkeleton } from "@/components/ui/skeleton"
import { useClientData } from "@/hooks/useClient"
import { useAuth } from "@/hooks/useAuth"
import { saveWorkoutPlan, saveDietPlan, getWorkoutPlan, getDietPlan } from "@/lib/store"
import { Checkin } from "@/types"
import { motion } from "motion/react"
import { MessageSquare, Upload, ArrowLeft, Send, Camera, CreditCard, Dumbbell, UtensilsCrossed, Plus, Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import toast from "react-hot-toast"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"

interface TooltipPayload {
  value: number
  payload: { fullDate: string }
}

function WeightTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 shadow-lg">
        <p className="text-xs text-zinc-500">{payload[0].payload.fullDate}</p>
        <p className="font-heading text-lg text-white">{payload[0].value} kg</p>
      </div>
    )
  }
  return null
}

type Tab = "overview" | "checkins" | "payments" | "notes" | "plans"

interface WorkoutDayForm {
  day: string
  exercises: { name: string; sets: number; reps: number; weight?: number }[]
}

interface MealForm {
  name: string
  time: string
  foods: { name: string; portion: string; calories?: number; protein?: number; carbs?: number; fats?: number }[]
}

function emptyDay(): WorkoutDayForm {
  return { day: "", exercises: [{ name: "", sets: 3, reps: 10 }] }
}

function emptyMeal(): MealForm {
  return { name: "", time: "", foods: [{ name: "", portion: "", calories: undefined }] }
}

export default function CoachClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { user } = useAuth()
  const { client, checkins, payments, loading } = useClientData(id)
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [notes, setNotes] = useState("")
  const [notesSaved, setNotesSaved] = useState(false)

  const [existingWorkout, setExistingWorkout] = useState<boolean>(false)
  const [existingDiet, setExistingDiet] = useState<boolean>(false)
  const [workoutName, setWorkoutName] = useState("")
  const [workoutDesc, setWorkoutDesc] = useState("")
  const [workoutDays, setWorkoutDays] = useState<WorkoutDayForm[]>([])
  const [dietName, setDietName] = useState("")
  const [dietDesc, setDietDesc] = useState("")
  const [dietCalories, setDietCalories] = useState("")
  const [dietMeals, setDietMeals] = useState<MealForm[]>([])
  const [savingPlan, setSavingPlan] = useState(false)
  const [planView, setPlanView] = useState<"workout" | "diet">("workout")

  useEffect(() => {
    if (!id) return
    getWorkoutPlan(id).then((p) => {
      if (p) {
        setExistingWorkout(true)
        setWorkoutName(p.name)
        setWorkoutDesc(p.description || "")
        setWorkoutDays(p.days.map((d) => ({
          day: d.day,
          exercises: d.exercises.map((e) => ({
            name: e.name,
            sets: e.sets,
            reps: e.reps,
            weight: e.weight,
          })),
        })))
      }
    }).catch(() => {})
    getDietPlan(id).then((p) => {
      if (p) {
        setExistingDiet(true)
        setDietName(p.name)
        setDietDesc(p.description || "")
        setDietCalories(p.calories?.toString() || "")
        setDietMeals(p.meals.map((m) => ({
          name: m.name,
          time: m.time || "",
          foods: m.foods.map((f) => ({
            name: f.name,
            portion: f.portion,
            calories: f.calories,
            protein: f.protein,
            carbs: f.carbs,
            fats: f.fats,
          })),
        })))
      }
    }).catch(() => {})
  }, [id])

  if (loading) return <CoachLayout><PageSkeleton /></CoachLayout>
  if (!client) {
    return (
      <CoachLayout>
        <EmptyState icon="🔍" title="Client not found" />
      </CoachLayout>
    )
  }

  const initials = client.displayName?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?"

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "checkins", label: "Check-ins" },
    { key: "payments", label: "Payments" },
    { key: "plans", label: "Plans" },
    { key: "notes", label: "Notes" },
  ]

  const handleSaveNotes = () => {
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
  }

  const saveWorkout = async () => {
    if (!workoutName.trim() || !user?.id) return
    setSavingPlan(true)
    try {
      await saveWorkoutPlan({
        clientId: id,
        coachId: user.id,
        name: workoutName.trim(),
        description: workoutDesc.trim() || undefined,
        days: workoutDays.filter((d) => d.day.trim()).map((d) => ({
          day: d.day,
          exercises: d.exercises.filter((e) => e.name.trim()).map((e) => ({
            name: e.name,
            sets: e.sets,
            reps: e.reps,
            weight: e.weight || undefined,
          })),
        })),
      })
      toast.success(existingWorkout ? "Workout updated" : "Workout created")
      setExistingWorkout(true)
    } catch {
      toast.error("Failed to save workout plan")
    } finally {
      setSavingPlan(false)
    }
  }

  const saveDiet = async () => {
    if (!dietName.trim() || !user?.id) return
    setSavingPlan(true)
    try {
      await saveDietPlan({
        clientId: id,
        coachId: user.id,
        name: dietName.trim(),
        description: dietDesc.trim() || undefined,
        calories: dietCalories ? parseInt(dietCalories) : undefined,
        meals: dietMeals.filter((m) => m.name.trim()).map((m) => ({
          name: m.name,
          time: m.time || undefined,
          foods: m.foods.filter((f) => f.name.trim()).map((f) => ({
            name: f.name,
            portion: f.portion,
            calories: f.calories || undefined,
            protein: f.protein || undefined,
            carbs: f.carbs || undefined,
            fats: f.fats || undefined,
          })),
        })),
      })
      toast.success(existingDiet ? "Diet updated" : "Diet created")
      setExistingDiet(true)
    } catch {
      toast.error("Failed to save diet plan")
    } finally {
      setSavingPlan(false)
    }
  }

  return (
    <CoachLayout>
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors mb-4"
      >
        <ArrowLeft className="size-4" />
        Back
      </button>

      <div className="flex items-center gap-4 mb-6">
        <div className="size-14 rounded-full bg-[#FFB800]/20 flex items-center justify-center">
          <span className="font-heading text-xl text-[#FFD200]">{initials}</span>
        </div>
        <div>
          <h1 className="font-heading text-2xl text-white">{client.displayName}</h1>
          <p className="text-sm text-zinc-500">{client.phone || client.email}</p>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${
            client.status === "active" ? "bg-green-500/20 text-green-400" :
            client.status === "paused" ? "bg-yellow-500/20 text-yellow-400" :
            "bg-red-500/20 text-red-400"
          }`}>
            {client.status}
          </span>
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? "bg-[#FFB800] text-white"
                : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Goal</p>
              <p className="font-heading text-lg text-white mt-1 capitalize">{client.goal?.replace("-", " ") || "Not set"}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Plan</p>
              <p className="font-heading text-lg text-white mt-1 capitalize">{client.plan || "Not set"}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Weight</p>
              <p className="font-heading text-lg text-white mt-1">{client.weight ? `${client.weight} kg` : "—"}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Last Check-in</p>
              <p className="font-heading text-lg text-white mt-1">
                {checkins[0] ? format(new Date(checkins[0].date), "MMM d") : "None"}
              </p>
            </div>
          </div>

          {checkins.filter((c) => c.weight).length >= 2 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Weight Progress</p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={checkins
                      .filter((c) => c.weight)
                      .slice()
                      .reverse()
                      .slice(-15)
                      .map((c) => ({
                        date: format(new Date(c.date), "MMM d"),
                        weight: c.weight,
                        fullDate: format(new Date(c.date), "MMM d, yyyy"),
                      }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} domain={["dataMin - 2", "dataMax + 2"]} />
                    <Tooltip content={<WeightTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#FFB800"
                      strokeWidth={2.5}
                      dot={{ fill: "#FFB800", r: 4 }}
                      activeDot={{ fill: "#FFB800", r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button className="flex-1 rounded-full bg-green-600 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5">
              <Send className="size-3.5" />
              WhatsApp
            </button>
            <button className="flex-1 rounded-full bg-[#FFB800] py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#B28000] transition-colors flex items-center justify-center gap-1.5">
              <Upload className="size-3.5" />
              Upload Plan
            </button>
            <button className="flex-1 rounded-full bg-zinc-800 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:bg-zinc-700 transition-colors flex items-center justify-center gap-1.5">
              <MessageSquare className="size-3.5" />
              Message
            </button>
          </div>
        </motion.div>
      )}

      {activeTab === "checkins" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {checkins.length > 0 ? (
            <div className="space-y-2">
              {checkins.map((c) => (
                <div key={c.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white font-medium">
                      {format(new Date(c.date), "MMM d, yyyy")}
                    </span>
                    <span className="text-lg">
                      {c.energy && c.energy <= 2 ? "😫" : c.energy && c.energy <= 4 ? "😐" : c.energy && c.energy <= 6 ? "🙂" : "💪"}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-zinc-400">
                    {c.weight && <span>Weight: {c.weight}kg</span>}
                    {c.energy && <span>Energy: {c.energy}/5</span>}
                    {c.sleep && <span>Sleep: {c.sleep}/5</span>}
                  </div>
                  {c.notes && <p className="text-xs text-zinc-500 mt-2">{c.notes}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
              <Camera className="size-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm text-zinc-500">No check-ins yet</p>
            </div>
          )}
        </motion.div>
      )}

      {activeTab === "payments" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {payments.length > 0 ? (
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                  <div>
                    <p className="text-sm text-white font-medium">{p.plan || "Payment"}</p>
                    <p className="text-xs text-zinc-500">{format(new Date(p.date), "MMM d, yyyy")}</p>
                    <p className="font-heading text-lg text-white mt-0.5">₹{p.amount.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${
                      p.status === "completed" ? "bg-green-500/20 text-green-400" :
                      p.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-red-500/20 text-red-400"
                    }`}>
                      {p.status}
                    </span>
                    {p.status !== "completed" && (
                      <button className="rounded-full bg-[#FFB800] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-[#B28000] transition-colors">
                        Mark Paid
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
              <CreditCard className="size-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm text-zinc-500">No payments yet</p>
            </div>
          )}
        </motion.div>
      )}

      {activeTab === "plans" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setPlanView("workout")}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
                planView === "workout"
                  ? "bg-[#FFB800] text-white"
                  : "bg-zinc-900 text-zinc-400 border border-zinc-800"
              }`}
            >
              <Dumbbell className="size-3.5 inline mr-1" /> Workout
            </button>
            <button
              onClick={() => setPlanView("diet")}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
                planView === "diet"
                  ? "bg-[#FFB800] text-white"
                  : "bg-zinc-900 text-zinc-400 border border-zinc-800"
              }`}
            >
              <UtensilsCrossed className="size-3.5 inline mr-1" /> Diet
            </button>
          </div>

          {planView === "workout" && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">
                {existingWorkout ? "Edit Workout Plan" : "Create Workout Plan"}
              </p>

              <div className="space-y-3 mb-4">
                <input
                  value={workoutName}
                  onChange={(e) => setWorkoutName(e.target.value)}
                  className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800]/30"
                  placeholder="Plan name (e.g. Push/Pull/Legs)"
                />
                <textarea
                  value={workoutDesc}
                  onChange={(e) => setWorkoutDesc(e.target.value)}
                  className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800]/30 resize-none min-h-[60px]"
                  placeholder="Description (optional)"
                />
              </div>

              <div className="space-y-3 mb-4">
                {workoutDays.map((day, di) => (
                  <div key={di} className="rounded-xl bg-zinc-800/50 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        value={day.day}
                        onChange={(e) => {
                          const days = [...workoutDays]
                          days[di].day = e.target.value
                          setWorkoutDays(days)
                        }}
                        className="flex-1 rounded-lg bg-zinc-700 border border-zinc-600 px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#FFB800]"
                        placeholder="Day (e.g. Monday)"
                      />
                      <button
                        onClick={() => setWorkoutDays(workoutDays.filter((_, i) => i !== di))}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    {day.exercises.map((ex, ei) => (
                      <div key={ei} className="flex items-center gap-1.5 mb-1.5">
                        <input
                          value={ex.name}
                          onChange={(e) => {
                            const days = [...workoutDays]
                            days[di].exercises[ei].name = e.target.value
                            setWorkoutDays(days)
                          }}
                          className="flex-1 rounded-lg bg-zinc-700 border border-zinc-600 px-2 py-1 text-xs text-white placeholder-zinc-500 outline-none"
                          placeholder="Exercise name"
                        />
                        <input
                          type="number"
                          value={ex.sets}
                          onChange={(e) => {
                            const days = [...workoutDays]
                            days[di].exercises[ei].sets = parseInt(e.target.value) || 0
                            setWorkoutDays(days)
                          }}
                          className="w-12 rounded-lg bg-zinc-700 border border-zinc-600 px-2 py-1 text-xs text-white text-center outline-none"
                          placeholder="Sets"
                        />
                        <input
                          type="number"
                          value={ex.reps}
                          onChange={(e) => {
                            const days = [...workoutDays]
                            days[di].exercises[ei].reps = parseInt(e.target.value) || 0
                            setWorkoutDays(days)
                          }}
                          className="w-12 rounded-lg bg-zinc-700 border border-zinc-600 px-2 py-1 text-xs text-white text-center outline-none"
                          placeholder="Reps"
                        />
                        <button
                          onClick={() => {
                            const days = [...workoutDays]
                            days[di].exercises = days[di].exercises.filter((_, i) => i !== ei)
                            setWorkoutDays(days)
                          }}
                          className="text-red-400 hover:text-red-300 transition-colors shrink-0"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const days = [...workoutDays]
                        days[di].exercises.push({ name: "", sets: 3, reps: 10 })
                        setWorkoutDays(days)
                      }}
                      className="flex items-center gap-1 text-[10px] text-[#FFD200] hover:text-[#FFB800] transition-colors mt-1"
                    >
                      <Plus className="size-3" /> Add exercise
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setWorkoutDays([...workoutDays, emptyDay()])}
                  className="flex items-center gap-1 text-xs text-[#FFD200] hover:text-[#FFB800] transition-colors"
                >
                  <Plus className="size-3.5" /> Add Day
                </button>
              </div>

              <button
                onClick={saveWorkout}
                disabled={!workoutName.trim() || savingPlan}
                className="mt-4 w-full rounded-full bg-[#FFB800] py-3 text-sm font-bold uppercase tracking-wider text-white hover:bg-[#B28000] disabled:opacity-50 transition-colors"
              >
                {savingPlan ? "Saving..." : existingWorkout ? "Update Workout Plan" : "Create Workout Plan"}
              </button>
            </div>
          )}

          {planView === "diet" && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">
                {existingDiet ? "Edit Diet Plan" : "Create Diet Plan"}
              </p>

              <div className="space-y-3 mb-4">
                <input
                  value={dietName}
                  onChange={(e) => setDietName(e.target.value)}
                  className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800]/30"
                  placeholder="Plan name (e.g. Fat Loss Diet)"
                />
                <textarea
                  value={dietDesc}
                  onChange={(e) => setDietDesc(e.target.value)}
                  className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800]/30 resize-none min-h-[60px]"
                  placeholder="Description (optional)"
                />
                <input
                  type="number"
                  value={dietCalories}
                  onChange={(e) => setDietCalories(e.target.value)}
                  className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800]/30"
                  placeholder="Daily calorie target"
                />
              </div>

              <div className="space-y-3 mb-4">
                {dietMeals.map((meal, mi) => (
                  <div key={mi} className="rounded-xl bg-zinc-800/50 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        value={meal.name}
                        onChange={(e) => {
                          const meals = [...dietMeals]
                          meals[mi].name = e.target.value
                          setDietMeals(meals)
                        }}
                        className="flex-1 rounded-lg bg-zinc-700 border border-zinc-600 px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#FFB800]"
                        placeholder="Meal (e.g. Breakfast)"
                      />
                      <input
                        value={meal.time}
                        onChange={(e) => {
                          const meals = [...dietMeals]
                          meals[mi].time = e.target.value
                          setDietMeals(meals)
                        }}
                        className="w-20 rounded-lg bg-zinc-700 border border-zinc-600 px-2 py-1.5 text-xs text-white placeholder-zinc-500 text-center outline-none"
                        placeholder="Time"
                      />
                      <button
                        onClick={() => setDietMeals(dietMeals.filter((_, i) => i !== mi))}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    {meal.foods.map((food, fi) => (
                      <div key={fi} className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <input
                          value={food.name}
                          onChange={(e) => {
                            const meals = [...dietMeals]
                            meals[mi].foods[fi].name = e.target.value
                            setDietMeals(meals)
                          }}
                          className="flex-[2] min-w-[100px] rounded-lg bg-zinc-700 border border-zinc-600 px-2 py-1 text-xs text-white placeholder-zinc-500 outline-none"
                          placeholder="Food name"
                        />
                        <input
                          value={food.portion}
                          onChange={(e) => {
                            const meals = [...dietMeals]
                            meals[mi].foods[fi].portion = e.target.value
                            setDietMeals(meals)
                          }}
                          className="w-16 rounded-lg bg-zinc-700 border border-zinc-600 px-2 py-1 text-xs text-white placeholder-zinc-500 text-center outline-none"
                          placeholder="Portion"
                        />
                        <input
                          type="number"
                          value={food.calories || ""}
                          onChange={(e) => {
                            const meals = [...dietMeals]
                            meals[mi].foods[fi].calories = e.target.value ? parseInt(e.target.value) : undefined
                            setDietMeals(meals)
                          }}
                          className="w-14 rounded-lg bg-zinc-700 border border-zinc-600 px-2 py-1 text-xs text-white placeholder-zinc-500 text-center outline-none"
                          placeholder="Cal"
                        />
                        <button
                          onClick={() => {
                            const meals = [...dietMeals]
                            meals[mi].foods = meals[mi].foods.filter((_, i) => i !== fi)
                            setDietMeals(meals)
                          }}
                          className="text-red-400 hover:text-red-300 transition-colors shrink-0"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const meals = [...dietMeals]
                        meals[mi].foods.push({ name: "", portion: "", calories: undefined })
                        setDietMeals(meals)
                      }}
                      className="flex items-center gap-1 text-[10px] text-[#FFD200] hover:text-[#FFB800] transition-colors mt-1"
                    >
                      <Plus className="size-3" /> Add food
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setDietMeals([...dietMeals, emptyMeal()])}
                  className="flex items-center gap-1 text-xs text-[#FFD200] hover:text-[#FFB800] transition-colors"
                >
                  <Plus className="size-3.5" /> Add Meal
                </button>
              </div>

              <button
                onClick={saveDiet}
                disabled={!dietName.trim() || savingPlan}
                className="mt-4 w-full rounded-full bg-[#FFB800] py-3 text-sm font-bold uppercase tracking-wider text-white hover:bg-[#B28000] disabled:opacity-50 transition-colors"
              >
                {savingPlan ? "Saving..." : existingDiet ? "Update Diet Plan" : "Create Diet Plan"}
              </button>
            </div>
          )}
        </motion.div>
      )}

      {activeTab === "notes" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Private Notes</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800]/30 min-h-[150px] resize-none"
              placeholder="Add private notes about this client..."
            />
            <button
              onClick={handleSaveNotes}
              className="mt-3 rounded-full bg-[#FFB800] px-5 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#B28000] transition-colors"
            >
              {notesSaved ? "Saved ✓" : "Save Notes"}
            </button>
          </div>
        </motion.div>
      )}
    </CoachLayout>
  )
}
