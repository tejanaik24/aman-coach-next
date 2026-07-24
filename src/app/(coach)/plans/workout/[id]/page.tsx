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
  "w-full bg-cream focus:bg-white border-2 border-transparent focus:border-lime-electric rounded-input h-14 px-4 text-charcoal-deep outline-none transition-all placeholder:text-charcoal-muted/50 text-sm font-semibold shadow-inner"

const smallInputClass =
  "w-full bg-cream focus:bg-white border-2 border-transparent focus:border-lime-electric rounded-input h-11 px-3 text-charcoal-deep outline-none transition-all placeholder:text-charcoal-muted/50 text-xs font-semibold shadow-inner"

function Skeleton() {
  return (
    <div className="px-5 pt-2 space-y-4 bg-cream min-h-full">
      <div className="h-6 w-40 bg-white rounded-card-mobile animate-pulse" />
      <div className="flex gap-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-9 w-16 bg-white rounded-full animate-pulse" />)}</div>
      <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-white rounded-card-mobile shadow-bento animate-pulse" />)}</div>
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
      const { data: planData, error: planErr } = await supabase
        .from("workout_plans")
        .select("*")
        .eq("id", id)
        .single()
      if (planErr || !planData) { toast.error("Plan not found"); router.replace("/plans"); return }
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
    <div className="px-5 pt-2 flex flex-col gap-5 bg-cream min-h-full pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/plans")} className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0">
          <ArrowLeft className="w-4 h-4 text-charcoal-deep" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="font-montserrat font-black text-lg text-charcoal-deep leading-tight truncate">{plan?.name}</h2>
          <p className="text-[10px] text-charcoal-muted font-semibold mt-0.5">{clientName || "Unknown"} · {plan?.weeks} weeks</p>
        </div>
      </div>

      {/* Day tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 snap-x select-none">
        {days.map((day, i) => (
          <button
            key={day.id}
            onClick={() => setSelectedDay(i)}
            className={`relative px-5 py-3 rounded-full text-xs font-montserrat font-black tracking-wide uppercase snap-start whitespace-nowrap transition-all duration-300 ${
              selectedDay === i ? "bg-charcoal-deep text-lime-electric shadow-md" : "bg-white text-charcoal-deep border border-charcoal-deep/5 shadow-sm"
            }`}
          >
            Day {day.day_number}
          </button>
        ))}
        <button
          onClick={() => setShowDayModal(true)}
          className="px-4 py-3 rounded-full text-xs font-montserrat font-bold tracking-wide uppercase whitespace-nowrap bg-lime-tint text-charcoal-deep border border-lime-electric/30 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5 inline mr-1" />
          Add Day
        </button>
      </div>

      {/* Day header + delete */}
      {activeDay ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-lime-electric fill-charcoal-deep" />
            <h3 className="text-xs font-bold text-charcoal-deep uppercase tracking-wider">
              {activeDay.day_name}{activeDay.focus ? ` · ${activeDay.focus}` : ""}
            </h3>
          </div>
          <button onClick={() => handleDeleteDay(activeDay.id)} className="text-red-400 hover:text-red-600 p-1">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="text-center py-8">
          <Dumbbell className="size-10 text-charcoal-muted/30 mx-auto mb-2" />
          <p className="text-charcoal-muted text-xs font-medium">No days yet. Add one above.</p>
        </div>
      )}

      {/* Exercises */}
      {activeDay && activeDay.exercises.length === 0 && (
        <div className="bg-white rounded-card-mobile shadow-bento p-8 flex flex-col items-center gap-3">
          <p className="text-charcoal-muted text-xs">No exercises yet</p>
          <button onClick={openAddExercise} className="text-lime-electric font-bold text-xs uppercase tracking-wider">+ Add First Exercise</button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {activeDay?.exercises.map((ex) => (
          <motion.div
            key={ex.id}
            whileTap={{ scale: 0.98 }}
            className="bg-white rounded-card-mobile p-4 shadow-bento flex items-center gap-3"
          >
            <GripVertical className="w-4 h-4 text-charcoal-muted/30 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-charcoal-deep font-montserrat truncate">{ex.name}</p>
              <p className="text-[10px] text-charcoal-muted font-medium mt-0.5">
                {ex.sets !== null && ex.reps !== null ? `${ex.sets} × ${ex.reps}` : ""}
                {ex.weight ? ` · ${ex.weight}` : ""}
                {ex.rest_seconds ? ` · ${ex.rest_seconds}s rest` : ""}
              </p>
              {ex.notes && <p className="text-[9px] text-charcoal-muted/70 italic mt-0.5 truncate">{ex.notes}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => openEditExercise(ex)} className="w-8 h-8 rounded-full bg-cream flex items-center justify-center text-charcoal-muted hover:text-charcoal-deep">
                <span className="text-[10px] font-bold">Edit</span>
              </button>
              <button onClick={() => handleDeleteExercise(ex.id)} className="w-8 h-8 rounded-full bg-cream flex items-center justify-center text-red-400 hover:text-red-600">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* FAB — add exercise */}
      {activeDay && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={openAddExercise}
          className="fixed bottom-24 right-5 w-14 h-14 rounded-full bg-lime-electric shadow-bento flex items-center justify-center z-40"
        >
          <Plus className="w-6 h-6 text-charcoal-deep" />
        </motion.button>
      )}

      {/* Add Day Modal */}
      <AnimatePresence>
        {showDayModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-charcoal-deep/60 z-50" onClick={() => setShowDayModal(false)} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-cream rounded-t-3xl z-50 p-5 pb-8 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-montserrat font-black text-lg text-charcoal-deep">Add Workout Day</h3>
                <button onClick={() => setShowDayModal(false)} className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-charcoal-muted shadow-sm"><X className="size-4" /></button>
              </div>
              <div>
                <label className="text-[10px] font-bold text-charcoal-deep uppercase tracking-wide mb-1.5 block">Day Name *</label>
                <input value={dayName} onChange={(e) => setDayName(e.target.value)} placeholder="e.g. Push Day" className={inputClass} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-charcoal-deep uppercase tracking-wide mb-1.5 block">Focus (optional)</label>
                <input value={dayFocus} onChange={(e) => setDayFocus(e.target.value)} placeholder="e.g. Chest, Shoulders, Triceps" className={inputClass} />
              </div>
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleAddDay}
                className="w-full h-14 rounded-full bg-lime-electric text-charcoal-deep font-montserrat font-black text-xs uppercase tracking-widest shadow-bento">
                Add Day
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add/Edit Exercise Modal */}
      <AnimatePresence>
        {showExerciseModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-charcoal-deep/60 z-50" onClick={() => setShowExerciseModal(false)} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-cream rounded-t-3xl z-50 max-h-[85vh] flex flex-col"
            >
              <div className="flex justify-center pt-3 pb-1"><div className="w-12 h-1 rounded-full bg-charcoal-deep/20" /></div>
              <div className="flex items-center justify-between px-5 py-3">
                <h3 className="font-montserrat font-black text-lg text-charcoal-deep">{editingExercise ? "Edit Exercise" : "Add Exercise"}</h3>
                <button onClick={() => setShowExerciseModal(false)} className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-charcoal-muted shadow-sm"><X className="size-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-charcoal-deep uppercase tracking-wide mb-1.5 block">Exercise Name *</label>
                  <input value={exName} onChange={(e) => setExName(e.target.value)} placeholder="e.g. Barbell Bench Press" className={inputClass} />
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[9px] font-bold text-charcoal-deep uppercase tracking-wide mb-1 block">Sets</label>
                    <input type="number" value={exSets} onChange={(e) => setExSets(e.target.value)} placeholder="3" className={smallInputClass} />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-charcoal-deep uppercase tracking-wide mb-1 block">Reps</label>
                    <input value={exReps} onChange={(e) => setExReps(e.target.value)} placeholder="8-12" className={smallInputClass} />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-charcoal-deep uppercase tracking-wide mb-1 block">Rest (s)</label>
                    <input type="number" value={exRest} onChange={(e) => setExRest(e.target.value)} placeholder="90" className={smallInputClass} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-charcoal-deep uppercase tracking-wide mb-1.5 block">Weight</label>
                  <input value={exWeight} onChange={(e) => setExWeight(e.target.value)} placeholder="e.g. 60kg" className={inputClass} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-charcoal-deep uppercase tracking-wide mb-1.5 block">Notes</label>
                  <input value={exNotes} onChange={(e) => setExNotes(e.target.value)} placeholder="e.g. slow eccentric, pause at bottom" className={inputClass} />
                </div>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleSaveExercise}
                  className="w-full h-14 rounded-full bg-lime-electric text-charcoal-deep font-montserrat font-black text-xs uppercase tracking-widest shadow-bento mt-2">
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
