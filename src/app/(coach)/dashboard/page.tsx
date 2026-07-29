"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { Plus, Inbox, AlertTriangle, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"
import AddClientModal from "@/components/coach/AddClientModal"
import ProfileMenu from "@/components/shared/ProfileMenu"
import KineticText from "@/components/ui/KineticText"
import ScrollReveal from "@/components/ui/ScrollReveal"
import { useCountUp } from "@/hooks/useCountUp"
import type { Checkin, ClientWithProfile } from "@/types"
import { SignedImage } from "@/components/shared/SignedImage"
import { isPhotoPathValue } from "@/components/forms/ConversationalFormComponents"

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
    return <img src={url} alt={name} className={`${size} rounded-full object-cover border-2 border-accent-orange`} />
  }
  return (
    <div className={`${size} rounded-full bg-bg-elevated flex items-center justify-center border-2 border-accent-orange flex-shrink-0`}>
      <span className="text-accent-orange text-xs font-heading font-bold">{initials(name)}</span>
    </div>
  )
}

function HeroStat({ value, label, onClick }: { value: number; label: string; onClick?: () => void }) {
  const count = useCountUp(value)
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-6 cursor-pointer transition-colors hover:bg-black/[0.02]"
    >
      <p className="font-heading text-[64px] leading-none text-[#181310] tabular-nums">
        {count}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <span className="h-px w-6 bg-accent-orange" />
        <p className="text-[#8A7F70] text-xs font-medium uppercase tracking-[0.18em]">{label}</p>
      </div>
    </button>
  )
}

function Ticket({ value, label, prefix, onClick }: {
  value: number; label: string; prefix?: string; onClick?: () => void
}) {
  const count = useCountUp(value)
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-4 cursor-pointer transition-colors hover:bg-black/[0.02] border-l border-[#181310]/[0.08] first:border-l-0"
    >
      <p className="font-heading text-2xl text-[#181310] tabular-nums">
        {prefix || ""}{count.toLocaleString("en-IN")}
      </p>
      <p className="text-[#8A7F70] text-[10px] mt-1 font-medium uppercase tracking-[0.14em]">{label}</p>
    </button>
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
        .select("*, client:clients(id, profile:profiles!user_id(name, avatar_url))")
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
      .select("id, profile:profiles!user_id(name, avatar_url)")
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
      <div className="ghost-bg" style={{ backgroundImage: "url(/images/backgrounds/ghost-dashboard.jpg)" }} />
      <div className="grain-overlay" />

      <div className="relative z-10 px-5 pt-8 pb-28 max-w-lg mx-auto space-y-6">

        {/* Top Header */}
        <ScrollReveal delay={0}>
          <div className="flex items-start justify-between border-b border-border-subtle pb-5">
            <div>
              <p className="text-text-muted text-[11px] font-medium uppercase tracking-[0.2em] mb-2">
                Coach Dashboard — {todayStr}
              </p>
              <KineticText
                text={coachName.split(" ")[0]}
                fontSize={56}
                delay={0.2}
                className="font-heading italic text-white"
              />
              <p className="text-text-muted text-xs font-medium mt-2 tracking-wide">
                Head Coach · {stats?.activeClients ?? 0} clients under care
              </p>
            </div>

            <button type="button" onClick={() => setIsProfileOpen(true)} className="relative cursor-pointer shrink-0">
              {coachAvatar ? (
                <img src={coachAvatar} alt={coachName} className="w-12 h-12 rounded-full object-cover border border-accent-orange/60" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center border border-accent-orange/60">
                  <span className="text-accent-orange text-sm font-heading font-bold">{coachName.slice(0, 2).toUpperCase()}</span>
                </div>
              )}
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

        {/* Stats — hero figure + ledger strip */}
        <ScrollReveal delay={0.1}>
          {isLoading || !stats ? (
            <div className="ledger h-52 skeleton-pulse rounded-2xl" />
          ) : (
            <div
              className="rounded-2xl overflow-hidden divide-y divide-[#181310]/[0.08]"
              style={{ background: "#F3EDE2", boxShadow: "0 24px 50px -20px rgba(0,0,0,0.5)" }}
            >
              <HeroStat value={stats.activeClients} label="Active Clients" onClick={() => router.push("/clients")} />
              <div className="grid grid-cols-3">
                <Ticket value={stats.pendingCheckins} label="Check-ins Due" onClick={() => router.push("/submissions")} />
                <Ticket value={stats.feesDue} label="Fees Due" onClick={() => router.push("/fees")} />
                <Ticket value={stats.monthRevenue} label="This Month" prefix="₹" onClick={() => router.push("/fees")} />
              </div>
            </div>
          )}
        </ScrollReveal>

        {/* Revenue Line Chart */}
        <ScrollReveal delay={0.25}>
          <div
            className="rounded-2xl p-5"
            style={{ background: "#F3EDE2", boxShadow: "0 24px 50px -20px rgba(0,0,0,0.5)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-heading italic text-lg text-[#181310]">Revenue Trend</p>
                <p className="text-[#8A7F70] text-[11px] uppercase tracking-[0.14em] mt-0.5">Last 12 months</p>
              </div>
              <span className="text-accent-orange text-xs font-bold">
                +{Math.round(((revenueData[revenueData.length - 1] - revenueData[0]) / revenueData[0]) * 100)}%
              </span>
            </div>

            <div className="relative h-36 w-full">
              <svg viewBox="0 0 400 150" className="w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="inkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#181310" stopOpacity="0.16" />
                    <stop offset="100%" stopColor="#181310" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {[0, 1, 2, 3].map((i) => (
                  <line
                    key={i}
                    x1="0"
                    y1={i * 50}
                    x2="400"
                    y2={i * 50}
                    stroke="rgba(24,19,16,0.08)"
                    strokeWidth="1"
                  />
                ))}

                <path
                  d={`M ${revenueData
                    .map((v, i) => `${(i / (revenueData.length - 1)) * 400},${150 - (v / 100) * 140}`)
                    .join(" L ")} L 400,150 L 0,150 Z`}
                  fill="url(#inkGrad)"
                />

                <polyline
                  points={revenueData
                    .map((v, i) => `${(i / (revenueData.length - 1)) * 400},${150 - (v / 100) * 140}`)
                    .join(" ")}
                  fill="none"
                  stroke="#181310"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {revenueData.map((v, i) => {
                  const isLast = i === revenueData.length - 1
                  return (
                    <circle
                      key={i}
                      cx={(i / (revenueData.length - 1)) * 400}
                      cy={150 - (v / 100) * 140}
                      r={isLast ? 5 : 2.5}
                      fill={isLast ? "#FF6A1A" : "#181310"}
                      style={isLast ? { filter: "drop-shadow(0 0 8px rgba(255,106,26,0.6))" } : undefined}
                    />
                  )
                })}
              </svg>
            </div>
          </div>
        </ScrollReveal>

        {/* Needs Attention Horizontal Scroll */}
        {!isLoading && attentionClients.length > 0 && (
          <ScrollReveal delay={0.3}>
            <div>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-text-muted text-[11px] font-medium uppercase tracking-[0.2em]">
                    Needs Attention
                  </h3>
                </div>
                <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500/15 border border-red-500/40 text-[10px] font-bold text-red-400">
                  {attentionClients.length}
                </span>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {attentionClients.map((c) => {
                  const name = c.profile?.name ?? "Unknown"
                  const avatarUrl = c.profile?.avatar_url ?? null
                  return (
                    <motion.button
                      type="button"
                      key={c.id}
                      whileHover={{ y: -3 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => router.push(`/clients/${c.id}`)}
                      className="shrink-0 w-[152px] h-[188px] relative cursor-pointer group flex flex-col justify-between overflow-hidden rounded-2xl border border-red-500/25 text-left shadow-[0_12px_28px_-12px_rgba(0,0,0,0.7)] transition-colors hover:border-red-500/50"
                    >
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={name} className="absolute inset-0 w-full h-full object-cover opacity-75 group-hover:scale-105 group-hover:opacity-90 transition-all duration-500" />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-bg-elevated to-black flex items-center justify-center">
                          <span className="text-accent-orange/80 font-heading text-4xl tracking-wide">{initials(name)}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/10" />
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-t from-red-950/30 via-transparent to-transparent" />

                      <div className="relative z-10 p-3">
                        <div className="inline-flex items-center gap-1 rounded-full bg-red-500/15 border border-red-500/40 backdrop-blur-sm px-2 py-1 text-[9px] font-bold text-red-300 tracking-[0.08em] uppercase w-max">
                          <AlertTriangle className="size-2.5 shrink-0" />
                          {c.issue}
                        </div>
                      </div>

                      <div className="relative z-10 p-3 flex items-end justify-between gap-1">
                        <div className="min-w-0">
                          <p className="font-heading text-sm leading-tight text-white truncate">{name}</p>
                          {c.goal && <p className="text-[9px] text-white/60 font-medium mt-0.5 truncate uppercase tracking-wide">{c.goal}</p>}
                        </div>
                        <ChevronRight className="size-3.5 text-white/50 shrink-0 group-hover:text-accent-orange group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* Recent Check-ins */}
        <ScrollReveal delay={0.35}>
          <div className="space-y-3">
            <h3 className="text-text-muted text-[11px] font-medium uppercase tracking-[0.2em]">
              Recent Check-ins
            </h3>

            {isLoading ? (
              <div className="ledger h-16 skeleton-pulse" />
            ) : recentCheckins.length === 0 ? (
              <div
                className="rounded-2xl p-8 flex flex-col items-center gap-2 text-center"
                style={{ background: "#F3EDE2", boxShadow: "0 24px 50px -20px rgba(0,0,0,0.5)" }}
              >
                <Inbox className="size-8 text-[#181310]/25" />
                <p className="text-[#8A7F70] text-xs font-medium">No check-ins yet</p>
              </div>
            ) : (
              <div
                className="rounded-2xl overflow-hidden divide-y divide-[#181310]/[0.08]"
                style={{ background: "#F3EDE2", boxShadow: "0 24px 50px -20px rgba(0,0,0,0.5)" }}
              >
                {recentCheckins.map((c) => {
                  const score = avgAdherence(c)
                  const progressPhoto = c.photos?.[0] ?? null
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => router.push(`/clients/${c.client_id}`)}
                      className="w-full p-4 flex items-center justify-between cursor-pointer hover:bg-black/[0.02] transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={c.clientName} url={c.clientAvatar} />
                        <div className="min-w-0">
                          <h4 className="font-heading text-sm text-[#181310] truncate">{c.clientName}</h4>
                          <p className="text-[10px] text-[#8A7F70] font-medium mt-0.5 uppercase tracking-wide">
                            Week {c.week_number ?? "?"} · {score !== null ? `${Math.round(score * 10)}% Adherence` : format(new Date(c.submitted_at), "d MMM")}
                          </p>
                        </div>
                      </div>
                      {progressPhoto && isPhotoPathValue(progressPhoto) && !progressPhoto.startsWith("data:") && (
                        <SignedImage path={progressPhoto} alt="Progress" className="w-9 h-9 rounded-md object-cover border border-[#181310]/10 flex-shrink-0" />
                      )}
                      {progressPhoto && progressPhoto.startsWith("data:") && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={progressPhoto} alt="Progress" className="w-9 h-9 rounded-md object-cover border border-[#181310]/10 flex-shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </ScrollReveal>

      </div>

      {/* FAB — Add Client */}
      <motion.button
        onClick={() => setIsModalOpen(true)}
        whileTap={{ scale: 0.85 }}
        aria-label="Add client"
        className="fixed bottom-24 right-5 w-14 h-14 bg-accent-orange text-bg-primary rounded-full flex items-center justify-center shadow-[0_0_24px_rgba(255, 106, 26,0.4)] cursor-pointer z-40"
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
