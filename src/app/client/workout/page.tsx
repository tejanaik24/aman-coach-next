"use client"

import { useState } from "react"
import { ClientLayout } from "@/components/layout/ClientLayout"
import { EmptyState } from "@/components/ui/EmptyState"
import { PageSkeleton } from "@/components/ui/skeleton"
import { useClientData } from "@/hooks/useClient"
import { motion, AnimatePresence } from "motion/react"
import { ChevronDown, Download, Dumbbell } from "lucide-react"

const weeks = ["Week 1", "Week 2", "Week 3", "Week 4"]
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

export default function WorkoutPage() {
  const { workoutPlan, loading } = useClientData()
  const [activeWeek, setActiveWeek] = useState(0)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)

  if (loading) return <ClientLayout><PageSkeleton /></ClientLayout>

  if (!workoutPlan) {
    return (
      <ClientLayout>
        <EmptyState
          icon="💪"
          title="No Workout Plan Yet"
          description="Your coach hasn't uploaded your plan yet. Hang tight!"
        />
      </ClientLayout>
    )
  }

  return (
    <ClientLayout>
      <div className="flex items-center gap-3 mb-2">
        <Dumbbell className="size-6 text-purple" />
        <h1 className="font-heading text-2xl text-white">My Workout Plan</h1>
      </div>
      <p className="text-xs text-zinc-500 mb-6">{workoutPlan.name}</p>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {weeks.map((week, i) => (
          <button
            key={week}
            onClick={() => setActiveWeek(i)}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
              activeWeek === i
                ? "bg-purple text-white"
                : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-600"
            }`}
          >
            {week}
          </button>
        ))}
      </div>

      <div className="space-y-2 mb-6">
        {days.map((day) => {
          const isExpanded = expandedDay === day
          const dayExercises = workoutPlan.days?.filter(d => d.day?.toLowerCase() === day.toLowerCase()) || []
          const exercises = dayExercises.length > 0 ? dayExercises[0].exercises : []

          return (
            <motion.div
              key={day}
              layout
              className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden"
            >
              <button
                onClick={() => setExpandedDay(isExpanded ? null : day)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div>
                  <p className="text-sm font-medium text-white">{day}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {exercises.length > 0 ? `${exercises.length} exercises` : "Rest day"}
                  </p>
                </div>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="size-5 text-zinc-400" />
                </motion.div>
              </button>
              <AnimatePresence>
                {isExpanded && exercises.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-2 border-t border-zinc-800 pt-3">
                      {exercises.map((ex, j) => (
                        <div key={j} className="flex items-center justify-between rounded-xl bg-zinc-800/50 px-3 py-2.5">
                          <div>
                            <p className="text-sm text-white">{ex.name}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {ex.sets} × {ex.reps}
                              {ex.weight ? ` @ ${ex.weight}kg` : ""}
                              {ex.rest ? ` | Rest: ${ex.rest}` : ""}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
                {isExpanded && exercises.length === 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 border-t border-zinc-800 pt-3">
                      <p className="text-xs text-zinc-500 text-center py-4">Rest day — no exercises scheduled</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      <button className="w-full rounded-full bg-purple py-3.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-purple-dark transition-colors flex items-center justify-center gap-2">
        <Download className="size-4" />
        Download Full Plan
      </button>
    </ClientLayout>
  )
}
