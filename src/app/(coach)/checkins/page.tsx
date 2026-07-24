"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { ClipboardCheck, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import toast from "react-hot-toast"
import type { Checkin, Client, Profile } from "@/types"

type TabKey = "pending" | "reviewed"

interface CheckinWithClient extends Checkin {
  clientName: string
  clientId: string
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
}

function CheckinCardSkeleton() {
  return <div className="bg-bg-card rounded-2xl h-24 skeleton-pulse" />
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

      const { data: clientRows } = await supabase.from("clients").select("id, user_id").eq("coach_id", coachId)
      const clients = (clientRows as Pick<Client, "id" | "user_id">[] | null) ?? []
      if (clients.length === 0) { setPending([]); setReviewed([]); return }

      const clientIds = clients.map((c) => c.id)
      const userIds = clients.map((c) => c.user_id).filter((uid): uid is string => uid !== null)

      const userIdByClientId = new Map<string, string>()
      for (const c of clients) if (c.user_id) userIdByClientId.set(c.id, c.user_id)

      const { data: profileRows } = await supabase.from("profiles").select("id, name").in("id", userIds)
      const profiles = (profileRows as Pick<Profile, "id" | "name">[] | null) ?? []
      const nameByUserId = new Map<string, string>()
      for (const p of profiles) nameByUserId.set(p.id, p.name)

      function resolveClientName(clientId: string): string {
        const uid = userIdByClientId.get(clientId)
        if (!uid) return "Unknown"
        return nameByUserId.get(uid) ?? "Unknown"
      }

      const { data: pendingRows } = await supabase
        .from("checkins")
        .select("*")
        .in("client_id", clientIds)
        .is("reviewed_at", null)
        .order("submitted_at", { ascending: false })

      setPending(((pendingRows as Checkin[] | null) ?? []).map((c) => ({ ...c, clientName: resolveClientName(c.client_id), clientId: c.client_id })))

      const { data: reviewedRows } = await supabase
        .from("checkins")
        .select("*")
        .in("client_id", clientIds)
        .not("reviewed_at", "is", null)
        .order("submitted_at", { ascending: false })
        .limit(20)

      setReviewed(((reviewedRows as Checkin[] | null) ?? []).map((c) => ({ ...c, clientName: resolveClientName(c.client_id), clientId: c.client_id })))
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
    <div className="px-5 pt-2 space-y-5 pb-8 bg-bg-primary min-h-full">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h2 className="font-heading font-bold text-xl text-text-primary tracking-tight">
          Check-in Queue
        </h2>
        {!isLoading && pending.length > 0 && (
          <span className="text-[10px] font-bold text-bg-primary bg-accent-gold px-2 py-0.5 rounded-full">{pending.length}</span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-bg-elevated p-1 rounded-full border border-border-subtle select-none">
        {tabs.map((t) => {
          const isSelected = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 h-9 rounded-full text-xs font-heading font-bold uppercase tracking-wide transition-colors cursor-pointer ${
                isSelected ? "bg-accent-gold text-bg-primary" : "text-text-muted"
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <CheckinCardSkeleton key={i} />)}
        </div>
      ) : activeList.length === 0 ? (
        <div className="bg-bg-card/80 border border-border-subtle backdrop-blur-xl rounded-2xl py-16 flex flex-col items-center gap-4">
          <ClipboardCheck className="size-12 text-text-muted/40" />
          <div className="text-center">
            <p className="text-text-primary font-heading font-bold">
              {tab === "pending" ? "All caught up!" : "No reviewed check-ins"}
            </p>
            <p className="text-sm text-text-muted mt-1">
              {tab === "pending" ? "No pending check-ins" : "Reviewed check-ins will appear here"}
            </p>
          </div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            {activeList.map((checkin) => {
              const initials = getInitials(checkin.clientName)
              const isReviewed = tab === "reviewed"
              const avgScore =
                [checkin.adherence_workout, checkin.adherence_nutrition].filter((v): v is number => v !== null).reduce((a, b, _, arr) => a + b / arr.length, 0) || null

              return (
                <motion.div
                  key={checkin.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push(`/clients/${checkin.clientId}`)}
                  className={`bg-bg-card/80 border border-border-subtle backdrop-blur-xl rounded-2xl p-4 flex items-start gap-3 cursor-pointer ${isReviewed ? "opacity-70" : ""}`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-bg-elevated flex items-center justify-center border border-accent-gold/30">
                      <span className="text-accent-gold text-xs font-heading font-bold">{initials}</span>
                    </div>
                    {!isReviewed && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-accent-gold border-2 border-bg-card" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-text-primary font-heading font-bold text-xs truncate">{checkin.clientName}</p>
                        <p className="text-text-muted text-[10px] mt-0.5">
                          Week {checkin.week_number ?? "?"} · {format(new Date(checkin.submitted_at), "d MMM yyyy")}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isReviewed ? (
                          <span className="text-[9px] text-text-muted font-bold">Reviewed {format(new Date(checkin.reviewed_at!), "d MMM")}</span>
                        ) : (
                          <span className="text-[9px] text-bg-primary bg-accent-gold px-2 py-0.5 rounded-full font-bold uppercase">Review</span>
                        )}
                        <ChevronRight className="size-3.5 text-text-muted" />
                      </div>
                    </div>

                    {avgScore !== null && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <div className="h-1.5 flex-1 bg-bg-elevated rounded-full overflow-hidden max-w-[100px]">
                          <div className="h-full rounded-full bg-accent-gold" style={{ width: `${(avgScore / 10) * 100}%` }} />
                        </div>
                        <span className="text-[9px] font-bold text-text-muted">{Math.round(avgScore)}/10</span>
                      </div>
                    )}
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
