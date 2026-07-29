"use client"

import { useState, useEffect } from "react"
import { motion } from "motion/react"
import { Dumbbell, Moon, Clock, Download } from "lucide-react"
import { differenceInWeeks, format } from "date-fns"
import toast from "react-hot-toast"
import jsPDF from "jspdf"
import { createClient } from "@/lib/supabase/client"
import { useStaggerReveal } from "@/hooks/useStaggerReveal"
import KineticText from "@/components/ui/KineticText"
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
        <div className="size-16 rounded-full bg-accent-orange/10 border border-accent-orange/30 flex items-center justify-center">
          <Dumbbell className="size-8 text-accent-orange" />
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
  const planNameFontSize = plan.name.length <= 10 ? 26 : plan.name.length <= 16 ? 22 : plan.name.length <= 24 ? 18 : 15

  return (
    <div className="relative px-5 pt-2 flex flex-col gap-6 bg-bg-primary min-h-full pb-4">
      {/* HERO — same cinematic language as the home hero: warm charcoal/brown base,
          single orange halo, bloom-spill, grain, coach photo as background layer. */}
      <div
        className="relative rounded-[32px] overflow-hidden"
        style={{
          height: "300px",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 0 1px rgba(255,106,26,0.16), 0 30px 60px -20px rgba(0,0,0,0.65), 0 0 40px -10px rgba(255,106,26,0.12)",
        }}
      >
        {/* Full-bleed background photo, tinted with the exact same warm charcoal/brown
            stops as the home hero (not a separate neutral-black scrim) so the two
            screens read as one palette. */}
        <img
          src="/images/aman/aman-workout-hero.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover animate-breathe"
          style={{ objectPosition: "70% 28%" }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(100deg, #0A0705 0%, rgba(20,13,6,0.55) 25%, rgba(28,17,8,0.22) 50%, rgba(36,23,8,0.06) 72%, transparent 92%), linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.3) 100%)",
          }}
        />

        {/* Corner ambient glow + halo — identical values to the home hero. */}
        <div className="absolute -top-20 -left-20 w-[340px] h-[340px] rounded-full radial-orange-ambient opacity-70" />
        <div
          className="absolute rounded-full pointer-events-none animate-halo-pulse"
          style={{
            width: "460px",
            height: "460px",
            right: "-140px",
            top: "-100px",
            background: "radial-gradient(circle, rgba(255,120,40,0.22) 0%, transparent 66%)",
            filter: "blur(65px)",
          }}
        />

        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            backgroundSize: "120px 120px",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ boxShadow: "inset 0 0 70px 10px rgba(0,0,0,0.28)" }}
        />

        <div className="relative z-20 px-5 pt-6 max-w-[60%]">
          <span className="text-accent-orange text-[11px] font-bold uppercase tracking-[0.25em]">
            Active Plan
          </span>
          <div className="mt-1">
            <KineticText
              text={plan.name}
              fontSize={planNameFontSize}
              delay={0.15}
              className="font-heading font-extrabold text-white leading-tight"
            />
          </div>
          <p className="text-[10px] text-accent-orange font-semibold mt-3 bg-accent-orange/10 border border-accent-orange/30 px-2.5 py-1 rounded-md w-max">
            Week {displayWeek} of {plan.weeks}
          </p>
        </div>
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
                  isSelected ? "bg-accent-orange text-bg-primary" : "bg-bg-elevated text-text-muted border border-border-subtle"
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
            <Dumbbell className="w-4 h-4 text-accent-orange" />
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
              className="reveal-item bg-bg-card/80 border border-border-subtle backdrop-blur-xl rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-accent-orange/40 transition-colors duration-300"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-accent-orange/10 border border-accent-orange/30 flex items-center justify-center flex-shrink-0">
                  <Dumbbell className="w-5 h-5 text-accent-orange" />
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
        className="w-full border border-accent-orange/40 hover:border-accent-orange text-accent-orange font-heading font-bold text-xs uppercase tracking-widest py-3.5 px-6 rounded-full transition-all active:scale-[0.99] mt-2 flex items-center justify-center gap-2 cursor-pointer bg-bg-card/80 backdrop-blur-xl"
      >
        <Download className="w-4 h-4 stroke-[2.5]" />
        Download Workout PDF
      </motion.button>
    </div>
  )
}
