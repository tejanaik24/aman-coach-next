"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, animate } from "motion/react"
import { ChevronRight, CheckCircle2, Dumbbell } from "lucide-react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import ProfileMenu from "@/components/shared/ProfileMenu"
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
  const [count, setCount] = useState(0)
  useEffect(() => {
    const controls = animate(0, to, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (value) => setCount(Math.round(value)),
    })
    return () => controls.stop()
  }, [to])
  return <>{count}</>
}

function CardSkeleton({ height = "h-[105px]" }: { height?: string }) {
  return <div className={`bg-white rounded-card-mobile shadow-bento ${height} animate-pulse`} />
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
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [coachName, setCoachName] = useState<string | null>(null)

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

        const [workoutRes, nutritionRes, checkinRes] = await Promise.all([
          supabase.from("workout_plans").select("*").eq("client_id", client.id).eq("is_active", true).single(),
          supabase.from("nutrition_plans").select("*").eq("client_id", client.id).eq("is_active", true).single(),
          supabase.from("checkins").select("*").eq("client_id", client.id).order("submitted_at", { ascending: false }).limit(1),
        ])

        if (!workoutRes.error && workoutRes.data) setWorkoutPlan(workoutRes.data as WorkoutPlan)
        if (!nutritionRes.error && nutritionRes.data) setNutritionPlan(nutritionRes.data as NutritionPlan)
        if (checkinRes.data && checkinRes.data.length > 0) setLatestCheckin(checkinRes.data[0] as Checkin)

        if (client.coach_id) {
          const { data: coachProfile } = await supabase.from("profiles").select("name").eq("id", client.coach_id).single()
          if (coachProfile) setCoachName(coachProfile.name)
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
    <div className="px-5 pt-2 flex flex-col gap-6 bg-cream min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold text-charcoal-muted uppercase tracking-widest">
            {getGreeting()}, {name.split(" ")[0]}
          </span>
          <h2 className="font-montserrat font-black text-xl text-charcoal-deep leading-tight mt-0.5">
            {coachName ? `Coach ${coachName.split(" ")[0]}` : "Coach"}
          </h2>
        </div>
        <button type="button" onClick={() => setIsProfileOpen(true)} aria-label="Open profile" className="cursor-pointer">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={name} className="w-12 h-12 rounded-full object-cover border-2 border-lime-electric shadow-md" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-charcoal-deep flex items-center justify-center border-2 border-lime-electric shadow-md">
              <span className="text-lime-electric text-sm font-montserrat font-bold">{initials}</span>
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

      {/* Submit Check-in Hero Button */}
      <motion.button
        onClick={() => router.push("/checkin")}
        whileTap={{ scale: 0.97 }}
        className="w-full bg-lime-electric text-charcoal-deep font-montserrat font-black text-xs uppercase tracking-wider py-4 px-6 rounded-full shadow-bento flex items-center justify-center gap-2 cursor-pointer hover:bg-lime-electric/95 transition-colors"
      >
        Submit Check-in
        <ChevronRight className="w-4 h-4" />
      </motion.button>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          <CardSkeleton height="h-[180px]" />
          <CardSkeleton height="h-[180px]" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {/* Latest check-in progress ring */}
          <div className="bg-white p-5 rounded-card-mobile shadow-bento flex flex-col items-center justify-between h-[180px]">
            <span className="text-[10px] font-bold text-charcoal-muted text-center uppercase tracking-wider">
              {latestCheckin ? `Week ${latestCheckin.week_number ?? "?"} Progress` : "Progress"}
            </span>

            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                <circle cx="48" cy="48" r="40" stroke="#E6E8DE" strokeWidth="8" fill="none" />
                <motion.circle
                  cx="48" cy="48" r="40"
                  stroke="#C4F542" strokeWidth="8" fill="none" strokeLinecap="round"
                  initial={{ strokeDasharray: ringCircumference, strokeDashoffset: ringCircumference }}
                  animate={{ strokeDashoffset: ringOffset }}
                  transition={{ type: "spring", duration: 1.5, bounce: 0.15 }}
                />
              </svg>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={name} className="absolute w-[68px] h-[68px] rounded-full object-cover" />
              ) : (
                <div className="absolute w-[68px] h-[68px] rounded-full bg-charcoal-deep flex items-center justify-center">
                  <span className="text-lime-electric font-montserrat font-black text-lg">{initials}</span>
                </div>
              )}
            </div>

            <span className="text-[10px] font-bold text-charcoal-deep uppercase tracking-wider">
              {latestCheckin ? <><Counter to={adherencePct} />% Adherence</> : "No check-in yet"}
            </span>
          </div>

          {/* Active workout plan */}
          <div
            className="relative rounded-card-mobile overflow-hidden h-[180px] shadow-bento cursor-pointer bg-charcoal-deep flex flex-col justify-end p-4"
            onClick={() => router.push("/workout")}
          >
            <Dumbbell className="absolute top-4 right-4 w-8 h-8 text-lime-electric/30" />
            <span className="text-[9px] font-bold text-lime-electric uppercase tracking-widest mb-1.5">
              Active Plan
            </span>
            {workoutPlan ? (
              <>
                <h3 className="font-montserrat font-black text-sm text-white leading-tight">{workoutPlan.name}</h3>
                <p className="text-[10px] text-white/70 font-medium mt-0.5">{workoutPlan.weeks} week program</p>
              </>
            ) : (
              <p className="text-[10px] text-white/70 font-medium">No plan assigned yet</p>
            )}
          </div>
        </div>
      )}

      {/* Last Check-in Bento Card */}
      {isLoading ? (
        <CardSkeleton />
      ) : (
        <div className="bg-white rounded-card-mobile p-5 shadow-bento flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-charcoal-muted uppercase tracking-wider">Last Check-in</span>
            {latestCheckin ? (
              <>
                <h4 className="font-montserrat font-black text-3xl text-charcoal-deep mt-1">
                  <Counter to={adherencePct} />%
                </h4>
                <p className="text-[10px] text-charcoal-muted font-medium mt-0.5">
                  Week {latestCheckin.week_number ?? "?"} · {format(new Date(latestCheckin.submitted_at), "d MMM")}
                </p>
              </>
            ) : (
              <p className="text-xs text-charcoal-muted font-medium mt-1">No check-ins submitted yet</p>
            )}
          </div>
          <div className="w-14 h-14 bg-cream rounded-full flex items-center justify-center text-charcoal-deep shadow-inner border border-charcoal-deep/5">
            <CheckCircle2 className={`w-7 h-7 stroke-[1.5] ${latestCheckin?.reviewed_at ? "text-lime-electric" : "text-charcoal-muted/40"}`} />
          </div>
        </div>
      )}

      {/* Nutrition summary */}
      {isLoading ? (
        <CardSkeleton />
      ) : nutritionPlan ? (
        <div className="bg-white rounded-card-mobile p-5 shadow-bento space-y-2">
          <span className="text-[10px] font-bold text-charcoal-muted uppercase tracking-wider">Nutrition Plan</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-montserrat font-black text-charcoal-deep">{nutritionPlan.total_calories ?? "—"}</span>
            <span className="text-sm text-charcoal-muted">kcal / day</span>
          </div>
          <div className="flex gap-4 text-sm">
            <div><span className="text-lime-electric font-bold">{nutritionPlan.protein_g ?? "—"}g</span><span className="text-charcoal-muted ml-1 text-xs">protein</span></div>
            <div><span className="text-charcoal-deep font-bold">{nutritionPlan.carbs_g ?? "—"}g</span><span className="text-charcoal-muted ml-1 text-xs">carbs</span></div>
            <div><span className="text-charcoal-deep font-bold">{nutritionPlan.fats_g ?? "—"}g</span><span className="text-charcoal-muted ml-1 text-xs">fats</span></div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-card-mobile p-5 shadow-bento">
          <p className="text-xs text-charcoal-muted font-medium">No nutrition plan yet</p>
        </div>
      )}
    </div>
  )
}
