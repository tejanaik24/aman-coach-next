"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { Dumbbell, Apple, ClipboardCheck, Zap, Heart, Moon } from "lucide-react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import type { Client, WorkoutPlan, NutritionPlan, Checkin, Profile } from "@/types"

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function ScoreDot({ value, color }: { value: number | null; color: string }) {
  if (value === null) return <span className="text-xs text-[#555555]">—</span>
  return (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-black"
      style={{ backgroundColor: color }}
    >
      {value}
    </span>
  )
}

function CardSkeleton({ height = "h-28" }: { height?: string }) {
  return (
    <div className={`bg-[#161616] border border-[#222222] rounded-2xl p-5 ${height} animate-pulse`}>
      <div className="w-24 h-3 rounded bg-[#222222] mb-3" />
      <div className="w-40 h-4 rounded bg-[#222222] mb-2" />
      <div className="w-32 h-3 rounded bg-[#222222]" />
    </div>
  )
}

export default function ClientHomePage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [clientRow, setClientRow] = useState<Client | null>(null)
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null)
  const [nutritionPlan, setNutritionPlan] = useState<NutritionPlan | null>(null)
  const [latestCheckin, setLatestCheckin] = useState<Checkin | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()
        if (profileData) setProfile(profileData as Profile)

        // Fetch client record
        const { data: clientData, error: clientError } = await supabase
          .from("clients")
          .select("*")
          .eq("user_id", user.id)
          .single()
        if (clientError || !clientData) {
          setIsLoading(false)
          return
        }
        const client = clientData as Client
        setClientRow(client)

        // Parallel fetches for plans + latest checkin
        const [workoutRes, nutritionRes, checkinRes] = await Promise.all([
          supabase
            .from("workout_plans")
            .select("*")
            .eq("client_id", client.id)
            .eq("is_active", true)
            .single(),
          supabase
            .from("nutrition_plans")
            .select("*")
            .eq("client_id", client.id)
            .eq("is_active", true)
            .single(),
          supabase
            .from("checkins")
            .select("*")
            .eq("client_id", client.id)
            .order("submitted_at", { ascending: false })
            .limit(1),
        ])

        if (!workoutRes.error && workoutRes.data) setWorkoutPlan(workoutRes.data as WorkoutPlan)
        if (!nutritionRes.error && nutritionRes.data) setNutritionPlan(nutritionRes.data as NutritionPlan)
        if (checkinRes.data && checkinRes.data.length > 0) {
          setLatestCheckin(checkinRes.data[0] as Checkin)
        }
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const name = profile?.name ?? "there"
  const initials = profile?.name ? getInitials(profile.name) : "?"

  return (
    <div className="p-4 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between pt-2">
        <div>
          <h1
            className="text-xl font-bold text-white"
            style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
          >
            {getGreeting()}, {name.split(" ")[0]}
          </h1>
          {clientRow?.start_date && (
            <p className="text-sm text-[#A0A0A0] mt-0.5">
              Since {format(new Date(clientRow.start_date), "MMM yyyy")}
            </p>
          )}
        </div>
        <div className="w-10 h-10 rounded-full bg-[#C9A84C] flex items-center justify-center flex-shrink-0">
          <span className="text-black text-sm font-bold">{initials}</span>
        </div>
      </div>

      {/* Workout card */}
      {isLoading ? (
        <CardSkeleton />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#161616] border border-[#222222] rounded-2xl p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dumbbell className="size-5 text-[#C9A84C]" />
              <h2 className="text-white font-semibold">Workout Plan</h2>
            </div>
            {workoutPlan && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#C9A84C]/15 text-[#C9A84C]">
                Active
              </span>
            )}
          </div>
          {workoutPlan ? (
            <div>
              <p className="text-white font-medium">{workoutPlan.name}</p>
              <p className="text-sm text-[#A0A0A0] mt-1">
                {workoutPlan.weeks} week program
              </p>
            </div>
          ) : (
            <div className="h-16 rounded-xl bg-[#111111] border border-[#222222] flex items-center justify-center">
              <p className="text-sm text-[#555555]">No plan assigned yet</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Nutrition card */}
      {isLoading ? (
        <CardSkeleton />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-[#161616] border border-[#222222] rounded-2xl p-5 space-y-3"
        >
          <div className="flex items-center gap-2">
            <Apple className="size-5 text-[#C9A84C]" />
            <h2 className="text-white font-semibold">Nutrition Plan</h2>
          </div>
          {nutritionPlan ? (
            <div className="space-y-2">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-white">{nutritionPlan.total_calories ?? "—"}</span>
                <span className="text-sm text-[#A0A0A0]">kcal / day</span>
              </div>
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="text-[#C9A84C] font-semibold">{nutritionPlan.protein_g ?? "—"}g</span>
                  <span className="text-[#555555] ml-1">protein</span>
                </div>
                <div>
                  <span className="text-[#3b82f6] font-semibold">{nutritionPlan.carbs_g ?? "—"}g</span>
                  <span className="text-[#555555] ml-1">carbs</span>
                </div>
                <div>
                  <span className="text-[#f97316] font-semibold">{nutritionPlan.fats_g ?? "—"}g</span>
                  <span className="text-[#555555] ml-1">fats</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-16 rounded-xl bg-[#111111] border border-[#222222] flex items-center justify-center">
              <p className="text-sm text-[#555555]">No nutrition plan yet</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Latest check-in card */}
      {isLoading ? (
        <CardSkeleton height="h-32" />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#161616] border border-[#222222] rounded-2xl p-5 space-y-3"
        >
          <div className="flex items-center gap-2">
            <ClipboardCheck className="size-5 text-[#C9A84C]" />
            <h2 className="text-white font-semibold">Latest Check-in</h2>
          </div>
          {latestCheckin ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#A0A0A0]">
                  Week {latestCheckin.week_number ?? "?"} ·{" "}
                  {format(new Date(latestCheckin.submitted_at), "d MMM yyyy")}
                </p>
                {latestCheckin.reviewed_at && (
                  <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                    Reviewed
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Zap className="size-3.5 text-[#C9A84C]" />
                  <span className="text-xs text-[#A0A0A0]">Energy</span>
                  <ScoreDot value={latestCheckin.energy_level} color="#C9A84C" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Moon className="size-3.5 text-[#3b82f6]" />
                  <span className="text-xs text-[#A0A0A0]">Sleep</span>
                  <ScoreDot value={latestCheckin.sleep_quality} color="#3b82f6" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Heart className="size-3.5 text-[#f97316]" />
                  <span className="text-xs text-[#A0A0A0]">Workout</span>
                  <ScoreDot value={latestCheckin.adherence_workout} color="#f97316" />
                </div>
              </div>
            </div>
          ) : (
            <div className="h-14 rounded-xl bg-[#111111] border border-[#222222] flex items-center justify-center">
              <p className="text-sm text-[#555555]">No check-ins submitted yet</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Submit Check-in button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => router.push("/checkin")}
        className="w-full py-4 rounded-2xl bg-[#C9A84C] text-black font-bold text-sm tracking-wide"
      >
        Submit Weekly Check-in
      </motion.button>
    </div>
  )
}
