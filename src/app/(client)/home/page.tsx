"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { ChevronRight, CheckCircle2, Dumbbell, Calendar, Flame, Trophy, Award } from "lucide-react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import ProfileMenu from "@/components/shared/ProfileMenu"
import { useStaggerReveal } from "@/hooks/useStaggerReveal"
import { useCountUp } from "@/hooks/useCountUp"
import BadgesGrid from "@/components/client/BadgesGrid"
import { getClientBadges, checkAndUnlockBadges, fireBadgeUnlockConfetti, type ClientBadge } from "@/lib/badges"
import type { Client, WorkoutPlan, NutritionPlan, Checkin, Profile } from "@/types"

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

function Counter({ to }: { to: number }) {
  return <>{useCountUp(to)}</>
}

function CardSkeleton({ height = "h-[105px]" }: { height?: string }) {
  return <div className={`bg-[#161616] rounded-2xl ${height} animate-pulse border border-[#222222]`} />
}

export default function ClientHomePage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [clientRow, setClientRow] = useState<Client | null>(null)
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null)
  const [nutritionPlan, setNutritionPlan] = useState<NutritionPlan | null>(null)
  const [latestCheckin, setLatestCheckin] = useState<Checkin | null>(null)
  const [clientBadges, setClientBadges] = useState<ClientBadge[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [coachName, setCoachName] = useState<string | null>(null)

  const gridRef = useStaggerReveal<HTMLDivElement>([isLoading])

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setUserEmail(user.email ?? null)

        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()
        if (profileData) setProfile(profileData as Profile)

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

        const [workoutRes, nutritionRes, checkinRes, allCheckinsRes] = await Promise.all([
          supabase.from("workout_plans").select("*").eq("client_id", client.id).eq("is_active", true).single(),
          supabase.from("nutrition_plans").select("*").eq("client_id", client.id).eq("is_active", true).single(),
          supabase.from("checkins").select("*").eq("client_id", client.id).order("submitted_at", { ascending: false }).limit(1),
          supabase.from("checkins").select("id").eq("client_id", client.id)
        ])

        if (!workoutRes.error && workoutRes.data) setWorkoutPlan(workoutRes.data as WorkoutPlan)
        if (!nutritionRes.error && nutritionRes.data) setNutritionPlan(nutritionRes.data as NutritionPlan)
        if (checkinRes.data && checkinRes.data.length > 0) setLatestCheckin(checkinRes.data[0] as Checkin)

        if (client.coach_id) {
          const { data: coachProfile } = await supabase.from("profiles").select("name").eq("id", client.coach_id).single()
          if (coachProfile) setCoachName(coachProfile.name)
        }

        // Fetch client badges
        const badges = await getClientBadges(client.id)
        setClientBadges(badges)

        // Evaluate automated badge unlocks
        const checkinCount = allCheckinsRes.data?.length || 0
        const newlyUnlocked = await checkAndUnlockBadges(client.id, profileData?.name || "Client", {
          checkinCount,
          hasPlan: !!(workoutRes.data || nutritionRes.data)
        })

        if (newlyUnlocked.length > 0) {
          fireBadgeUnlockConfetti()
          const updatedBadges = await getClientBadges(client.id)
          setClientBadges(updatedBadges)
        }
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const name = profile?.name ?? "there"
  const initials = profile?.name ? getInitials(profile.name) : "?"
  const adherencePct = latestCheckin?.adherence_workout != null ? Math.round(latestCheckin.adherence_workout * 10) : 0
  const ringCircumference = 251.2
  const ringOffset = ringCircumference - (ringCircumference * adherencePct) / 100

  return (
    <div className="min-h-full bg-[#0A0A0A] text-[#F0F0F0] px-5 pt-8 pb-28 flex flex-col gap-6 overflow-y-auto">

      {/* TOP HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-[#FFB800] uppercase tracking-widest block font-sans">
            {getGreeting()}, {name.split(" ")[0]}
          </span>
          <h1 className="font-sans font-black text-xl text-white leading-tight tracking-tight mt-0.5">
            {coachName ? `Coach ${coachName.split(" ")[0]}` : "Coach Aman Khurana"}
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setIsProfileOpen(true)}
          aria-label="Open profile"
          className="cursor-pointer"
        >
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={name}
              className="w-12 h-12 rounded-full object-cover border-2 border-[#FFB800] shadow-[0_0_15px_rgba(255,184,0,0.3)]"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#161616] border-2 border-[#FFB800] shadow-[0_0_15px_rgba(255,184,0,0.3)] flex items-center justify-center">
              <span className="text-[#FFB800] text-sm font-sans font-black">{initials}</span>
            </div>
          )}
        </button>
      </div>

      <ProfileMenu
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        name={profile?.name ?? name}
        email={userEmail}
        avatarUrl={profile?.avatar_url ?? null}
        role="client"
        onNameUpdated={(newName) => setProfile((p) => (p ? { ...p, name: newName } : p))}
      />

      {/* HERO ACTION BAR */}
      <div className="flex gap-3">
        <motion.button
          onClick={() => router.push("/checkin")}
          whileTap={{ scale: 0.97 }}
          className="flex-1 bg-[#FFB800] text-black font-sans font-black text-xs uppercase tracking-wider py-4 px-4 rounded-2xl shadow-[0_0_25px_rgba(255,184,0,0.35)] flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[#FFE082] transition-colors active:scale-[0.98]"
        >
          <span>Submit Check-in</span>
          <ChevronRight className="w-4 h-4 stroke-[3]" />
        </motion.button>

        <motion.button
          onClick={() => router.push("/schedule")}
          whileTap={{ scale: 0.97 }}
          className="py-4 px-4 rounded-2xl bg-[#121212] border border-[#FFB800]/40 text-[#FFB800] font-sans font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[#FFB800]/10 transition-colors"
        >
          <Calendar className="w-4 h-4" />
          <span>Book Call</span>
        </motion.button>
      </div>

      {/* BENTO GRID */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          <CardSkeleton height="h-[190px]" />
          <CardSkeleton height="h-[190px]" />
        </div>
      ) : (
        <div ref={gridRef} className="grid grid-cols-2 gap-4">

          {/* Tile 1: Progress Ring */}
          <div className="bg-[#121212] border border-[#222222] rounded-2xl p-4 flex flex-col items-center justify-between h-[190px] shadow-lg">
            <span className="text-[9px] font-bold text-[#888888] text-center uppercase tracking-widest font-sans">
              {latestCheckin ? `Week ${latestCheckin.week_number ?? "?"} Progress` : "Progress"}
            </span>

            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                <circle cx="48" cy="48" r="40" stroke="#222222" strokeWidth="7" fill="none" />
                <motion.circle
                  cx="48" cy="48" r="40"
                  stroke="#FFB800" strokeWidth="7" fill="none" strokeLinecap="round"
                  initial={{ strokeDasharray: ringCircumference, strokeDashoffset: ringCircumference }}
                  animate={{ strokeDashoffset: ringOffset }}
                  transition={{ type: "spring", duration: 1.5, bounce: 0.15 }}
                />
              </svg>
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={name}
                  className="absolute w-16 h-16 rounded-full object-cover border border-[#FFB800]/40"
                />
              ) : (
                <div className="absolute w-16 h-16 rounded-full bg-[#1A1A1A] border border-[#FFB800]/40 flex items-center justify-center">
                  <span className="text-[#FFB800] font-sans font-black text-lg">{initials}</span>
                </div>
              )}
            </div>

            <span className="text-[9px] font-bold text-white uppercase tracking-wider font-sans">
              {latestCheckin ? <><Counter to={adherencePct} />% Adherence</> : "No check-in yet"}
            </span>
          </div>

          {/* Tile 2: Active Workout Plan */}
          <div
            className="relative rounded-2xl overflow-hidden h-[190px] border border-[#222222] cursor-pointer flex flex-col justify-end p-4 group"
            onClick={() => router.push("/workout")}
          >
            <img
              src="/images/aman/aman-03.jpeg"
              alt="Coach Aman"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/50 to-transparent" />
            <Dumbbell className="absolute top-4 right-4 w-6 h-6 text-[#FFB800]" />

            <span className="relative text-[9px] font-bold text-[#FFB800] uppercase tracking-widest mb-1 font-sans">
              Active Workout
            </span>
            {workoutPlan ? (
              <>
                <h3 className="relative font-sans font-black text-sm text-white leading-tight uppercase">{workoutPlan.name}</h3>
                <p className="relative text-[10px] text-[#A0A0A0] font-medium mt-0.5">{workoutPlan.weeks} week program</p>
              </>
            ) : (
              <p className="relative text-[10px] text-[#888888] font-medium">No plan assigned yet</p>
            )}
          </div>
        </div>
      )}

      {/* LAST CHECK-IN CARD */}
      {isLoading ? (
        <CardSkeleton />
      ) : (
        <div className="bg-[#121212] border border-[#222222] rounded-2xl p-5 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[9px] font-bold text-[#888888] uppercase tracking-widest font-sans block">
              Last Check-in
            </span>
            {latestCheckin ? (
              <>
                <h4 className="font-sans font-black text-3xl text-[#FFB800] mt-1">
                  <Counter to={adherencePct} />%
                </h4>
                <p className="text-[10px] text-[#888888] font-medium mt-0.5">
                  Week {latestCheckin.week_number ?? "?"} &bull; {format(new Date(latestCheckin.submitted_at), "d MMM")}
                </p>
              </>
            ) : (
              <p className="text-xs text-[#888888] font-medium mt-1">No check-ins submitted yet</p>
            )}
          </div>
          <div className="w-14 h-14 bg-[#1A1A1A] rounded-2xl flex items-center justify-center border border-[#FFB800]/30">
            <CheckCircle2 className={`w-7 h-7 stroke-[1.5] ${latestCheckin?.reviewed_at ? "text-[#FFB800]" : "text-[#444444]"}`} />
          </div>
        </div>
      )}

      {/* NUTRITION PLAN CARD */}
      {isLoading ? (
        <CardSkeleton />
      ) : nutritionPlan ? (
        <div className="bg-[#121212] border border-[#222222] rounded-2xl p-5 flex flex-col gap-3 shadow-lg">
          <span className="text-[9px] font-bold text-[#888888] uppercase tracking-widest font-sans">
            Nutrition Target
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-sans font-black text-3xl text-white">{nutritionPlan.total_calories ?? "—"}</span>
            <span className="text-xs text-[#FFB800] font-bold font-sans">kcal / day</span>
          </div>
          <div className="flex gap-4 text-xs font-semibold">
            <div>
              <span className="text-[#FFB800] font-black font-sans">{nutritionPlan.protein_g ?? "—"}g</span>
              <span className="text-[#888888] ml-1 text-[10px] font-sans">protein</span>
            </div>
            <div>
              <span className="text-white font-black font-sans">{nutritionPlan.carbs_g ?? "—"}g</span>
              <span className="text-[#888888] ml-1 text-[10px] font-sans">carbs</span>
            </div>
            <div>
              <span className="text-white font-black font-sans">{nutritionPlan.fats_g ?? "—"}g</span>
              <span className="text-[#888888] ml-1 text-[10px] font-sans">fats</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#121212] border border-[#222222] rounded-2xl p-5">
          <p className="text-xs text-[#888888] font-medium font-sans">No nutrition plan assigned yet</p>
        </div>
      )}

      {/* BADGES & MILESTONES */}
      {!isLoading && (
        <div className="bg-[#121212] border border-[#222222] rounded-2xl p-5 shadow-lg">
          <BadgesGrid unlockedBadges={clientBadges} title="Your Achievements" showAll={true} />
        </div>
      )}

    </div>
  )
}
