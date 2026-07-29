"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import dynamic from "next/dynamic"
import { ChevronRight, Calendar, Flame, Trophy, Zap, Phone, Star, Sparkles, BadgeCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getAppointments } from "@/lib/supabase-store"
import { getDailyTip, ACTIVE_OFFER } from "@/lib/dailyTip"
import ProfileMenu from "@/components/shared/ProfileMenu"
import BadgesGrid from "@/components/client/BadgesGrid"
import GlassCard from "@/components/ui/GlassCard"
import KineticText from "@/components/ui/KineticText"
import ScrollReveal from "@/components/ui/ScrollReveal"
import { useCountUp } from "@/hooks/useCountUp"
import { getClientBadges, checkAndUnlockBadges, fireBadgeUnlockConfetti, type ClientBadge } from "@/lib/badges"
import type { Client, WorkoutPlan, NutritionPlan, Checkin, Profile, Appointment } from "@/types"

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

function formatSessionDate(dateStr: string): string {
  const today = new Date()
  const d = new Date(dateStr)
  const isToday = d.toDateString() === today.toDateString()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const isTomorrow = d.toDateString() === tomorrow.toDateString()
  if (isToday) return "Today"
  if (isTomorrow) return "Tomorrow"
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })
}

function formatTime12h(t: string): string {
  const [h, m] = t.split(":").map(Number)
  const period = h >= 12 ? "PM" : "AM"
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, "0")} ${period}`
}

export default function ClientHomePage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [clientRow, setClientRow] = useState<Client | null>(null)
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null)
  const [nutritionPlan, setNutritionPlan] = useState<NutritionPlan | null>(null)
  const [latestCheckin, setLatestCheckin] = useState<Checkin | null>(null)
  const [prevCheckin, setPrevCheckin] = useState<Checkin | null>(null)
  const [clientBadges, setClientBadges] = useState<ClientBadge[]>([])
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null)
  const [totalWorkoutsThisWeek, setTotalWorkoutsThisWeek] = useState(0)
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

        const [workoutRes, nutritionRes, checkinsRes] = await Promise.all([
          supabase.from("workout_plans").select("*").eq("client_id", client.id).eq("is_active", true).single(),
          supabase.from("nutrition_plans").select("*").eq("client_id", client.id).eq("is_active", true).single(),
          supabase.from("checkins").select("*").eq("client_id", client.id).order("submitted_at", { ascending: false }).limit(2),
        ])

        if (!workoutRes.error && workoutRes.data) setWorkoutPlan(workoutRes.data as WorkoutPlan)
        if (!nutritionRes.error && nutritionRes.data) setNutritionPlan(nutritionRes.data as NutritionPlan)
        const checkins = (checkinsRes.data ?? []) as Checkin[]
        if (checkins[0]) setLatestCheckin(checkins[0])
        if (checkins[1]) setPrevCheckin(checkins[1])

        if (client.coach_id) {
          const { data: coachProfile } = await supabase.from("profiles").select("name").eq("id", client.coach_id).single()
          if (coachProfile) setCoachName(coachProfile.name)
        }

        const badges = await getClientBadges(client.id)
        setClientBadges(badges)

        const appointments = await getAppointments(user.id, "client")
        const upcoming = appointments
          .filter((a) => a.status === "scheduled" && new Date(`${a.date}T${a.startTime}`) >= new Date(new Date().toDateString()))
          .sort((a, b) => new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime())
        if (upcoming[0]) setNextAppointment(upcoming[0])

        const weekStart = new Date()
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())
        weekStart.setHours(0, 0, 0, 0)
        const thisWeekCount = appointments.filter(
          (a) => a.status === "completed" && new Date(a.date) >= weekStart
        ).length
        setTotalWorkoutsThisWeek(thisWeekCount)

        const checkinCount = checkins.length
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
  const firstName = name.split(" ")[0].toUpperCase()
  const heroNameFontSize = firstName.length <= 5 ? 43 : firstName.length <= 7 ? 34 : firstName.length <= 9 ? 28 : 22
  const heroPromo = ACTIVE_OFFER ?? getDailyTip()
  const adherencePct = latestCheckin?.adherence_workout != null ? Math.round(latestCheckin.adherence_workout * 10) : 0
  const prevAdherencePct = prevCheckin?.adherence_workout != null ? Math.round(prevCheckin.adherence_workout * 10) : null
  const adherenceDelta = prevAdherencePct != null ? adherencePct - prevAdherencePct : null
  const eliteLevel = adherencePct >= 80 ? "Elite Level" : adherencePct >= 60 ? "Solid Progress" : adherencePct > 0 ? "Building Momentum" : "Getting Started"
  const ringCircumference = 2 * Math.PI * 80
  const ringOffset = ringCircumference - (ringCircumference * adherencePct) / 100

  const streak = clientBadges.filter((b) => b.unlockedAt).length > 0 ? (latestCheckin ? (latestCheckin.week_number ?? 1) * 4 : 0) : 0
  const workoutsToNextMilestone = Math.max(0, 3 - totalWorkoutsThisWeek)
  const motivationLine = workoutsToNextMilestone > 0
    ? `You're ${workoutsToNextMilestone} workout${workoutsToNextMilestone === 1 ? "" : "s"} away from becoming unstoppable.`
    : "You've hit your weekly target. Champion form."

  return (
    <div className="min-h-screen relative bg-[#0A0A0A] text-white">
      <GradientMesh />
      <ParticleField />

      <div className="relative z-10 pb-28 max-w-lg mx-auto">

        <div className="px-5 pt-8 space-y-6">

          <ProfileMenu
            isOpen={isProfileOpen}
            onClose={() => setIsProfileOpen(false)}
            name={profile?.name ?? name}
            email={userEmail}
            avatarUrl={profile?.avatar_url ?? null}
            role="client"
            onNameUpdated={(newName) => setProfile((p) => (p ? { ...p, name: newName } : p))}
          />

          {/* HERO — a single banner, not a card-plus-column grid. The coach photo is an
              absolutely positioned background layer that dominates the whole section;
              text/chips float on top of it, they don't share a row with it. */}
          <ScrollReveal delay={0}>
            <div
              className="relative rounded-[32px] overflow-hidden"
              style={{
                height: "600px",
                // Base tone now carries a horizontal relationship to the coach (warmer toward
                // the right, where he stands) on top of the vertical depth fade — previously
                // this was a pure top-to-bottom gradient with zero left/right distinction,
                // which is exactly why the left side read as a disconnected flat slab.
                background:
                  "linear-gradient(100deg, #0A0705 0%, #140D06 30%, #1C1108 60%, #241708 100%), linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.45) 100%)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 0 1px rgba(255,106,26,0.16), 0 30px 60px -20px rgba(0,0,0,0.65), 0 0 40px -10px rgba(255,106,26,0.12)",
              }}
            >
              <div className="absolute -top-20 -left-20 w-[340px] h-[340px] rounded-full radial-orange-ambient opacity-70" />

              {/* BLOOM SPILL — bridges the corner ambient glow and the coach's halo so light
                  reads as one continuous source spilling leftward, not two isolated glows with
                  a dead corridor between them. Sits low/mid so it stays clear of the headline
                  text zone at the top. Very low opacity — extension, not a new light source. */}
              <div
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: "560px",
                  height: "420px",
                  left: "-140px",
                  top: "230px",
                  background: "radial-gradient(ellipse, rgba(230,110,40,0.10) 0%, transparent 70%)",
                  filter: "blur(90px)",
                }}
              />

              {/* HALO — one soft radial glow behind the coach. Widened slightly and shifted so
                  more of its falloff reaches toward center, connecting with the bloom above. */}
              <div
                className="absolute rounded-full pointer-events-none animate-halo-pulse"
                style={{
                  width: "760px",
                  height: "760px",
                  right: "-190px",
                  top: "-60px",
                  background: "radial-gradient(circle, rgba(255,120,40,0.22) 0%, transparent 66%)",
                  filter: "blur(75px)",
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
                style={{ boxShadow: "inset 0 0 90px 20px rgba(0,0,0,0.55)" }}
              />

              {/* COACH IMAGE — z-[1], behind everything. Absolutely positioned, bottom-anchored,
                  no width/height box around it — it's the background, not a grid cell. */}
              <img
                src="/images/aman/aman-hero-glow.png"
                alt="Coach Aman Khurana"
                className="absolute z-[1] pointer-events-none select-none animate-breathe"
                style={{
                  right: "-6px",
                  bottom: "40px",
                  height: "564px",
                  width: "auto",
                  maskImage:
                    "linear-gradient(to bottom, black 0%, black 70%, transparent 100%), linear-gradient(to left, black 0%, black 45%, transparent 90%)",
                  maskComposite: "intersect",
                  filter:
                    "drop-shadow(-8px 0 24px rgba(255,106,26,0.28)) drop-shadow(0 -6px 20px rgba(255,140,60,0.18))",
                }}
              />

              {/* AVATAR — top-right, above the coach image */}
              <button
                type="button"
                onClick={() => setIsProfileOpen(true)}
                aria-label="Open profile"
                className="cursor-pointer absolute top-6 right-4 z-30"
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={name}
                    className="w-11 h-11 rounded-full object-cover border-2 border-accent-orange shadow-[0_0_20px_rgba(255, 106, 26,0.3)]"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-bg-elevated border-2 border-accent-orange shadow-[0_0_20px_rgba(255, 106, 26,0.3)] flex items-center justify-center">
                    <span className="text-accent-orange text-sm font-heading font-bold">{initials}</span>
                  </div>
                )}
              </button>

              {/* TOP CONTENT — greeting/name/subtitle/streak, compressed, floats over the coach's
                  head/shoulders. No background, no border — just text on the same photo. */}
              <div className="relative z-20 px-5 pt-6 max-w-[54%]">
                <p className="text-accent-orange text-xs font-bold uppercase tracking-[0.25em] mb-1">
                  {getGreeting()}
                </p>
                <div className="flex items-end">
                  <KineticText
                    text={firstName}
                    fontSize={heroNameFontSize}
                    delay={0.2}
                    className="font-extrabold text-white tracking-tight !flex-nowrap"
                  />
                  <span className="text-accent-orange text-3xl font-extrabold leading-none mb-0.5">.</span>
                </div>
                <p className="text-text-muted text-xs font-medium mt-1">
                  Stronger today, unstoppable tomorrow.
                </p>
                <div className="inline-flex items-center gap-2 mt-5 pl-2.5 pr-3.5 py-1.5 rounded-full bg-accent-orange/10 border border-accent-orange/20">
                  <Flame className="w-4 h-4 text-accent-orange fill-accent-orange" />
                  <span className="text-accent-orange text-base font-extrabold leading-none">{streak || 0}</span>
                  <span className="flex flex-col leading-[10px]">
                    <span className="text-accent-orange text-[8.5px] font-bold uppercase tracking-wider">Day</span>
                    <span className="text-accent-orange text-[8.5px] font-bold uppercase tracking-wider">Streak</span>
                  </span>
                </div>
              </div>

              {/* WORKOUT TIP — small glass card near the coach's shoulder, not a wide banner.
                  Overlaps his shoulder by ~12px (negative top offset). */}
              <div
                className="absolute z-20 right-3 top-[220px] w-[40%] rounded-[22px] px-3.5 py-3 shadow-[0_28px_70px_-12px_rgba(0,0,0,0.6)] animate-glass-float"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  backdropFilter: "blur(30px)",
                  WebkitBackdropFilter: "blur(30px)",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3 h-3 text-accent-orange shrink-0" />
                  <span className="text-accent-orange text-[9px] font-bold uppercase tracking-wider">{heroPromo.label}</span>
                </div>
                <p className="text-white/90 text-[10.5px] leading-snug mb-2">{heroPromo.text}</p>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-1 rounded-full bg-accent-orange" />
                  <span className="w-1 h-1 rounded-full bg-white/25" />
                  <span className="w-1 h-1 rounded-full bg-white/25" />
                </div>
              </div>

              {/* BOTTOM CONTENT — coach info + call button, anchored to the hero floor, sitting
                  in front of the coach photo (z-20 vs image's z-[1]), not beside it in a column. */}
              <div className="absolute z-20 bottom-0 left-0 right-0 px-5 pb-5 pt-10">
                <p className="text-accent-orange text-2xl leading-none mb-1.5" style={{ fontFamily: "var(--font-script)" }}>
                  Your Coach
                </p>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <p className="text-white font-heading font-bold text-lg leading-tight">
                    {coachName ? coachName : "Aman Khurana"}
                  </p>
                  <BadgeCheck className="w-4 h-4 text-accent-orange fill-accent-orange/20 shrink-0" />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mb-3 max-w-[62%]">
                  <span className="text-text-muted text-[11px] font-medium">Head Coach &amp; Nutritionist</span>
                  <span className="text-white/15">&bull;</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.04] border border-white/[0.08] px-2 py-0.5">
                    <Star className="w-3 h-3 text-accent-orange fill-accent-orange" />
                    <span className="text-text-muted text-[10.5px] font-medium">12+ Yrs</span>
                  </span>
                </div>
                <button
                  onClick={() => router.push("/schedule")}
                  className="glass-orange rounded-full pl-4 pr-3.5 py-2 flex items-center gap-1.5 text-accent-orange text-xs font-bold cursor-pointer hover:bg-accent-orange/10 active:scale-[0.98] transition-all"
                >
                  <Phone size={13} />
                  Call Coach <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </ScrollReveal>

          {/* WEEKLY SCORE — white surface card */}
          <ScrollReveal delay={0.15}>
            <div className="bg-white rounded-3xl p-5 flex items-center gap-4 shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
              <div className="relative w-[140px] h-[140px] shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 168 168" className="w-full h-full -rotate-90">
                  <circle cx="84" cy="84" r="80" stroke="rgba(0,0,0,0.08)" strokeWidth="8" fill="none" />
                  <motion.circle
                    cx="84" cy="84" r="80"
                    stroke="#FF6A1A" strokeWidth="8" fill="none" strokeLinecap="round"
                    initial={{ strokeDasharray: ringCircumference, strokeDashoffset: ringCircumference }}
                    animate={{ strokeDashoffset: ringOffset }}
                    transition={{ type: "spring", duration: 1.5, bounce: 0.15 }}
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-gray-400 text-[9px] font-bold uppercase tracking-widest">Weekly Score</span>
                  <span className="text-3xl font-extrabold text-gray-900 font-heading">
                    <Counter to={adherencePct} /><span className="text-lg align-top">%</span>
                  </span>
                  <span className="text-accent-orange text-[10px] font-bold uppercase tracking-wider mt-0.5">{eliteLevel}</span>
                  {adherenceDelta != null && (
                    <span className={`text-[10px] font-semibold mt-1 ${adherenceDelta >= 0 ? "text-emerald-600" : "text-danger"}`}>
                      {adherenceDelta >= 0 ? "↑" : "↓"} {Math.abs(adherenceDelta)}% vs last week
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <span className="text-accent-orange text-2xl font-serif leading-none">&ldquo;</span>
                <p className="text-gray-900 text-[15px] font-semibold leading-snug -mt-2">
                  {motivationLine.split(/(\d+)/).map((part, i) =>
                    /^\d+$/.test(part) ? <span key={i} className="text-accent-orange">{part}</span> : part
                  )}
                </p>
                <p className="text-gray-400 text-[11px] mt-1.5">Keep going!</p>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <motion.button
              onClick={() => router.push("/checkin")}
              whileTap={{ scale: 0.97 }}
              className="w-full bg-accent-orange text-white font-heading font-bold text-xs uppercase tracking-wider py-4 px-4 rounded-2xl shadow-[0_0_25px_rgba(255,106,26,0.4)] flex items-center justify-center gap-1.5 cursor-pointer hover:bg-accent-orange/90 transition-colors"
            >
              <span>Submit Check-in</span>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </motion.button>
          </ScrollReveal>

          {/* NEXT SESSION — purple accent card */}
          {!isLoading && nextAppointment && (
            <ScrollReveal delay={0.25}>
              <div
                onClick={() => router.push("/workout")}
                className="relative overflow-hidden rounded-2xl h-[130px] cursor-pointer group border border-violet-500/25"
              >
                <img
                  src="/images/aman/aman-05.jpeg"
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-45 group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-violet-950/90 via-violet-950/60 to-transparent" />
                <div className="relative z-10 h-full flex flex-col justify-center pl-5 pr-16">
                  <span className="text-violet-300 text-[10px] font-bold uppercase tracking-widest mb-1">Next Session</span>
                  <h3 className="font-heading font-bold text-lg text-white leading-tight">
                    {workoutPlan?.name ?? "Training Session"}
                  </h3>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-white/70">
                    <span className="flex items-center gap-1"><Calendar size={11} /> {formatSessionDate(nextAppointment.date)}, {formatTime12h(nextAppointment.startTime)}</span>
                  </div>
                  <span className="text-violet-300 text-[11px] font-bold mt-2 flex items-center gap-1">
                    View Workout <ChevronRight size={13} />
                  </span>
                </div>
                <div className="absolute top-1/2 -translate-y-1/2 right-4 w-11 h-11 rounded-full bg-violet-950 border border-violet-400/40 flex items-center justify-center z-10">
                  <Zap className="w-5 h-5 text-violet-300 fill-violet-300" />
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* TODAY AT A GLANCE — white surface card */}
          <ScrollReveal delay={0.3}>
            <div className="bg-white rounded-3xl p-5 shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
              <p className="text-accent-orange text-[10px] font-bold uppercase tracking-[0.2em] mb-3">Today at a Glance</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center gap-1.5">
                  <Flame className="text-accent-orange" size={22} />
                  <span className="text-2xl font-extrabold text-gray-900 font-heading"><Counter to={streak} /></span>
                  <span className="text-gray-400 text-[9px] uppercase font-bold tracking-wider">Day Streak</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <Zap className="text-gray-900" size={22} />
                  <span className="text-2xl font-extrabold text-gray-900 font-heading"><Counter to={totalWorkoutsThisWeek} /></span>
                  <span className="text-gray-400 text-[9px] uppercase font-bold tracking-wider">Workouts</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <Trophy className="text-accent-orange" size={22} />
                  <span className="text-2xl font-extrabold text-gray-900 font-heading">
                    <Counter to={clientBadges.filter((b) => b.unlockedAt).length} />
                  </span>
                  <span className="text-gray-400 text-[9px] uppercase font-bold tracking-wider">Badges</span>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* NUTRITION TARGET — white surface card (dense data gets promoted off the dark base) */}
          {!isLoading && nutritionPlan && (
            <ScrollReveal delay={0.35}>
              <div className="bg-white rounded-3xl p-5 flex flex-col gap-3 shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                  Nutrition Target
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-heading font-extrabold text-3xl text-gray-900">{nutritionPlan.total_calories ?? "—"}</span>
                  <span className="text-xs text-accent-orange font-bold">kcal / day</span>
                </div>

                {(() => {
                  const protein = nutritionPlan.protein_g ?? 0
                  const carbs = nutritionPlan.carbs_g ?? 0
                  const fats = nutritionPlan.fats_g ?? 0
                  const total = protein + carbs + fats || 1
                  return (
                    <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
                      <div style={{ width: `${(protein / total) * 100}%` }} className="bg-accent-orange" />
                      <div style={{ width: `${(carbs / total) * 100}%` }} className="bg-gray-900" />
                      <div style={{ width: `${(fats / total) * 100}%` }} className="bg-gray-300" />
                    </div>
                  )
                })()}

                <div className="flex gap-4 text-xs font-semibold">
                  <div>
                    <span className="text-accent-orange font-bold">{nutritionPlan.protein_g ?? "—"}g</span>
                    <span className="text-gray-400 ml-1 text-[10px]">protein</span>
                  </div>
                  <div>
                    <span className="text-gray-900 font-bold">{nutritionPlan.carbs_g ?? "—"}g</span>
                    <span className="text-gray-400 ml-1 text-[10px]">carbs</span>
                  </div>
                  <div>
                    <span className="text-gray-500 font-bold">{nutritionPlan.fats_g ?? "—"}g</span>
                    <span className="text-gray-400 ml-1 text-[10px]">fats</span>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* MILESTONE BADGES */}
          {!isLoading && (
            <ScrollReveal delay={0.45}>
              <GlassCard className="p-5">
                <BadgesGrid unlockedBadges={clientBadges} title="Your Achievements" showAll={true} />
              </GlassCard>
            </ScrollReveal>
          )}

        </div>
      </div>
    </div>
  )
}
