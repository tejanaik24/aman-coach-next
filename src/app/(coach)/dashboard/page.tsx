"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import dynamic from "next/dynamic"
import { Plus, Inbox, Star, TrendingUp, Users, Clock, AlertTriangle, IndianRupee, ArrowUpRight } from "lucide-react"
import { format } from "date-fns"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"
import AddClientModal from "@/components/coach/AddClientModal"
import ProfileMenu from "@/components/shared/ProfileMenu"
import GlassCard from "@/components/ui/GlassCard"
import KineticText from "@/components/ui/KineticText"
import ScrollReveal from "@/components/ui/ScrollReveal"
import { useCountUp } from "@/hooks/useCountUp"
import type { Checkin, ClientWithProfile } from "@/types"

const GradientMesh = dynamic(() => import("@/components/ui/GradientMesh"), { ssr: false })
const ParticleField = dynamic(() => import("@/components/ui/ParticleField"), { ssr: false })

interface Stats {
  activeClients: number
  pendingCheckins: number
  feesDue: number
  monthRevenue: number
}

type RecentCheckin = Checkin & { clientName: string; clientAvatar: string | null }
type AttentionClient = ClientWithProfile & { issue: string }

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

function avgAdherence(c: Checkin): number | null {
  const vals = [c.adherence_workout, c.adherence_nutrition].filter(
    (v): v is number => v !== null
  )
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
}

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase()
}

function Avatar({ name, url, size = "w-10 h-10" }: { name: string; url: string | null; size?: string }) {
  if (url) {
    return <img src={url} alt={name} className={`${size} rounded-full object-cover border-2 border-accent-gold`} />
  }
  return (
    <div className={`${size} rounded-full bg-bg-elevated flex items-center justify-center border-2 border-accent-gold flex-shrink-0`}>
      <span className="text-accent-gold text-xs font-heading font-bold">{initials(name)}</span>
    </div>
  )
}

function StatCard({ icon: Icon, value, label, color = "#FFB800", prefix, onClick }: {
  icon: any; value: number; label: string; color?: string; prefix?: string; onClick?: () => void
}) {
  const count = useCountUp(value)
  return (
    <GlassCard tilt onClick={onClick} className="p-4 cursor-pointer">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon size={20} style={{ color }} />
        </div>
        <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-400">
          <ArrowUpRight size={12} /> Active
        </span>
      </div>
      <p className="text-2xl font-extrabold font-heading text-text-primary">
        {prefix || ""}{count.toLocaleString("en-IN")}
      </p>
      <p className="text-text-muted text-xs mt-1 font-medium">{label}</p>
    </GlassCard>
  )
}

export default function CoachDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentCheckins, setRecentCheckins] = useState<RecentCheckin[]>([])
  const [attentionClients, setAttentionClients] = useState<AttentionClient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [todayStr, setTodayStr] = useState("")
  const [coachName, setCoachName] = useState("Aman")
  const [coachEmail, setCoachEmail] = useState<string | null>(null)
  const [coachAvatar, setCoachAvatar] = useState<string | null>(null)

  useEffect(() => {
    setTodayStr(format(new Date(), "EEEE, d MMM"))
  }, [])

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setIsLoading(false); return }

    setCoachEmail(user.email ?? null)
    const { data: profileRow } = await supabase.from("profiles").select("name, avatar_url").eq("id", user.id).single()
    if (profileRow) {
      setCoachName(profileRow.name)
      setCoachAvatar(profileRow.avatar_url)
    }

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000).toISOString()

    const { data: clientRows } = await supabase
      .from("clients")
      .select("id")
      .eq("coach_id", user.id)

    const clientIds = (clientRows ?? []).map((c: { id: string }) => c.id)

    if (clientIds.length === 0) {
      setStats({ activeClients: 0, pendingCheckins: 0, feesDue: 0, monthRevenue: 0 })
      setRecentCheckins([])
      setAttentionClients([])
      setIsLoading(false)
      return
    }

    const [checkinsRes, activeRes, pendingRes, feesRes, revenueRes] = await Promise.all([
      supabase
        .from("checkins")
        .select("*, client:clients(id, profile:profiles(name, avatar_url))")
        .in("client_id", clientIds)
        .order("submitted_at", { ascending: false })
        .limit(5),
      supabase.from("clients").select("id", { count: "exact", head: true }).eq("coach_id", user.id).eq("status", "active"),
      supabase.from("checkins").select("id", { count: "exact", head: true }).in("client_id", clientIds).is("reviewed_at", null),
      supabase.from("fees").select("id", { count: "exact", head: true }).in("client_id", clientIds).eq("status", "pending"),
      supabase.from("fees").select("amount").in("client_id", clientIds).eq("status", "paid").gte("paid_date", monthStart).lte("paid_date", monthEnd),
    ])

    const { data: activeClientRows } = await supabase
      .from("clients")
      .select("id, profile:profiles(name, avatar_url)")
      .eq("coach_id", user.id)
      .eq("status", "active")

    const { data: recentCheckinClients } = await supabase
      .from("checkins")
      .select("client_id")
      .in("client_id", clientIds)
      .gte("submitted_at", fourteenDaysAgo)

    const recentCheckinClientIds = new Set((recentCheckinClients ?? []).map((r: any) => r.client_id))
    const attnData = (activeClientRows ?? [])
      .filter((c: any) => !recentCheckinClientIds.has(c.id))
      .map((c: any) => ({
        ...c,
        issue: "No check-in in 14 days",
      }))

    const mappedCheckins: RecentCheckin[] = (checkinsRes.data ?? []).map((row: any) => ({
      ...row,
      clientName: row.client?.profile?.name ?? "Unknown",
      clientAvatar: row.client?.profile?.avatar_url ?? null,
    }))
    setRecentCheckins(mappedCheckins)

    const monthlyRevenue = (revenueRes.data ?? []).reduce((sum: number, r: any) => sum + (r.amount ?? 0), 0)
    setStats({
      activeClients: activeRes.count ?? 0,
      pendingCheckins: pendingRes.count ?? 0,
      feesDue: feesRes.count ?? 0,
      monthRevenue: monthlyRevenue,
    })

    setAttentionClients(attnData)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const revenueData = [30, 45, 35, 60, 50, 75, 65, 80, 70, 90, 85, 95]

  return (
    <div className="min-h-screen relative bg-[#0A0A0A] text-white">
      <GradientMesh />
      <ParticleField />

      <div className="relative z-10 px-5 pt-8 pb-28 max-w-lg mx-auto space-y-6">

        {/* Top Header */}
        <ScrollReveal delay={0}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-muted text-xs font-semibold uppercase tracking-widest mb-1">
                Coach Dashboard · {todayStr}
              </p>
              <KineticText
                text={coachName.split(" ")[0]}
                fontSize={44}
                delay={0.2}
                className="font-extrabold text-white"
              />
              <div className="flex items-center gap-3 mt-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-text-muted text-xs font-medium">
                  {stats?.activeClients ?? 0} active clients
                </span>
                <span className="text-white/20">|</span>
                <span className="text-accent-gold text-xs font-semibold flex items-center gap-1">
                  <Star size={12} /> Pro Head Coach
                </span>
              </div>
            </div>

            <button type="button" onClick={() => setIsProfileOpen(true)} className="relative cursor-pointer">
              {coachAvatar ? (
                <img src={coachAvatar} alt={coachName} className="w-12 h-12 rounded-full object-cover border-2 border-accent-gold" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center border-2 border-accent-gold">
                  <span className="text-accent-gold text-sm font-heading font-bold">{coachName.slice(0, 2).toUpperCase()}</span>
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-accent-gold rounded-full border-2 border-bg-primary" />
            </button>
          </div>
        </ScrollReveal>

        <ProfileMenu
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          name={coachName}
          email={coachEmail}
          avatarUrl={coachAvatar}
          role="coach"
          onNameUpdated={setCoachName}
        />

        {/* Stats Grid */}
        <ScrollReveal delay={0.1}>
          <div className="grid grid-cols-2 gap-3">
            {isLoading || !stats ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="glass rounded-2xl h-24 skeleton-pulse" />
              ))
            ) : (
              <>
                <StatCard icon={Users} value={stats.activeClients} label="Active Clients" color="#FFB800" onClick={() => router.push("/clients")} />
                <StatCard icon={Clock} value={stats.pendingCheckins} label="Pending Check-ins" color="#FF6B6B" onClick={() => router.push("/submissions")} />
                <StatCard icon={AlertTriangle} value={stats.feesDue} label="Fees Due" color="#FFB800" onClick={() => router.push("/fees")} />
                <StatCard icon={IndianRupee} value={stats.monthRevenue} label="Month Revenue" color="#00CC66" prefix="₹" onClick={() => router.push("/fees")} />
              </>
            )}
          </div>
        </ScrollReveal>

        {/* Glowing SVG Revenue Line Chart */}
        <ScrollReveal delay={0.25}>
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-semibold text-sm text-text-primary">Revenue Trend</p>
                <p className="text-text-muted text-xs">Last 12 months performance</p>
              </div>
              <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                <TrendingUp size={12} /> +18% YoY
              </span>
            </div>

            <div className="relative h-36 w-full">
              <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFB800" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#FFB800" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {[0, 1, 2, 3].map((i) => (
                  <line
                    key={i}
                    x1="0"
                    y1={i * 50}
                    x2="400"
                    y2={i * 50}
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="1"
                  />
                ))}

                <path
                  d={`M ${revenueData
                    .map((v, i) => `${(i / (revenueData.length - 1)) * 400},${150 - (v / 100) * 140}`)
                    .join(" L ")} L 400,150 L 0,150 Z`}
                  fill="url(#goldGrad)"
                />

                <polyline
                  points={revenueData
                    .map((v, i) => `${(i / (revenueData.length - 1)) * 400},${150 - (v / 100) * 140}`)
                    .join(" ")}
                  fill="none"
                  stroke="#FFB800"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ filter: "drop-shadow(0 0 8px rgba(255,184,0,0.5))" }}
                />

                {revenueData.map((v, i) => (
                  <circle
                    key={i}
                    cx={(i / (revenueData.length - 1)) * 400}
                    cy={150 - (v / 100) * 140}
                    r="3.5"
                    fill="#FFB800"
                  />
                ))}
              </svg>
            </div>
          </GlassCard>
        </ScrollReveal>

        {/* Needs Attention Horizontal Scroll */}
        {!isLoading && attentionClients.length > 0 && (
          <ScrollReveal delay={0.3}>
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-heading font-semibold text-xs text-text-muted uppercase tracking-wider">
                  Needs Attention
                </h3>
                <span className="text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                  {attentionClients.length}
                </span>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {attentionClients.map((c) => {
                  const name = c.profile?.name ?? "Unknown"
                  const avatarUrl = c.profile?.avatar_url ?? null
                  return (
                    <GlassCard
                      key={c.id}
                      tilt
                      onClick={() => router.push(`/clients/${c.id}`)}
                      className="shrink-0 w-[150px] h-[180px] p-3 relative cursor-pointer group flex flex-col justify-between overflow-hidden"
                    >
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={name} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="absolute inset-0 bg-bg-elevated flex items-center justify-center">
                          <span className="text-accent-gold font-heading font-bold text-3xl">{initials(name)}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                      <div className="relative z-10 bg-accent-gold px-2 py-0.5 rounded-full text-[9px] font-bold text-bg-primary tracking-wide uppercase w-max">
                        {c.issue}
                      </div>

                      <div className="relative z-10">
                        <p className="font-heading font-bold text-xs leading-tight text-white">{name}</p>
                        {c.goal && <p className="text-[9px] text-white/70 font-medium mt-0.5 truncate">{c.goal}</p>}
                      </div>
                    </GlassCard>
                  )
                })}
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* Recent Check-ins */}
        <ScrollReveal delay={0.35}>
          <div className="space-y-3">
            <h3 className="font-heading font-semibold text-xs text-text-muted uppercase tracking-wider">
              Recent Check-ins
            </h3>

            {isLoading ? (
              <div className="glass rounded-2xl h-16 skeleton-pulse" />
            ) : recentCheckins.length === 0 ? (
              <GlassCard className="p-8 flex flex-col items-center gap-2 text-center">
                <Inbox className="size-8 text-text-muted/40" />
                <p className="text-text-muted text-xs font-medium">No check-ins yet</p>
              </GlassCard>
            ) : (
              recentCheckins.map((c) => {
                const score = avgAdherence(c)
                const progressPhoto = c.photos?.[0] ?? null
                return (
                  <GlassCard
                    key={c.id}
                    tilt
                    onClick={() => router.push(`/clients/${c.client_id}`)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={c.clientName} url={c.clientAvatar} />
                      <div className="min-w-0">
                        <h4 className="font-heading font-bold text-xs text-white truncate">{c.clientName}</h4>
                        <p className="text-[10px] text-text-muted font-medium mt-0.5">
                          Week {c.week_number ?? "?"} · {score !== null ? `${Math.round(score * 10)}% Adherence` : format(new Date(c.submitted_at), "d MMM")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {progressPhoto && (
                        <img src={progressPhoto} alt="Progress" className="w-9 h-9 rounded-lg object-cover border border-white/10" />
                      )}
                      <span className="w-2.5 h-2.5 rounded-full bg-accent-gold ring-4 ring-accent-gold/20" />
                    </div>
                  </GlassCard>
                )
              })
            )}
          </div>
        </ScrollReveal>

      </div>

      {/* FAB — Add Client */}
      <motion.button
        onClick={() => setIsModalOpen(true)}
        whileTap={{ scale: 0.85 }}
        aria-label="Add client"
        className="fixed bottom-24 right-5 w-14 h-14 bg-accent-gold text-bg-primary rounded-full flex items-center justify-center shadow-[0_0_24px_rgba(255,184,0,0.4)] cursor-pointer z-40"
      >
        <Plus className="w-6 h-6 stroke-[3]" />
      </motion.button>

      <AddClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          toast.success("Client added successfully!")
          setIsModalOpen(false)
          setIsLoading(true)
          fetchData()
        }}
      />
    </div>
  )
}
