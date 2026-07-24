"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, animate } from "motion/react"
import { Plus, Inbox } from "lucide-react"
import { format } from "date-fns"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"
import AddClientModal from "@/components/coach/AddClientModal"
import ProfileMenu from "@/components/shared/ProfileMenu"
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

function StatSkeleton() {
  return (
    <div className="bg-white p-4.5 rounded-card-mobile shadow-bento h-[105px] animate-pulse" />
  )
}

function Avatar({ name, url, size = "w-10 h-10" }: { name: string; url: string | null; size?: string }) {
  if (url) {
    return <img src={url} alt={name} className={`${size} rounded-full object-cover border-2 border-lime-electric`} />
  }
  return (
    <div className={`${size} rounded-full bg-charcoal-deep flex items-center justify-center border-2 border-lime-electric flex-shrink-0`}>
      <span className="text-lime-electric text-xs font-montserrat font-bold">{initials(name)}</span>
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
    <div className="px-5 pt-2 flex flex-col gap-6 relative pb-8 bg-cream min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold text-charcoal-muted uppercase tracking-widest">
            {todayStr}
          </span>
          <h2 className="font-montserrat font-black text-2xl text-charcoal-deep leading-tight mt-0.5">
            {getGreeting()}, {coachName.split(" ")[0]}
          </h2>
        </div>
        <button type="button" onClick={() => setIsProfileOpen(true)} aria-label="Open profile" className="relative cursor-pointer">
          {coachAvatar ? (
            <img src={coachAvatar} alt={coachName} className="w-12 h-12 rounded-full object-cover border-2 border-lime-electric shadow-md" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-charcoal-deep flex items-center justify-center border-2 border-lime-electric shadow-md">
              <span className="text-lime-electric text-sm font-montserrat font-bold">{coachName.slice(0, 2).toUpperCase()}</span>
            </div>
          )}
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-lime-electric rounded-full border-2 border-white" />
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
      <div className="grid grid-cols-2 gap-3.5 select-none">
        {isLoading || !stats ? (
          Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <div className="bg-white p-4.5 rounded-card-mobile shadow-bento flex flex-col justify-between h-[105px]">
              <span className="font-montserrat font-black text-3xl text-charcoal-deep">
                <Counter to={stats.activeClients} />
              </span>
              <span className="text-[11px] font-bold text-charcoal-muted tracking-tight leading-tight">
                Active Clients
              </span>
            </div>

            <div className="bg-white p-4.5 rounded-card-mobile shadow-bento flex flex-col justify-between h-[105px]">
              <span className="font-montserrat font-black text-3xl text-charcoal-deep">
                <Counter to={stats.pendingCheckins} />
              </span>
              <span className="text-[11px] font-bold text-charcoal-muted tracking-tight leading-tight">
                Pending Check-ins
              </span>
            </div>

            <div className="bg-white p-4.5 rounded-card-mobile shadow-bento flex flex-col justify-between h-[105px]">
              <span className="font-montserrat font-black text-3xl text-charcoal-deep">
                <Counter to={stats.feesDue} />
              </span>
              <span className="text-[11px] font-bold text-charcoal-muted tracking-tight leading-tight">
                Fees Due
              </span>
            </div>

            <div
              className="bg-lime-electric p-4.5 rounded-card-mobile shadow-bento flex flex-col justify-between h-[105px] cursor-pointer"
              onClick={() => router.push("/fees")}
            >
              <span className="font-montserrat font-black text-3xl text-charcoal-deep">
                {revenueLabel(stats.monthRevenue)}
              </span>
              <span className="text-[11px] font-bold text-charcoal-deep tracking-tight leading-tight">
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
            <h3 className="font-montserrat font-bold text-xs text-charcoal-deep uppercase tracking-widest">
              Needs Attention
            </h3>
            <span className="text-[10px] font-bold text-charcoal-muted uppercase">
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
                  className="snap-start shrink-0 w-[145px] relative rounded-card-mobile overflow-hidden h-[180px] shadow-bento cursor-pointer group"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-charcoal-deep flex items-center justify-center">
                      <span className="text-lime-electric font-montserrat font-black text-3xl">{initials(name)}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal-deep/90 via-charcoal-deep/30 to-transparent" />

                  <div className="absolute top-2.5 left-2.5 bg-lime-electric px-2.5 py-1 rounded-full text-[9px] font-bold text-charcoal-deep tracking-wide uppercase shadow">
                    {c.issue}
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <p className="font-montserrat font-bold text-xs leading-tight">{name}</p>
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
        <h3 className="font-montserrat font-bold text-xs text-charcoal-deep uppercase tracking-widest mb-1 px-1">
          Recent Check-ins
        </h3>

        {isLoading ? (
          <div className="bg-white rounded-card-mobile p-4 shadow-bento h-16 animate-pulse" />
        ) : recentCheckins.length === 0 ? (
          <div className="bg-white rounded-card-mobile p-8 shadow-bento flex flex-col items-center gap-2">
            <Inbox className="size-8 text-charcoal-muted/40" />
            <p className="text-charcoal-muted text-xs font-medium">No check-ins yet</p>
          </div>
        ) : (
          recentCheckins.map((c) => {
            const score = avgAdherence(c)
            const progressPhoto = c.photos?.[0] ?? null
            return (
              <div
                key={c.id}
                onClick={() => router.push(`/clients/${c.client_id}`)}
                className="bg-white rounded-card-mobile p-4 shadow-bento flex items-center justify-between hover:scale-[1.01] transition-transform duration-200 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={c.clientName} url={c.clientAvatar} />
                  <div className="min-w-0">
                    <h4 className="font-montserrat font-bold text-xs text-charcoal-deep truncate">{c.clientName}</h4>
                    <p className="text-[10px] text-charcoal-muted font-medium mt-0.5">
                      Week {c.week_number ?? "?"} · {score !== null ? `${Math.round(score * 10)}% Adherence` : format(new Date(c.submitted_at), "d MMM")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {progressPhoto && (
                    <img src={progressPhoto} alt="Progress" className="w-9 h-9 rounded-lg object-cover shadow-sm" />
                  )}
                  <span className="w-2.5 h-2.5 rounded-full bg-lime-electric ring-4 ring-lime-tint" />
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
        className="fixed bottom-24 right-5 w-14 h-14 bg-lime-electric text-charcoal-deep rounded-full flex items-center justify-center shadow-lg border border-white/20 cursor-pointer z-40"
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
