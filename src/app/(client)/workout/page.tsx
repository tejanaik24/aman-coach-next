"use client"

import { useState, useEffect } from "react"
import { motion } from "motion/react"
import { Dumbbell, Moon } from "lucide-react"
import { differenceInWeeks } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import type { Client, WorkoutPlan, WorkoutDay, Exercise } from "@/types"

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`bg-[#222222] rounded-xl animate-pulse ${className ?? ""}`} />
}

function WorkoutSkeleton() {
  return (
    <div className="p-4 space-y-5">
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
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="size-16 rounded-full bg-[#C9A84C]/10 flex items-center justify-center">
          <Dumbbell className="size-8 text-[#C9A84C]" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-white font-semibold text-lg">No workout plan assigned</p>
          <p className="text-sm text-[#C9A84C]">Your coach will assign a plan soon</p>
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
    <div className="p-4 space-y-5">
      {/* Header */}
      <div className="pt-2">
        <h1
          className="text-xl font-bold text-white"
          style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
        >
          {plan.name}
        </h1>
        <p className="text-sm text-[#A0A0A0] mt-0.5">
          Week {displayWeek} of {plan.weeks}
        </p>
      </div>

      {/* Day tabs */}
      {days.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {days.map((day, i) => (
            <motion.button
              key={day.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSelectedDay(i)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                selectedDay === i
                  ? "bg-[#C9A84C] text-black"
                  : "bg-[#161616] border border-[#222222] text-[#A0A0A0]"
              }`}
            >
              Day {day.day_number}
            </motion.button>
          ))}
        </div>
      )}

      {/* Day name + focus */}
      {activeDay && (
        <div>
          <p className="text-white font-semibold">{activeDay.day_name}</p>
          {activeDay.focus && (
            <p className="text-sm text-[#A0A0A0] mt-0.5">{activeDay.focus}</p>
          )}
        </div>
      )}

      {/* Exercises */}
      {activeDay && activeDay.exercises.length === 0 ? (
        <div className="bg-[#161616] border border-[#222222] rounded-2xl p-8 flex flex-col items-center gap-3">
          <Moon className="size-8 text-[#555555]" />
          <p className="text-[#A0A0A0] font-medium">Rest day</p>
          <p className="text-sm text-[#555555] text-center">
            Take it easy today. Recovery is part of the plan.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(activeDay?.exercises ?? []).map((exercise, i) => (
            <motion.div
              key={exercise.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-[#161616] border border-[#222222] rounded-2xl p-4 space-y-2"
            >
              <p className="text-white font-semibold">{exercise.name}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {exercise.sets !== null && exercise.reps !== null && (
                  <span className="text-sm text-[#C9A84C] font-medium">
                    {exercise.sets} × {exercise.reps}
                  </span>
                )}
                {exercise.weight && (
                  <span className="text-sm text-[#A0A0A0]">{exercise.weight}</span>
                )}
                {exercise.rest_seconds !== null && (
                  <span className="text-sm text-[#555555]">
                    Rest {exercise.rest_seconds}s
                  </span>
                )}
              </div>
              {exercise.notes && (
                <p className="text-xs text-[#555555] italic">{exercise.notes}</p>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {days.length === 0 && (
        <div className="bg-[#161616] border border-[#222222] rounded-2xl p-8 flex flex-col items-center gap-3">
          <Dumbbell className="size-8 text-[#555555]" />
          <p className="text-[#A0A0A0] text-sm">No days configured yet</p>
        </div>
      )}
    </div>
  )
}
