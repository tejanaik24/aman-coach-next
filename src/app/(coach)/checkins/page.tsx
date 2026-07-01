"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { ClipboardCheck, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import toast from "react-hot-toast"
import { cn } from "@/lib/utils"
import type { Checkin, Client, Profile } from "@/types"

type TabKey = "pending" | "reviewed"

interface CheckinWithClient extends Checkin {
  clientName: string
  clientId: string
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function scoreBadge(score: number | null): string {
  if (score === null) return "bg-[#222222] text-[#555555]"
  if (score >= 8) return "bg-green-500/15 text-green-400"
  if (score >= 5) return "bg-yellow-500/15 text-yellow-400"
  return "bg-red-500/15 text-red-400"
}

function ScoreChip({ label, value }: { label: string; value: number | null }) {
  return (
    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", scoreBadge(value))}>
      {label} {value !== null ? value : "—"}
    </span>
  )
}

function CheckinCardSkeleton() {
  return (
    <div className="bg-[#161616] border border-[#222222] rounded-2xl p-4 flex items-start gap-3 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-[#222222] flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="w-32 h-4 rounded bg-[#222222]" />
        <div className="w-24 h-3 rounded bg-[#222222]" />
        <div className="flex gap-1.5 mt-1">
          <div className="w-12 h-4 rounded-full bg-[#222222]" />
          <div className="w-12 h-4 rounded-full bg-[#222222]" />
          <div className="w-12 h-4 rounded-full bg-[#222222]" />
        </div>
      </div>
    </div>
  )
}

export default function CheckinsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [tab, setTab] = useState<TabKey>("pending")
  const [pending, setPending] = useState<CheckinWithClient[]>([])
  const [reviewed, setReviewed] = useState<CheckinWithClient[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      const coachId = userData.user.id

      // Step 1: Get all clients for this coach
      const { data: clientRows } = await supabase
        .from("clients")
        .select("id, user_id")
        .eq("coach_id", coachId)

      const clients = (clientRows as Pick<Client, "id" | "user_id">[] | null) ?? []
      if (clients.length === 0) {
        setPending([])
        setReviewed([])
        return
      }

      const clientIds = clients.map((c) => c.id)
      const userIds = clients.map((c) => c.user_id).filter((uid): uid is string => uid !== null)

      // Step 2: Build lookup maps
      const userIdByClientId = new Map<string, string>()
      for (const c of clients) {
        if (c.user_id) userIdByClientId.set(c.id, c.user_id)
      }

      // Step 3: Fetch profiles for client names
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", userIds)

      const profiles = (profileRows as Pick<Profile, "id" | "name">[] | null) ?? []
      const nameByUserId = new Map<string, string>()
      for (const p of profiles) {
        nameByUserId.set(p.id, p.name)
      }

      // Helper: resolve client name from client_id
      function resolveClientName(clientId: string): string {
        const uid = userIdByClientId.get(clientId)
        if (!uid) return "Unknown"
        return nameByUserId.get(uid) ?? "Unknown"
      }

      // Step 4: Fetch pending check-ins (reviewed_at IS NULL)
      const { data: pendingRows } = await supabase
        .from("checkins")
        .select("*")
        .in("client_id", clientIds)
        .is("reviewed_at", null)
        .order("submitted_at", { ascending: false })

      const pendingCheckins = (pendingRows as Checkin[] | null) ?? []
      setPending(
        pendingCheckins.map((c) => ({
          ...c,
          clientName: resolveClientName(c.client_id),
          clientId: c.client_id,
        }))
      )

      // Step 5: Fetch recently reviewed check-ins (limit 20)
      const { data: reviewedRows } = await supabase
        .from("checkins")
        .select("*")
        .in("client_id", clientIds)
        .not("reviewed_at", "is", null)
        .order("submitted_at", { ascending: false })
        .limit(20)

      const reviewedCheckins = (reviewedRows as Checkin[] | null) ?? []
      setReviewed(
        reviewedCheckins.map((c) => ({
          ...c,
          clientName: resolveClientName(c.client_id),
          clientId: c.client_id,
        }))
      )
    } catch {
      toast.error("Failed to load check-ins")
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const activeList = tab === "pending" ? pending : reviewed

  const tabs: { key: TabKey; label: string }[] = [
    { key: "pending", label: "Pending" },
    { key: "reviewed", label: "Reviewed" },
  ]

  return (
    <div className="p-4 space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <h1
          className="text-xl font-bold text-white"
          style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
        >
          Check-ins
        </h1>
        {!isLoading && pending.length > 0 && (
          <span className="text-xs font-semibold text-black bg-[#C9A84C] px-2 py-0.5 rounded-full">
            {pending.length}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 h-9 rounded-xl text-sm font-medium transition-colors",
              tab === t.key
                ? "bg-[#C9A84C]/15 text-[#C9A84C]"
                : "text-[#555555] hover:text-white"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <CheckinCardSkeleton key={i} />
          ))}
        </div>
      ) : activeList.length === 0 ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={tab + "-empty"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-[#161616] border border-[#222222] rounded-2xl py-16 flex flex-col items-center gap-4"
          >
            <ClipboardCheck className="size-12 text-[#333333]" />
            <div className="text-center">
              <p className="text-white font-semibold">
                {tab === "pending" ? "All caught up!" : "No reviewed check-ins"}
              </p>
              <p className="text-sm text-[#A0A0A0] mt-1">
                {tab === "pending"
                  ? "No pending check-ins"
                  : "Reviewed check-ins will appear here"}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {activeList.map((checkin, i) => {
              const initials = getInitials(checkin.clientName)
              const isReviewed = tab === "reviewed"

              return (
                <motion.div
                  key={checkin.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push(`/coach/clients/${checkin.clientId}`)}
                  className={cn(
                    "bg-[#161616] border border-[#222222] rounded-2xl p-4 flex items-start gap-3 cursor-pointer hover:bg-[#1A1A1A] transition-colors",
                    isReviewed && "opacity-60"
                  )}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-[#C9A84C] flex items-center justify-center flex-shrink-0">
                    <span className="text-black text-xs font-bold">{initials}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-sm truncate">
                          {checkin.clientName}
                        </p>
                        <p className="text-[#555555] text-xs mt-0.5">
                          Week {checkin.week_number ?? "?"} ·{" "}
                          {format(new Date(checkin.submitted_at), "d MMM yyyy")}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isReviewed ? (
                          <span className="text-xs text-[#555555]">
                            Reviewed {format(new Date(checkin.reviewed_at!), "d MMM")}
                          </span>
                        ) : (
                          <span className="text-[#C9A84C] text-xs font-medium">Review</span>
                        )}
                        <ChevronRight className="size-3.5 text-[#555555]" />
                      </div>
                    </div>

                    {/* Score chips */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <ScoreChip label="Energy" value={checkin.energy_level} />
                      <ScoreChip label="Sleep" value={checkin.sleep_quality} />
                      <ScoreChip label="Workout" value={checkin.adherence_workout} />
                      <ScoreChip label="Nutrition" value={checkin.adherence_nutrition} />
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}
