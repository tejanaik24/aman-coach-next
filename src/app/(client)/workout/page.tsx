"use client";

import KineticText from "@/components/ui/KineticText";
import { useStaggerReveal } from "@/hooks/useStaggerReveal";
import { createClient } from "@/lib/supabase/client";
import type { Client, Exercise, WorkoutDay, WorkoutPlan } from "@/types";
import { differenceInWeeks, format } from "date-fns";
import jsPDF from "jspdf";
import {
  Check,
  Clock,
  Download,
  Dumbbell,
  Moon,
  Pause,
  Play,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`bg-bg-card rounded-2xl skeleton-pulse ${className ?? ""}`}
    />
  );
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
  );
}

interface DayWithExercises extends WorkoutDay {
  exercises: Exercise[];
}

export default function WorkoutPage() {
  const supabase = createClient();

  const [clientRow, setClientRow] = useState<Client | null>(null);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [days, setDays] = useState<DayWithExercises[]>([]);
  const [selectedDay, setSelectedDay] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasNoPlan, setHasNoPlan] = useState(false);
  const [completedSets, setCompletedSets] = useState<Record<string, number[]>>(
    {},
  );
  const [restTimer, setRestTimer] = useState<{
    active: boolean;
    secondsLeft: number;
    totalSeconds: number;
    exerciseName: string;
    isPaused: boolean;
  }>({
    active: false,
    secondsLeft: 0,
    totalSeconds: 0,
    exerciseName: "",
    isPaused: false,
  });

  useEffect(() => {
    if (!restTimer.active || restTimer.isPaused || restTimer.secondsLeft <= 0)
      return;

    const interval = setInterval(() => {
      setRestTimer((prev) => {
        if (!prev.active || prev.isPaused) return prev;
        if (prev.secondsLeft <= 1) {
          if (typeof window !== "undefined" && "vibrate" in navigator) {
            try {
              navigator.vibrate([150, 80, 150, 80, 300]);
            } catch {}
          }
          toast.success(
            `Rest finished for ${prev.exerciseName}! Time for next set.`,
            { id: "rest-finished", icon: "🔥" },
          );
          return { ...prev, active: false, secondsLeft: 0 };
        }
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [restTimer.active, restTimer.isPaused, restTimer.secondsLeft]);

  const startRest = (seconds: number, exerciseName: string) => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(20);
      } catch {}
    }
    setRestTimer({
      active: true,
      secondsLeft: seconds,
      totalSeconds: seconds,
      exerciseName,
      isPaused: false,
    });
    toast(`Rest timer: ${seconds}s`, { icon: "⏱️", duration: 1500 });
  };

  const toggleSetComplete = (
    exerciseId: string,
    setIndex: number,
    restSeconds: number | null,
    exerciseName: string,
  ) => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(15);
      } catch {}
    }
    setCompletedSets((prev) => {
      const current = prev[exerciseId] ?? [];
      const exists = current.includes(setIndex);
      const next = exists
        ? current.filter((s) => s !== setIndex)
        : [...current, setIndex];
      if (!exists && restSeconds && restSeconds > 0) {
        startRest(restSeconds, exerciseName);
      }
      return { ...prev, [exerciseId]: next };
    });
  };

  const listRef = useStaggerReveal<HTMLDivElement>([selectedDay, isLoading]);

  useEffect(() => {
    async function fetchData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: clientData, error: clientError } = await supabase
          .from("clients")
          .select("*")
          .eq("user_id", user.id)
          .single();
        if (clientError || !clientData) {
          setHasNoPlan(true);
          return;
        }
        const client = clientData as Client;
        setClientRow(client);

        const { data: planData, error: planError } = await supabase
          .from("workout_plans")
          .select("*")
          .eq("client_id", client.id)
          .eq("is_active", true)
          .single();
        if (planError || !planData) {
          setHasNoPlan(true);
          return;
        }
        const activePlan = planData as WorkoutPlan;
        setPlan(activePlan);

        const { data: daysData } = await supabase
          .from("workout_days")
          .select("*")
          .eq("plan_id", activePlan.id)
          .order("day_number", { ascending: true });

        if (!daysData || daysData.length === 0) {
          setDays([]);
          return;
        }

        const dayRows = daysData as WorkoutDay[];
        const dayIds = dayRows.map((d) => d.id);

        const { data: exercisesData } = await supabase
          .from("exercises")
          .select("*")
          .in("day_id", dayIds)
          .order("order_index", { ascending: true });

        const exerciseRows = (exercisesData ?? []) as Exercise[];

        const daysWithExercises: DayWithExercises[] = dayRows.map((day) => ({
          ...day,
          exercises: exerciseRows.filter((e) => e.day_id === day.id),
        }));
        setDays(daysWithExercises);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  if (isLoading) return <WorkoutSkeleton />;

  if (hasNoPlan || !plan) {
    return (
      <div className="px-5 flex flex-col items-center justify-center min-h-[60vh] space-y-4 bg-bg-primary">
        <div className="size-16 rounded-full bg-accent-orange/10 border border-accent-orange/30 flex items-center justify-center">
          <Dumbbell className="size-8 text-accent-orange" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-text-primary font-heading font-bold text-lg">
            Plans from your coach show here
          </p>
          <p className="text-sm text-text-muted">
            Aman will send your plan soon
          </p>
        </div>
      </div>
    );
  }

  const currentWeek = clientRow?.start_date
    ? differenceInWeeks(new Date(), new Date(clientRow.start_date)) + 1
    : 1;
  const displayWeek = Math.min(Math.max(currentWeek, 1), plan.weeks);

  const activeDay = days[selectedDay];
  const planNameFontSize =
    plan.name.length <= 10
      ? 26
      : plan.name.length <= 16
        ? 22
        : plan.name.length <= 24
          ? 18
          : 15;

  return (
    <div className="relative pt-2 flex flex-col gap-6 bg-bg-primary min-h-full pb-16">
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
            background:
              "radial-gradient(circle, rgba(255,120,40,0.22) 0%, transparent 66%)",
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
            const isSelected = selectedDay === i;
            return (
              <button
                key={day.id}
                onClick={() => setSelectedDay(i)}
                className={`relative px-5 py-3 rounded-full text-xs font-heading font-bold tracking-wide uppercase snap-start whitespace-nowrap transition-colors duration-300 cursor-pointer ${
                  isSelected
                    ? "bg-accent-orange text-bg-primary"
                    : "bg-bg-elevated text-text-muted border border-border-subtle"
                }`}
              >
                Day {day.day_number}
              </button>
            );
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
            {activeDay.exercises.length} Movement
            {activeDay.exercises.length === 1 ? "" : "s"}
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
          {(activeDay?.exercises ?? []).map((exercise) => {
            const numSets = exercise.sets ?? 3;
            const completed = completedSets[exercise.id] ?? [];
            return (
              <motion.div
                key={exercise.id}
                className="reveal-item bg-bg-card/90 border border-border-subtle hover:border-[#FFB800]/30 backdrop-blur-xl rounded-2xl p-4 flex flex-col gap-3 transition-colors duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-[#FFB800]/10 border border-[#FFB800]/25 flex items-center justify-center flex-shrink-0 text-[#FFB800]">
                      <Dumbbell className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <h4 className="text-xs font-bold text-white font-heading leading-tight truncate">
                        {exercise.name}
                      </h4>
                      <p className="text-[10.5px] text-zinc-400 font-medium mt-0.5">
                        {exercise.sets !== null && exercise.reps !== null
                          ? `${exercise.sets} Sets × ${exercise.reps} Reps`
                          : ""}
                        {exercise.weight ? ` · ${exercise.weight}` : ""}
                      </p>
                      {exercise.notes && (
                        <p className="text-[9.5px] text-zinc-500 italic mt-0.5 truncate">
                          {exercise.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {exercise.rest_seconds !== null && (
                    <button
                      type="button"
                      onClick={() =>
                        startRest(exercise.rest_seconds ?? 60, exercise.name)
                      }
                      className="flex items-center gap-1 bg-white/5 hover:bg-[#FFB800]/15 border border-white/10 hover:border-[#FFB800]/30 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-zinc-300 hover:text-[#FFB800] transition-colors cursor-pointer"
                    >
                      <Clock className="w-3 h-3 text-[#FFB800]" />
                      <span>{exercise.rest_seconds}s</span>
                    </button>
                  )}
                </div>

                {/* Interactive Gym Set Logger Chips */}
                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-1.5">
                  <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">
                    Track Sets:
                  </span>
                  <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                    {Array.from({ length: numSets }).map((_, idx) => {
                      const isDone = completed.includes(idx);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() =>
                            toggleSetComplete(
                              exercise.id,
                              idx,
                              exercise.rest_seconds,
                              exercise.name,
                            )
                          }
                          className={`min-w-[44px] h-8 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 px-2 transition-all cursor-pointer ${
                            isDone
                              ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                              : "bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 active:scale-95"
                          }`}
                        >
                          {isDone ? (
                            <Check className="size-3 stroke-[3]" />
                          ) : null}
                          <span>S{idx + 1}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Floating Gym Rest Timer Dock */}
      {restTimer.active && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="fixed bottom-20 left-4 right-4 max-w-[398px] mx-auto z-40 bg-[#0E0E12]/95 backdrop-blur-2xl border border-[#FFB800]/40 rounded-2xl p-3 shadow-[0_12px_35px_rgba(0,0,0,0.8),0_0_20px_rgba(255,184,0,0.2)] flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-[#FFB800]/15 border border-[#FFB800]/30 flex items-center justify-center text-[#FFB800] shrink-0 font-heading font-black text-xs">
              {restTimer.secondsLeft}s
            </div>
            <div className="min-w-0">
              <span className="text-[9px] text-zinc-400 uppercase tracking-wider font-bold">
                Resting For
              </span>
              <p className="text-white text-xs font-bold truncate max-w-[140px]">
                {restTimer.exerciseName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                setRestTimer((p) => ({
                  ...p,
                  secondsLeft: p.secondsLeft + 30,
                  totalSeconds: p.totalSeconds + 30,
                }))
              }
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px] font-bold py-1.5 px-2.5 rounded-lg cursor-pointer"
            >
              +30s
            </button>
            <button
              type="button"
              onClick={() =>
                setRestTimer((p) => ({ ...p, isPaused: !p.isPaused }))
              }
              className="size-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white cursor-pointer"
            >
              {restTimer.isPaused ? (
                <Play className="size-3.5 fill-current" />
              ) : (
                <Pause className="size-3.5 fill-current" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setRestTimer((p) => ({ ...p, active: false }))}
              className="size-8 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 flex items-center justify-center text-rose-300 cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </motion.div>
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
          if (!plan || days.length === 0) {
            toast("No workout data to export");
            return;
          }
          try {
            const doc = new jsPDF();
            doc.setFont("helvetica", "bold");
            doc.setFontSize(22);
            doc.text("AMAN KHURANA FITNESS — WORKOUT PLAN", 20, 20);
            doc.setFontSize(12);
            doc.setFont("helvetica", "normal");
            doc.text(
              `${plan.name} — Week ${displayWeek} of ${plan.weeks}`,
              20,
              30,
            );

            let y = 44;
            days.forEach((day) => {
              if (y > 250) {
                doc.addPage();
                y = 20;
              }
              doc.setFont("helvetica", "bold");
              doc.setFontSize(13);
              doc.text(
                `DAY ${day.day_number} — ${day.day_name.toUpperCase()}${day.focus ? ` (${day.focus})` : ""}`,
                20,
                y,
              );
              y += 8;
              if (day.exercises.length === 0) {
                doc.setFont("helvetica", "italic");
                doc.setFontSize(10);
                doc.text("Rest day", 25, y);
                y += 8;
              } else {
                day.exercises.forEach((ex) => {
                  if (y > 270) {
                    doc.addPage();
                    y = 20;
                  }
                  doc.setFont("helvetica", "normal");
                  doc.setFontSize(10);
                  const setsReps =
                    ex.sets !== null && ex.reps !== null
                      ? `${ex.sets} × ${ex.reps}`
                      : "";
                  const rest = ex.rest_seconds
                    ? ` | Rest: ${ex.rest_seconds}s`
                    : "";
                  doc.text(
                    `• ${ex.name}${setsReps ? ` — ${setsReps}` : ""}${rest}`,
                    25,
                    y,
                  );
                  y += 6;
                });
              }
              y += 6;
            });

            doc.save(
              `Workout_Plan_AK_Fitness_${format(new Date(), "yyyy-MM-dd")}.pdf`,
            );
            toast.success("PDF downloaded");
          } catch {
            toast.error("Failed to generate PDF");
          }
        }}
        className="w-full border border-accent-orange/40 hover:border-accent-orange text-accent-orange font-heading font-bold text-xs uppercase tracking-widest py-3.5 px-6 rounded-full transition-all active:scale-[0.99] mt-2 flex items-center justify-center gap-2 cursor-pointer bg-bg-card/80 backdrop-blur-xl"
      >
        <Download className="w-4 h-4 stroke-[2.5]" />
        Download Workout PDF
      </motion.button>
    </div>
  );
}
