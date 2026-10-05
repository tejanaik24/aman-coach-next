"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { Dumbbell, Plus, X, ArrowLeft, Trash2, GripVertical } from "lucide-react"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"
import type { WorkoutPlan, WorkoutDay, Exercise } from "@/types"

interface DayWithExercises extends WorkoutDay {
  exercises: Exercise[]
}

const inputClass =
  "w-full bg-[#1A1A1A] focus:bg-[#222222] border border-[#333333] focus:border-[#FFB800] rounded-xl h-14 px-4 text-white outline-none transition-all placeholder:text-zinc-500 text-sm font-semibold shadow-inner"

const smallInputClass =
  "w-full bg-[#1A1A1A] focus:bg-[#222222] border border-[#333333] focus:border-[#FFB800] rounded-xl h-11 px-3 text-white outline-none transition-all placeholder:text-zinc-500 text-xs font-semibold shadow-inner"

function Skeleton() {
  return (
    <div className="px-5 pt-4 space-y-4 bg-bg-primary min-h-screen">
      <div className="h-6 w-40 bg-zinc-800 rounded-lg animate-pulse" />
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-16 bg-zinc-900 border border-zinc-800 rounded-full animate-pulse" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export default function WorkoutPlanBuilderPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [plan, setPlan] = useState<WorkoutPlan | null>(null)
  const [clientName, setClientName] = useState("")
  const [days, setDays] = useState<DayWithExercises[]>([])
  const [selectedDay, setSelectedDay] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Add day modal
  const [showDayModal, setShowDayModal] = useState(false)
  const [dayName, setDayName] = useState("")
  const [dayFocus, setDayFocus] = useState("")

  // Add/edit exercise modal
  const [showExerciseModal, setShowExerciseModal] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  const [exName, setExName] = useState("")
  const [exSets, setExSets] = useState("")
  const [exReps, setExReps] = useState("")
  const [exWeight, setExWeight] = useState("")
  const [exRest, setExRest] = useState("")
  const [exNotes, setExNotes] = useState("")

  const fetchData = useCallback(async () => {
    try {
      if (id === "demo" || id.startsWith("demo")) {
        setPlan({
          id: "demo",
          client_id: "demo-client",
          coach_id: "coach-demo",
          name: "12-Week Lean Hypertrophy Plan",
          weeks: 12,
          is_active: true,
          is_template: false,
          created_at: new Date().toISOString(),
        })
        setClientName("Rahul Sharma")
        setDays([
          {
            id: "day-1",
            plan_id: "demo",
            day_number: 1,
            day_name: "Push & Delts",
            focus: "Chest, Shoulders & Triceps",
            exercises: [
              {
                id: "ex-1",
                day_id: "day-1",
                name: "Incline Dumbbell Press",
                sets: 4,
                reps: "10-12",
                weight: "32.5 kg",
                rest_seconds: 90,
                video_url: null,
                notes: "Focus on 3s eccentric and hard contraction at top",
                order_index: 0,
              },
              {
                id: "ex-2",
                day_id: "day-1",
                name: "Cable Lateral Raises",
                sets: 4,
                reps: "15",
                weight: "10 kg",
                rest_seconds: 60,
                video_url: null,
                notes: "Keep shoulders depressed, cuff height at hip",
                order_index: 1,
              }
            ]
          },
          {
            id: "day-2",
            plan_id: "demo",
            day_number: 2,
            day_name: "Pull & Traps",
            focus: "Lats & Upper Back",
            exercises: []
          }
        ])
        return
      }

      const { data: planData, error: planErr } = await supabase
        .from("workout_plans")
        .select("*")
        .eq("id", id)
        .single()
      if (planErr || !planData) { toast.error("Plan not found"); router.replace("/plans/builder"); return }
      setPlan(planData as WorkoutPlan)

      const { data: clientData } = await supabase
        .from("clients")
        .select("user_id")
        .eq("id", planData.client_id)
        .single()
      if (clientData?.user_id) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", clientData.user_id)
          .single()
        if (profileData) setClientName(profileData.name)
      }

      const { data: daysData } = await supabase
        .from("workout_days")
        .select("*")
        .eq("plan_id", id)
        .order("day_number", { ascending: true })

      const dayRows = (daysData ?? []) as WorkoutDay[]
      if (dayRows.length === 0) { setDays([]); return }

      const { data: exercisesData } = await supabase
        .from("exercises")
        .select("*")
        .in("day_id", dayRows.map((d) => d.id))
        .order("order_index", { ascending: true })

      const exRows = (exercisesData ?? []) as Exercise[]
      setDays(dayRows.map((day) => ({
        ...day,
        exercises: exRows.filter((e) => e.day_id === day.id),
      })))
    } finally {
      setIsLoading(false)
    }
  }, [id, supabase, router])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleAddDay() {
    if (!dayName.trim()) { toast.error("Enter a day name"); return }
    const nextNumber = days.length + 1
    const { error } = await supabase.from("workout_days").insert({
      plan_id: id,
      day_number: nextNumber,
      day_name: dayName.trim(),
      focus: dayFocus.trim() || null,
    })
    if (error) { toast.error("Failed to add day"); return }
    toast.success("Day added")
    setShowDayModal(false)
    setDayName("")
    setDayFocus("")
    setSelectedDay(days.length)
    fetchData()
  }

  async function handleDeleteDay(dayId: string) {
    if (!confirm("Delete this day and all its exercises?")) return
    const { error } = await supabase.from("workout_days").delete().eq("id", dayId)
    if (error) { toast.error("Failed to delete day"); return }
    toast.success("Day deleted")
    setSelectedDay(0)
    fetchData()
  }

  function openAddExercise() {
    setEditingExercise(null)
    setExName("")
    setExSets("")
    setExReps("")
    setExWeight("")
    setExRest("")
    setExNotes("")
    setShowExerciseModal(true)
  }

  function openEditExercise(ex: Exercise) {
    setEditingExercise(ex)
    setExName(ex.name)
    setExSets(ex.sets?.toString() ?? "")
    setExReps(ex.reps ?? "")
    setExWeight(ex.weight ?? "")
    setExRest(ex.rest_seconds?.toString() ?? "")
    setExNotes(ex.notes ?? "")
    setShowExerciseModal(true)
  }

  async function handleSaveExercise() {
    if (!exName.trim()) { toast.error("Enter exercise name"); return }
    const currentDay = days[selectedDay]
    if (!currentDay) return

    const payload = {
      day_id: currentDay.id,
      name: exName.trim(),
      sets: exSets ? Number(exSets) : null,
      reps: exReps.trim() || null,
      weight: exWeight.trim() || null,
      rest_seconds: exRest ? Number(exRest) : null,
      notes: exNotes.trim() || null,
      order_index: editingExercise ? editingExercise.order_index : currentDay.exercises.length,
    }

    if (editingExercise) {
      const { error } = await supabase.from("exercises").update(payload).eq("id", editingExercise.id)
      if (error) { toast.error("Failed to update exercise"); return }
      toast.success("Exercise updated")
    } else {
      const { error } = await supabase.from("exercises").insert(payload)
      if (error) { toast.error("Failed to add exercise"); return }
      toast.success("Exercise added")
    }
    setShowExerciseModal(false)
    fetchData()
  }

  async function handleDeleteExercise(exId: string) {
    const { error } = await supabase.from("exercises").delete().eq("id", exId)
    if (error) { toast.error("Failed to delete exercise"); return }
    toast.success("Exercise removed")
    fetchData()
  }

  if (isLoading) return <Skeleton />

  const activeDay = days[selectedDay]

  return (
    <div className="px-5 pt-4 flex flex-col gap-5 bg-bg-primary min-h-screen pb-32 text-white">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/plans/builder")}
          className="w-9 h-9 rounded-full bg-zinc-850 hover:bg-zinc-800 border border-zinc-700/60 flex items-center justify-center shrink-0 text-white cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading font-bold text-xl text-white leading-tight truncate">{plan?.name}</h2>
          <p className="text-xs text-zinc-400 font-semibold mt-0.5">{clientName || "Unknown"} · {plan?.weeks} weeks</p>
        </div>
      </div>

      {/* Day tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 snap-x select-none">
        {days.map((day, i) => (
          <button
            key={day.id}
            onClick={() => setSelectedDay(i)}
            className={`relative px-5 py-3 rounded-full text-xs font-heading font-bold tracking-wide uppercase snap-start whitespace-nowrap transition-all duration-300 cursor-pointer ${
              selectedDay === i
                ? "bg-[#FFB800] text-black shadow-md"
                : "bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white"
            }`}
          >
            Day {day.day_number}
          </button>
        ))}
        <button
          onClick={() => setShowDayModal(true)}
          className="px-4 py-3 rounded-full text-xs font-heading font-bold tracking-wide uppercase whitespace-nowrap bg-[#FFB800]/15 text-[#FFB800] border border-[#FFB800]/30 hover:bg-[#FFB800]/25 shadow-sm cursor-pointer transition-colors"
        >
          <Plus className="w-3.5 h-3.5 inline mr-1" />
          Add Day
        </button>
      </div>

      {/* Day header + delete */}
      {activeDay ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-[#FFB800]" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              {activeDay.day_name}{activeDay.focus ? ` · ${activeDay.focus}` : ""}
            </h3>
          </div>
          <button onClick={() => handleDeleteDay(activeDay.id)} className="text-zinc-500 hover:text-red-400 p-1 cursor-pointer transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="text-center py-8">
          <Dumbbell className="size-10 text-zinc-700 mx-auto mb-2" />
          <p className="text-zinc-500 text-xs font-medium">No days yet. Add one above.</p>
        </div>
      )}

      {/* Exercises */}
      {activeDay && activeDay.exercises.length === 0 && (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center gap-3">
          <p className="text-zinc-400 text-xs">No exercises yet</p>
          <button onClick={openAddExercise} className="text-[#FFB800] hover:text-[#E5A600] font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors">+ Add First Exercise</button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {activeDay?.exercises.map((ex, i) => (
          <motion.div key={ex.id} whileTap={{ scale: 0.98 }} className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-4 flex gap-3 shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-[#FFB800]/15 border border-[#FFB800]/30 flex items-center justify-center shrink-0">
              <span className="font-heading font-bold text-sm text-[#FFB800]">{i + 1}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="font-heading font-bold text-sm text-white capitalize truncate">{ex.name}</h4>
                  <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                    {ex.sets ?? "—"} sets × {ex.reps ?? "—"} reps
                    {ex.weight ? ` · ${ex.weight}` : ""}
                    {ex.rest_seconds ? ` · ${ex.rest_seconds}s rest` : ""}
                  </p>
                  {ex.notes && <p className="text-[10px] text-zinc-500 italic mt-0.5 truncate">{ex.notes}</p>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => openEditExercise(ex)} className="px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold cursor-pointer transition-colors">
                    Edit
                  </button>
                  <button onClick={() => handleDeleteExercise(ex.id)} className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-red-950/60 flex items-center justify-center text-red-400 cursor-pointer transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {activeDay && activeDay.exercises.length > 0 && (
          <button onClick={openAddExercise} className="w-full h-12 rounded-full border border-dashed border-zinc-700 hover:border-[#FFB800] text-zinc-400 hover:text-[#FFB800] text-xs font-heading font-bold uppercase tracking-wider flex items-center justify-center gap-2 mt-2 cursor-pointer transition-colors">
            <Plus className="w-4 h-4" /> Add Exercise
          </button>
        )}
      </div>

      {/* Add Day Modal */}
      <AnimatePresence>
        {showDayModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm" onClick={() => setShowDayModal(false)} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#141414] border-t border-zinc-800 rounded-t-3xl z-50 max-h-[85vh] flex flex-col text-white shadow-2xl"
            >
              <div className="flex justify-center pt-3 pb-1"><div className="w-12 h-1 rounded-full bg-zinc-700" /></div>
              <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/80">
                <h3 className="font-heading font-bold text-lg text-white">Add Workout Day</h3>
                <button onClick={() => setShowDayModal(false)} className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 cursor-pointer"><X className="size-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 pb-32 space-y-4 pt-3">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1.5 block">Day Name *</label>
                  <input value={dayName} onChange={(e) => setDayName(e.target.value)} placeholder="e.g. Chest & Triceps" className={inputClass} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1.5 block">Focus / Muscle Group</label>
                  <input value={dayFocus} onChange={(e) => setDayFocus(e.target.value)} placeholder="e.g. Upper Body Hypertrophy" className={inputClass} />
                </div>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleAddDay}
                  className="w-full h-14 rounded-full bg-[#FFB800] hover:bg-[#E5A600] text-black font-heading font-bold text-xs uppercase tracking-widest shadow-lg mt-4 cursor-pointer">
                  Add Day
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add/Edit Exercise Modal */}
      <AnimatePresence>
        {showExerciseModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm" onClick={() => setShowExerciseModal(false)} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#141414] border-t border-zinc-800 rounded-t-3xl z-50 max-h-[85vh] flex flex-col text-white shadow-2xl"
            >
              <div className="flex justify-center pt-3 pb-1"><div className="w-12 h-1 rounded-full bg-zinc-700" /></div>
              <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/80">
                <h3 className="font-heading font-bold text-lg text-white">{editingExercise ? "Edit Exercise" : "Add Exercise"}</h3>
                <button onClick={() => setShowExerciseModal(false)} className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 cursor-pointer"><X className="size-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 pb-32 space-y-4 pt-3">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1.5 block">Exercise Name *</label>
                  <input value={exName} onChange={(e) => setExName(e.target.value)} placeholder="e.g. Incline DB Bench Press" className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide mb-1 block">Sets</label>
                    <input type="number" value={exSets} onChange={(e) => setExSets(e.target.value)} placeholder="3" className={smallInputClass} />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide mb-1 block">Reps</label>
                    <input value={exReps} onChange={(e) => setExReps(e.target.value)} placeholder="8-12" className={smallInputClass} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide mb-1 block">Weight</label>
                    <input value={exWeight} onChange={(e) => setExWeight(e.target.value)} placeholder="30 kg" className={smallInputClass} />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide mb-1 block">Rest (seconds)</label>
                    <input type="number" value={exRest} onChange={(e) => setExRest(e.target.value)} placeholder="90" className={smallInputClass} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1.5 block">Notes / Cues</label>
                  <input value={exNotes} onChange={(e) => setExNotes(e.target.value)} placeholder="Control negative, slight arch" className={inputClass} />
                </div>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleSaveExercise}
                  className="w-full h-14 rounded-full bg-[#FFB800] hover:bg-[#E5A600] text-black font-heading font-bold text-xs uppercase tracking-widest shadow-lg mt-4 cursor-pointer">
                  {editingExercise ? "Update Exercise" : "Add Exercise"}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
