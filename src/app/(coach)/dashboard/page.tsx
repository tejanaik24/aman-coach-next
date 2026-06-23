"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import {
  Users,
  ClipboardCheck,
  IndianRupee,
  TrendingUp,
  Plus,
  Inbox,
  AlertCircle,
} from "lucide-react"
import { format } from "date-fns"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"
import AddClientModal from "@/components/coach/AddClientModal"
import { cn } from "@/lib/utils"
import type { Checkin, Client, ClientWithProfile, Profile } from "@/types"

interface Stats {
  activeClients: number
  pendingCheckins: number
  feesDue: number
  monthRevenue: number
}

type RecentCheckin = Checkin & { clientName: string }
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

function adherenceBadgeClass(score: number | null): string {
  if (!score) return "bg-[#222222] text-[#555555]"
  if (score >= 8) return "bg-green-500/15 text-green-400"
  if (score >= 5) return "bg-yellow-500/15 text-yellow-400"
  return "bg-red-500/15 text-red-400"
}

function StatSkeleton() {
  return (
    <div className="bg-[#161616] border border-[#222222] rounded-2xl p-4 space-y-3 animate-pulse">
      <div className="w-5 h-5 rounded bg-[#222222]" />
      <div className="w-14 h-7 rounded bg-[#222222]" />
      <div className="w-24 h-3 rounded bg-[#222222]" />
    </div>
  )
}

function CheckinRowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3 animate-pulse">
      <div className="w-9 h-9 rounded-full bg-[#222222] flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="w-32 h-3.5 rounded bg-[#222222]" />
        <div className="w-20 h-3 rounded bg-[#222222]" />
      </div>
      <div className="w-12 h-5 rounded-full bg-[#222222]" />
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

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: rawClients } = await supabase
      .from("clients")
      .select("*")
      .eq("coach_id", user.id)

    const clients = (rawClients ?? []) as Client[]
    const clientIds = clients.map((c) => c.id)
    const activeClients = clients.filter((c) => c.status === "active").length
    const userIds = clients.map((c) => c.user_id).filter(Boolean) as string[]

    if (clientIds.length === 0) {
      setStats({ activeClients: 0, pendingCheckins: 0, feesDue: 0, monthRevenue: 0 })
      setRecentCheckins([])
      setAttentionClients([])
      setIsLoading(false)
      return
    }

    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const firstOfMonth = new Date()
    firstOfMonth.setDate(1)
    firstOfMonth.setHours(0, 0, 0, 0)

    const [r1, r2, r3, r4, r5, r6, r7] = await Promise.allSettled([
      // pending check-ins
      supabase
        .from("checkins")
        .select("*", { count: "exact", head: true })
        .in("client_id", clientIds)
        .is("reviewed_at", null)
        .gte("submitted_at", weekAgo.toISOString()),
      // fees due
      supabase
        .from("fees")
        .select("*", { count: "exact", head: true })
        .in("client_id", clientIds)
        .in("status", ["pending", "overdue"]),
      // month revenue
      supabase
        .from("fees")
        .select("amount")
        .in("client_id", clientIds)
        .eq("status", "paid")
        .gte("paid_date", firstOfMonth.toISOString().split("T")[0]),
      // recent check-ins
      supabase
        .from("checkins")
        .select("*")
        .in("client_id", clientIds)
        .order("submitted_at", { ascending: false })
        .limit(5),
      // profiles for name lookup
      supabase.from("profiles").select("id, name").in("id", userIds),
      // overdue fees (for attention)
      supabase
        .from("fees")
        .select("client_id")
        .in("client_id", clientIds)
        .eq("status", "overdue"),
      // recent check-ins by client (for attention)
      supabase
        .from("checkins")
        .select("client_id")
        .in("client_id", clientIds)
        .gte("submitted_at", weekAgo.toISOString()),
    ])

    const pendingCheckins = r1.status === "fulfilled" ? (r1.value.count ?? 0) : 0
    const feesDue = r2.status === "fulfilled" ? (r2.value.count ?? 0) : 0
    const monthRevenue =
      r3.status === "fulfilled"
        ? ((r3.value.data ?? []) as { amount: number }[]).reduce((s, f) => s + Number(f.amount), 0)
        : 0

    setStats({ activeClients, pendingCheckins, feesDue, monthRevenue })

    const checkinsData = (r4.status === "fulfilled" ? (r4.value.data ?? []) : []) as Checkin[]
    const profilesData = (r5.status === "fulfilled" ? (r5.value.data ?? []) : []) as Pick<Profile, "id" | "name">[]
    const profileMap = new Map(profilesData.map((p) => [p.id, p.name]))
    const clientToUser = new Map(clients.map((c) => [c.id, c.user_id]))

    setRecentCheckins(
      checkinsData.map((c) => ({
        ...c,
        clientName:
          profileMap.get(clientToUser.get(c.client_id) ?? "") ?? "Unknown",
      }))
    )

    const overdueIds = new Set(
      ((r6.status === "fulfilled" ? r6.value.data : []) as { client_id: string }[] ?? []).map((f) => f.client_id)
    )
    const recentCheckinIds = new Set(
      ((r7.status === "fulfilled" ? r7.value.data : []) as { client_id: string }[] ?? []).map((c) => c.client_id)
    )

    const attention: AttentionClient[] = (clients ?? [])
      .filter((c) => {
        if (c.status !== "active") return false
        return overdueIds.has(c.id) || !recentCheckinIds.has(c.id)
      })
      .map((c) => {
        const issues: string[] = []
        if (overdueIds.has(c.id)) issues.push("Fee overdue")
        if (!recentCheckinIds.has(c.id)) issues.push("No check-in")
        const name = profileMap.get(c.user_id ?? "") ?? "Unknown"
        return {
          ...c,
          profile: { id: c.user_id ?? "", name, phone: null, avatar_url: null, role: "client" as const, created_at: "", updated_at: "" },
          issue: issues.join(" · "),
        }
      })
      .slice(0, 5)

    setAttentionClients(attention)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const statsConfig = [
    { label: "Active Clients", value: stats?.activeClients ?? 0, icon: Users, format: (v: number) => v.toString() },
    { label: "Pending Check-ins", value: stats?.pendingCheckins ?? 0, icon: ClipboardCheck, format: (v: number) => v.toString() },
    { label: "Fees Due", value: stats?.feesDue ?? 0, icon: IndianRupee, format: (v: number) => v.toString() },
    {
      label: "This Month",
      value: stats?.monthRevenue ?? 0,
      icon: TrendingUp,
      format: (v: number) =>
        v >= 1000
          ? `₹${(v / 1000).toFixed(1)}k`
          : `₹${v}`,
    },
  ]

  return (
    <div className="p-4 space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between pt-2">
        <div>
          <h1
            className="text-xl font-bold text-white"
            style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
          >
            {getGreeting()}, Aman
          </h1>
          <p className="text-sm text-[#A0A0A0] mt-0.5">
            {format(new Date(), "EEEE, d MMMM yyyy")}
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-[#C9A84C] flex items-center justify-center flex-shrink-0">
          <span className="text-black text-sm font-bold">AK</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
          : statsConfig.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="bg-[#161616] border border-[#222222] rounded-2xl p-4 space-y-2"
              >
                <s.icon className="size-5 text-[#C9A84C]" />
                <p className="text-2xl font-bold text-white">{s.format(s.value)}</p>
                <p className="text-xs text-[#A0A0A0]">{s.label}</p>
              </motion.div>
            ))}
      </div>

      {/* Recent check-ins */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold">Recent Check-ins</h2>
          <button
            onClick={() => router.push("/coach/clients")}
            className="text-[#C9A84C] text-sm font-medium"
          >
            See all
          </button>
        </div>
        <div className="bg-[#161616] border border-[#222222] rounded-2xl divide-y divide-[#1E1E1E]">
          {isLoading ? (
            <div className="px-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <CheckinRowSkeleton key={i} />
              ))}
            </div>
          ) : recentCheckins.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-3">
              <Inbox className="size-10 text-[#333333]" />
              <p className="text-[#A0A0A0] text-sm">No check-ins yet</p>
            </div>
          ) : (
            recentCheckins.map((c, i) => {
              const score = avgAdherence(c)
              return (
                <motion.button
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => router.push(`/coach/clients/${c.client_id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#1A1A1A] transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-[#C9A84C]/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-[#C9A84C] text-xs font-bold">
                      {c.clientName.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {c.clientName}
                    </p>
                    <p className="text-[#555555] text-xs mt-0.5">
                      Week {c.week_number ?? "?"} ·{" "}
                      {format(new Date(c.submitted_at), "d MMM")}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0",
                      adherenceBadgeClass(score)
                    )}
                  >
                    {score !== null ? `${Math.round(score)}/10` : "—"}
                  </span>
                </motion.button>
              )
            })
          )}
        </div>
      </div>

      {/* Needs attention */}
      {!isLoading && attentionClients.length > 0 && (
        <div>
          <h2 className="text-white font-semibold mb-3">Needs Attention</h2>
          <div className="space-y-2">
            {attentionClients.map((c, i) => (
              <motion.button
                key={c.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => router.push(`/coach/clients/${c.id}`)}
                className="w-full bg-[#161616] border border-[#222222] rounded-2xl p-4 flex items-center gap-3 text-left hover:bg-[#1A1A1A] transition-colors"
              >
                <AlertCircle className="size-4 text-yellow-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {c.profile?.name ?? "Unknown"}
                  </p>
                </div>
                <span className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full flex-shrink-0">
                  {c.issue}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-[#C9A84C] text-black flex items-center justify-center shadow-lg z-40"
        aria-label="Add client"
      >
        <Plus className="size-6" />
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
