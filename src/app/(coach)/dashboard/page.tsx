"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { Plus, Inbox } from "lucide-react"
import { format } from "date-fns"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"
import AddClientModal from "@/components/coach/AddClientModal"
import ProfileMenu from "@/components/shared/ProfileMenu"
import { useStaggerReveal } from "@/hooks/useStaggerReveal"
import { useCountUp } from "@/hooks/useCountUp"
import type { Checkin, ClientWithProfile } from "@/types"

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

function StatSkeleton() {
  return <div className="bg-bg-card rounded-2xl h-[105px] skeleton-pulse" />
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

function StatCard({ value, label, accent = false }: { value: number; label: string; accent?: boolean }) {
  const numeric = useCountUp(value)
  return (
    <div
      className={`reveal-item p-4.5 rounded-2xl border h-[105px] flex flex-col justify-between backdrop-blur-xl ${
        accent
          ? "bg-accent-gold/10 border-accent-gold/40 shadow-[0_0_24px_rgba(255,184,0,0.15)]"
          : "bg-bg-card/80 border-border-subtle"
      }`}
    >
      <span className={`font-heading font-bold text-3xl ${accent ? "text-accent-gold" : "text-text-primary"}`}>
        {numeric}
      </span>
      <span className={`text-[11px] font-bold tracking-tight leading-tight ${accent ? "text-accent-gold/80" : "text-text-muted"}`}>
        {label}
      </span>
    </div>
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

  const statsGridRef = useStaggerReveal<HTMLDivElement>([isLoading])

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

  const revenueLabel = (v: number) => (v >= 1000 ? `₹${(v / 1000).toFixed(1)}k` : `₹${v}`)

  return (
    <div className="relative px-5 pt-2 flex flex-col gap-6 pb-8 bg-bg-primary min-h-full overflow-hidden">
      {/* Ambient hero backdrop */}
      <div className="absolute inset-x-0 top-0 h-64 -z-10 overflow-hidden">
        <img src="/images/aman/aman-02.jpeg" alt="" className="w-full h-full object-cover opacity-25 blur-sm" />
        <div className="absolute inset-0 bg-gradient-to-b from-bg-primary/60 via-bg-primary/85 to-bg-primary" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <span className="text-[11px] font-bold text-text-muted uppercase tracking-widest">
            {todayStr}
          </span>
          <h2 className="font-heading font-bold text-2xl text-text-primary leading-tight mt-0.5">
            {getGreeting()}, {coachName.split(" ")[0]}
          </h2>
        </div>
        <button type="button" onClick={() => setIsProfileOpen(true)} aria-label="Open profile" className="relative cursor-pointer">
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

      <ProfileMenu
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        name={coachName}
        email={coachEmail}
        avatarUrl={coachAvatar}
        role="coach"
        onNameUpdated={setCoachName}
      />

      {/* Bento Stats Grid */}
      <div ref={statsGridRef} className="grid grid-cols-2 gap-3.5 select-none">
        {isLoading || !stats ? (
          Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <StatCard value={stats.activeClients} label="Active Clients" />
            <StatCard value={stats.pendingCheckins} label="Pending Check-ins" />
            <StatCard value={stats.feesDue} label="Fees Due" />
            <div
              className="reveal-item p-4.5 rounded-2xl bg-accent-gold/10 border border-accent-gold/40 shadow-[0_0_24px_rgba(255,184,0,0.15)] backdrop-blur-xl flex flex-col justify-between h-[105px] cursor-pointer"
              onClick={() => router.push("/fees")}
            >
              <span className="font-heading font-bold text-3xl text-accent-gold">
                {revenueLabel(stats.monthRevenue)}
              </span>
              <span className="text-[11px] font-bold text-accent-gold/80 tracking-tight leading-tight">
                This Month
              </span>
            </div>
          </>
        )}
      </div>

      {/* Needs Attention Horizontal Scroll */}
      {!isLoading && attentionClients.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-3 px-1">
            <h3 className="font-heading font-bold text-xs text-text-primary uppercase tracking-widest">
              Needs Attention
            </h3>
            <span className="text-[10px] font-bold text-text-muted uppercase">
              {attentionClients.length} Client{attentionClients.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 snap-x select-none">
            {attentionClients.map((c) => {
              const name = c.profile?.name ?? "Unknown"
              const avatarUrl = c.profile?.avatar_url ?? null
              return (
                <div
                  key={c.id}
                  onClick={() => router.push(`/clients/${c.id}`)}
                  className="snap-start shrink-0 w-[145px] relative rounded-2xl overflow-hidden h-[180px] border border-border-subtle cursor-pointer group"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-bg-elevated flex items-center justify-center">
                      <span className="text-accent-gold font-heading font-bold text-3xl">{initials(name)}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                  <div className="absolute top-2.5 left-2.5 bg-accent-gold px-2.5 py-1 rounded-full text-[9px] font-bold text-bg-primary tracking-wide uppercase">
                    {c.issue}
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <p className="font-heading font-bold text-xs leading-tight">{name}</p>
                    {c.goal && <p className="text-[9px] text-white/70 font-medium mt-0.5">{c.goal}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent Check-ins */}
      <div className="flex flex-col gap-3">
        <h3 className="font-heading font-bold text-xs text-text-primary uppercase tracking-widest mb-1 px-1">
          Recent Check-ins
        </h3>

        {isLoading ? (
          <div className="bg-bg-card rounded-2xl h-16 skeleton-pulse" />
        ) : recentCheckins.length === 0 ? (
          <div className="bg-bg-card/80 border border-border-subtle rounded-2xl p-8 flex flex-col items-center gap-2 backdrop-blur-xl">
            <Inbox className="size-8 text-text-muted/50" />
            <p className="text-text-muted text-xs font-medium">No check-ins yet</p>
          </div>
        ) : (
          recentCheckins.map((c) => {
            const score = avgAdherence(c)
            const progressPhoto = c.photos?.[0] ?? null
            return (
              <div
                key={c.id}
                onClick={() => router.push(`/clients/${c.client_id}`)}
                className="bg-bg-card/80 border border-border-subtle backdrop-blur-xl rounded-2xl p-4 flex items-center justify-between hover:border-accent-gold/40 transition-colors duration-200 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={c.clientName} url={c.clientAvatar} />
                  <div className="min-w-0">
                    <h4 className="font-heading font-bold text-xs text-text-primary truncate">{c.clientName}</h4>
                    <p className="text-[10px] text-text-muted font-medium mt-0.5">
                      Week {c.week_number ?? "?"} · {score !== null ? `${Math.round(score * 10)}% Adherence` : format(new Date(c.submitted_at), "d MMM")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {progressPhoto && (
                    <img src={progressPhoto} alt="Progress" className="w-9 h-9 rounded-lg object-cover" />
                  )}
                  <span className="w-2.5 h-2.5 rounded-full bg-accent-gold ring-4 ring-accent-gold/15" />
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* FAB — opens Add Client modal */}
      <motion.button
        onClick={() => setIsModalOpen(true)}
        whileTap={{ scale: 0.85 }}
        aria-label="Add client"
        className="fixed bottom-24 right-5 w-14 h-14 bg-accent-gold text-bg-primary rounded-full flex items-center justify-center shadow-[0_0_24px_rgba(255,184,0,0.35)] cursor-pointer z-40"
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
