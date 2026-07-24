"use client"

import { useState, useEffect } from "react"
import { motion } from "motion/react"
import { Dumbbell, Moon, Clock, Download } from "lucide-react"
import { differenceInWeeks, format } from "date-fns"
import toast from "react-hot-toast"
import jsPDF from "jspdf"
import { createClient } from "@/lib/supabase/client"
import { useStaggerReveal } from "@/hooks/useStaggerReveal"
import type { Client, WorkoutPlan, WorkoutDay, Exercise } from "@/types"

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`bg-bg-card rounded-2xl skeleton-pulse ${className ?? ""}`} />
}

function WorkoutSkeleton() {
  return (
    <div className="px-5 pt-2 space-y-5 bg-bg-primary min-h-full">
      <SkeletonBlock className="h-7 w-48" />
      <SkeletonBlock className="h-4 w-32" />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-9 w-16 flex-shrink-0" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-20" />
        ))}
      </div>
    </div>
  )
}

interface DayWithExercises extends WorkoutDay {
  exercises: Exercise[]
}

export default function WorkoutPage() {
  const supabase = createClient()

  const [clientRow, setClientRow] = useState<Client | null>(null)
  const [plan, setPlan] = useState<WorkoutPlan | null>(null)
  const [days, setDays] = useState<DayWithExercises[]>([])
  const [selectedDay, setSelectedDay] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [hasNoPlan, setHasNoPlan] = useState(false)

  const listRef = useStaggerReveal<HTMLDivElement>([selectedDay, isLoading])

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: clientData, error: clientError } = await supabase
          .from("clients")
          .select("*")
          .eq("user_id", user.id)
          .single()
        if (clientError || !clientData) { setHasNoPlan(true); return }
        const client = clientData as Client
        setClientRow(client)

        const { data: planData, error: planError } = await supabase
          .from("workout_plans")
          .select("*")
          .eq("client_id", client.id)
          .eq("is_active", true)
          .single()
        if (planError || !planData) { setHasNoPlan(true); return }
        const activePlan = planData as WorkoutPlan
        setPlan(activePlan)

        const { data: daysData } = await supabase
          .from("workout_days")
          .select("*")
          .eq("plan_id", activePlan.id)
          .order("day_number", { ascending: true })

        if (!daysData || daysData.length === 0) {
          setDays([])
          return
        }

        const dayRows = daysData as WorkoutDay[]
        const dayIds = dayRows.map((d) => d.id)

        const { data: exercisesData } = await supabase
          .from("exercises")
          .select("*")
          .in("day_id", dayIds)
          .order("order_index", { ascending: true })

        const exerciseRows = (exercisesData ?? []) as Exercise[]

        const daysWithExercises: DayWithExercises[] = dayRows.map((day) => ({
          ...day,
          exercises: exerciseRows.filter((e) => e.day_id === day.id),
        }))
        setDays(daysWithExercises)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  if (isLoading) return <WorkoutSkeleton />

  if (hasNoPlan || !plan) {
    return (
      <div className="px-5 flex flex-col items-center justify-center min-h-[60vh] space-y-4 bg-bg-primary">
        <div className="size-16 rounded-full bg-accent-gold/10 border border-accent-gold/30 flex items-center justify-center">
          <Dumbbell className="size-8 text-accent-gold" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-text-primary font-heading font-bold text-lg">No workout plan assigned</p>
          <p className="text-sm text-text-muted">Your coach will assign a plan soon</p>
        </div>
      </div>
    )
  }

  const currentWeek = clientRow?.start_date
    ? differenceInWeeks(new Date(), new Date(clientRow.start_date)) + 1
    : 1
  const displayWeek = Math.min(Math.max(currentWeek, 1), plan.weeks)

  const activeDay = days[selectedDay]

  return (
    <div className="relative px-5 pt-2 flex flex-col gap-6 bg-bg-primary min-h-full pb-4 overflow-hidden">
      {/* Ambient hero backdrop */}
      <div className="absolute inset-x-0 top-0 h-56 -z-10 overflow-hidden">
        <img src="/images/aman/aman-04.jpeg" alt="" className="w-full h-full object-cover opacity-20 blur-sm" />
        <div className="absolute inset-0 bg-gradient-to-b from-bg-primary/50 via-bg-primary/85 to-bg-primary" />
      </div>

      {/* Header */}
      <div className="flex flex-col pt-2">
        <span className="text-[11px] font-bold text-text-muted uppercase tracking-widest">
          Active Plan
        </span>
        <h2 className="font-heading font-bold text-xl text-text-primary leading-tight mt-0.5">
          {plan.name}
        </h2>
        <p className="text-[10px] text-accent-gold font-semibold mt-1 bg-accent-gold/10 border border-accent-gold/30 px-2.5 py-1 rounded-md w-max">
          Week {displayWeek} of {plan.weeks}
        </p>
      </div>

      {/* Day tabs */}
      {days.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 snap-x select-none">
          {days.map((day, i) => {
            const isSelected = selectedDay === i
            return (
              <button
                key={day.id}
                onClick={() => setSelectedDay(i)}
                className={`relative px-5 py-3 rounded-full text-xs font-heading font-bold tracking-wide uppercase snap-start whitespace-nowrap transition-colors duration-300 cursor-pointer ${
                  isSelected ? "bg-accent-gold text-bg-primary" : "bg-bg-elevated text-text-muted border border-border-subtle"
                }`}
              >
                Day {day.day_number}
              </button>
            )
          })}
        </div>
      )}

      {/* Focus subtitle */}
      {activeDay && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-accent-gold" />
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              {activeDay.day_name}
              {activeDay.focus ? ` · ${activeDay.focus}` : ""}
            </h3>
          </div>
          <span className="text-[10px] text-text-muted font-bold">
            {activeDay.exercises.length} Movement{activeDay.exercises.length === 1 ? "" : "s"}
          </span>
        </div>
      )}

      {/* Exercises */}
      {activeDay && activeDay.exercises.length === 0 ? (
        <div className="bg-bg-card/80 border border-border-subtle backdrop-blur-xl rounded-2xl p-8 flex flex-col items-center gap-3">
          <Moon className="size-8 text-text-muted/50" />
          <p className="text-text-primary font-medium">Rest day</p>
          <p className="text-sm text-text-muted text-center">
            Take it easy today. Recovery is part of the plan.
          </p>
        </div>
      ) : (
        <div ref={listRef} key={selectedDay} className="flex flex-col gap-4">
          {(activeDay?.exercises ?? []).map((exercise) => (
            <motion.div
              key={exercise.id}
              whileTap={{ scale: 0.98 }}
              className="reveal-item bg-bg-card/80 border border-border-subtle backdrop-blur-xl rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-accent-gold/40 transition-colors duration-300"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-accent-gold/10 border border-accent-gold/30 flex items-center justify-center flex-shrink-0">
                  <Dumbbell className="w-5 h-5 text-accent-gold" />
                </div>
                <div className="flex flex-col min-w-0">
                  <h4 className="text-xs font-bold text-text-primary font-heading leading-tight truncate">
                    {exercise.name}
                  </h4>
                  <p className="text-[10px] text-text-muted font-medium mt-0.5">
                    {exercise.sets !== null && exercise.reps !== null ? `${exercise.sets} × ${exercise.reps}` : ""}
                    {exercise.weight ? ` · ${exercise.weight}` : ""}
                  </p>
                  {exercise.notes && (
                    <p className="text-[9px] text-text-muted/70 italic mt-0.5 truncate">{exercise.notes}</p>
                  )}
                </div>
              </div>
              {exercise.rest_seconds !== null && (
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[9px] text-text-muted font-bold font-heading uppercase flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    Rest
                  </span>
                  <span className="text-xs font-heading font-bold text-text-primary bg-bg-elevated px-2 py-1 rounded">
                    {exercise.rest_seconds}s
                  </span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {days.length === 0 && (
        <div className="bg-bg-card/80 border border-border-subtle backdrop-blur-xl rounded-2xl p-8 flex flex-col items-center gap-3">
          <Dumbbell className="size-8 text-text-muted/50" />
          <p className="text-text-muted text-sm">No days configured yet</p>
        </div>
      )}

      {/* Download PDF */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => {
          if (!plan || days.length === 0) { toast("No workout data to export"); return }
          try {
            const doc = new jsPDF()
            doc.setFont("helvetica", "bold")
            doc.setFontSize(22)
            doc.text("AK FITNESS — WORKOUT PLAN", 20, 20)
            doc.setFontSize(12)
            doc.setFont("helvetica", "normal")
            doc.text(`${plan.name} — Week ${displayWeek} of ${plan.weeks}`, 20, 30)

            let y = 44
            days.forEach((day) => {
              if (y > 250) { doc.addPage(); y = 20 }
              doc.setFont("helvetica", "bold")
              doc.setFontSize(13)
              doc.text(`DAY ${day.day_number} — ${day.day_name.toUpperCase()}${day.focus ? ` (${day.focus})` : ""}`, 20, y)
              y += 8
              if (day.exercises.length === 0) {
                doc.setFont("helvetica", "italic")
                doc.setFontSize(10)
                doc.text("Rest day", 25, y)
                y += 8
              } else {
                day.exercises.forEach((ex) => {
                  if (y > 270) { doc.addPage(); y = 20 }
                  doc.setFont("helvetica", "normal")
                  doc.setFontSize(10)
                  const setsReps = ex.sets !== null && ex.reps !== null ? `${ex.sets} × ${ex.reps}` : ""
                  const rest = ex.rest_seconds ? ` | Rest: ${ex.rest_seconds}s` : ""
                  doc.text(`• ${ex.name}${setsReps ? ` — ${setsReps}` : ""}${rest}`, 25, y)
                  y += 6
                })
              }
              y += 6
            })

            doc.save(`Workout_Plan_AK_Fitness_${format(new Date(), "yyyy-MM-dd")}.pdf`)
            toast.success("PDF downloaded")
          } catch { toast.error("Failed to generate PDF") }
        }}
        className="w-full border border-accent-gold/40 hover:border-accent-gold text-accent-gold font-heading font-bold text-xs uppercase tracking-widest py-3.5 px-6 rounded-full transition-all active:scale-[0.99] mt-2 flex items-center justify-center gap-2 cursor-pointer bg-bg-card/80 backdrop-blur-xl"
      >
        <Download className="w-4 h-4 stroke-[2.5]" />
        Download Workout PDF
      </motion.button>
    </div>
  )
}
