"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import dynamic from "next/dynamic"
import { ChevronRight, CheckCircle2, Dumbbell, Calendar, Flame, Trophy, Zap, Star, MessageSquare } from "lucide-react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import ProfileMenu from "@/components/shared/ProfileMenu"
import BadgesGrid from "@/components/client/BadgesGrid"
import GlassCard from "@/components/ui/GlassCard"
import KineticText from "@/components/ui/KineticText"
import ScrollReveal from "@/components/ui/ScrollReveal"
import { useCountUp } from "@/hooks/useCountUp"
import { getClientBadges, checkAndUnlockBadges, fireBadgeUnlockConfetti, type ClientBadge } from "@/lib/badges"
import type { Client, WorkoutPlan, NutritionPlan, Checkin, Profile } from "@/types"

const GradientMesh = dynamic(() => import("@/components/ui/GradientMesh"), { ssr: false })
const ParticleField = dynamic(() => import("@/components/ui/ParticleField"), { ssr: false })

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

        const badges = await getClientBadges(client.id)
        setClientBadges(badges)

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
    <div className="min-h-screen relative bg-[#0A0A0A] text-white">
      <GradientMesh />
      <ParticleField />

      <div className="relative z-10 px-5 pt-8 pb-28 max-w-lg mx-auto space-y-6">

        {/* TOP HEADER */}
        <ScrollReveal delay={0}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-muted text-xs font-semibold uppercase tracking-widest mb-1">
                {getGreeting()}
              </p>
              <KineticText
                text={name.split(" ")[0]}
                fontSize={44}
                delay={0.2}
                className="font-extrabold text-white"
              />
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-text-muted text-xs font-medium">Active Champion</span>
              </div>
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
                  className="w-12 h-12 rounded-full object-cover border-2 border-accent-gold shadow-[0_0_20px_rgba(255,184,0,0.3)]"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-bg-elevated border-2 border-accent-gold shadow-[0_0_20px_rgba(255,184,0,0.3)] flex items-center justify-center">
                  <span className="text-accent-gold text-sm font-heading font-bold">{initials}</span>
                </div>
              )}
            </button>
          </div>
        </ScrollReveal>

        <ProfileMenu
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          name={profile?.name ?? name}
          email={userEmail}
          avatarUrl={profile?.avatar_url ?? null}
          role="client"
          onNameUpdated={(newName) => setProfile((p) => (p ? { ...p, name: newName } : p))}
        />

        {/* COACH CARD */}
        <ScrollReveal delay={0.1}>
          <GlassCard variant="strong" tilt className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#FFB800] to-[#CC9300] flex items-center justify-center text-xl font-bold text-black shrink-0 shadow-lg">
                AK
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base text-white">{coachName ? `Coach ${coachName}` : "Coach Aman Khurana"}</p>
                <p className="text-text-muted text-xs mt-0.5">Head Coach &amp; Nutritionist</p>
              </div>
              <button
                onClick={() => router.push("/schedule")}
                className="glass rounded-xl px-3.5 py-2 flex items-center gap-1.5 text-accent-gold text-xs font-bold cursor-pointer hover:bg-accent-gold/10 transition-colors"
              >
                Call <ChevronRight size={14} />
              </button>
            </div>
          </GlassCard>
        </ScrollReveal>

        {/* ACTION BUTTONS */}
        <ScrollReveal delay={0.15}>
          <div className="flex gap-3">
            <motion.button
              onClick={() => router.push("/checkin")}
              whileTap={{ scale: 0.97 }}
              className="flex-1 bg-accent-gold text-bg-primary font-heading font-bold text-xs uppercase tracking-wider py-4 px-4 rounded-2xl shadow-[0_0_25px_rgba(255,184,0,0.35)] flex items-center justify-center gap-1.5 cursor-pointer hover:bg-accent-gold/90 transition-colors"
            >
              <span>Submit Check-in</span>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </motion.button>

            <motion.button
              onClick={() => router.push("/schedule")}
              whileTap={{ scale: 0.97 }}
              className="py-4 px-4 rounded-2xl glass border border-accent-gold/40 text-accent-gold font-heading font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer hover:bg-accent-gold/10 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              <span>Book Call</span>
            </motion.button>
          </div>
        </ScrollReveal>

        {/* STREAK & METRICS GRID */}
        <ScrollReveal delay={0.2}>
          <div className="grid grid-cols-3 gap-3">
            <GlassCard variant="gold" className="p-4 text-center">
              <div className="flex justify-center mb-2">
                <Flame className="text-accent-gold" size={26} />
              </div>
              <p className="text-2xl font-extrabold text-accent-gold gold-text-glow font-heading block">
                12
              </p>
              <p className="text-text-muted text-[10px] uppercase font-bold tracking-wider mt-1">Streak</p>
            </GlassCard>

            <GlassCard className="p-4 text-center">
              <div className="flex justify-center mb-2">
                <Zap className="text-[#3DA3FF]" size={26} />
              </div>
              <p className="text-2xl font-extrabold text-white font-heading block">
                {latestCheckin?.week_number ?? 1}
              </p>
              <p className="text-text-muted text-[10px] uppercase font-bold tracking-wider mt-1">Week</p>
            </GlassCard>

            <GlassCard className="p-4 text-center">
              <div className="flex justify-center mb-2">
                <Trophy className="text-emerald-400" size={26} />
              </div>
              <p className="text-2xl font-extrabold text-white font-heading block">
                {clientBadges.filter(b => b.unlockedAt).length}
              </p>
              <p className="text-text-muted text-[10px] uppercase font-bold tracking-wider mt-1">Badges</p>
            </GlassCard>
          </div>
        </ScrollReveal>

        {/* PROGRESS & WORKOUT PLAN BENTO */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="glass rounded-2xl h-44 skeleton-pulse" />
            <div className="glass rounded-2xl h-44 skeleton-pulse" />
          </div>
        ) : (
          <ScrollReveal delay={0.25}>
            <div className="grid grid-cols-2 gap-3">

              {/* Adherence Progress Ring */}
              <GlassCard className="p-4 flex flex-col items-center justify-between h-[190px]">
                <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest text-center">
                  {latestCheckin ? `Week ${latestCheckin.week_number ?? "?"} Adherence` : "Progress"}
                </span>

                <div className="relative w-24 h-24 flex items-center justify-center my-1">
                  <svg className="w-full h-full -rotate-90">
                    <circle cx="48" cy="48" r="40" stroke="rgba(255,255,255,0.1)" strokeWidth="7" fill="none" />
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
                      className="absolute w-14 h-14 rounded-full object-cover border border-accent-gold/40"
                    />
                  ) : (
                    <div className="absolute w-14 h-14 rounded-full bg-bg-elevated border border-accent-gold/40 flex items-center justify-center">
                      <span className="text-accent-gold font-heading font-bold text-base">{initials}</span>
                    </div>
                  )}
                </div>

                <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                  {latestCheckin ? <><Counter to={adherencePct} />% Score</> : "No check-in yet"}
                </span>
              </GlassCard>

              {/* Active Workout Card */}
              <GlassCard
                tilt
                onClick={() => router.push("/workout")}
                className="relative overflow-hidden h-[190px] p-4 flex flex-col justify-end cursor-pointer group"
              >
                <img
                  src="/images/aman/aman-03.jpeg"
                  alt="Workout Plan"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-40"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/60 to-transparent" />
                <Dumbbell className="absolute top-4 right-4 w-6 h-6 text-accent-gold z-10" />

                <span className="relative z-10 text-[9px] font-bold text-accent-gold uppercase tracking-widest mb-1">
                  Active Workout
                </span>
                {workoutPlan ? (
                  <div className="relative z-10">
                    <h3 className="font-heading font-bold text-xs text-white uppercase leading-tight">{workoutPlan.name}</h3>
                    <p className="text-[10px] text-text-muted font-medium mt-0.5">{workoutPlan.weeks} week plan</p>
                  </div>
                ) : (
                  <p className="relative z-10 text-[10px] text-text-muted font-medium">No workout plan assigned</p>
                )}
              </GlassCard>

            </div>
          </ScrollReveal>
        )}

        {/* NUTRITION TARGET CARD */}
        {!isLoading && nutritionPlan && (
          <ScrollReveal delay={0.3}>
            <GlassCard className="p-5 flex flex-col gap-3">
              <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">
                Nutrition Target
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-heading font-extrabold text-3xl text-white">{nutritionPlan.total_calories ?? "—"}</span>
                <span className="text-xs text-accent-gold font-bold">kcal / day</span>
              </div>
              <div className="flex gap-4 text-xs font-semibold pt-1">
                <div>
                  <span className="text-accent-gold font-bold">{nutritionPlan.protein_g ?? "—"}g</span>
                  <span className="text-text-muted ml-1 text-[10px]">protein</span>
                </div>
                <div>
                  <span className="text-white font-bold">{nutritionPlan.carbs_g ?? "—"}g</span>
                  <span className="text-text-muted ml-1 text-[10px]">carbs</span>
                </div>
                <div>
                  <span className="text-white font-bold">{nutritionPlan.fats_g ?? "—"}g</span>
                  <span className="text-text-muted ml-1 text-[10px]">fats</span>
                </div>
              </div>
            </GlassCard>
          </ScrollReveal>
        )}

        {/* MILESTONE BADGES */}
        {!isLoading && (
          <ScrollReveal delay={0.35}>
            <GlassCard className="p-5">
              <BadgesGrid unlockedBadges={clientBadges} title="Your Achievements" showAll={true} />
            </GlassCard>
          </ScrollReveal>
        )}

      </div>
    </div>
  )
}
