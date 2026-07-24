"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "motion/react"
import { IndianRupee, Bell } from "lucide-react"
import { format } from "date-fns"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"
import { useStaggerReveal } from "@/hooks/useStaggerReveal"
import { useCountUp } from "@/hooks/useCountUp"
import type { Fee, Client, Profile } from "@/types"

interface FeeWithClient extends Fee {
  clientName: string
  clientAvatar: string | null
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
}

function statusBadge(status: string): string {
  if (status === "paid") return "bg-accent-gold/15 border border-accent-gold/30 text-accent-gold"
  if (status === "overdue") return "bg-danger/10 border border-danger/30 text-danger"
  return "bg-bg-elevated text-text-muted"
}

function FeeSkeleton() {
  return <div className="bg-bg-card rounded-2xl h-20 skeleton-pulse" />
}

function RevenueStat({ label, value, tone }: { label: string; value: number; tone: "gold" | "danger" | "muted" }) {
  const count = useCountUp(value)
  const toneClass = tone === "gold" ? "text-accent-gold" : tone === "danger" ? "text-danger" : "text-text-primary"
  const labelClass = tone === "danger" ? "text-danger" : "text-text-muted"
  return (
    <div className="reveal-item bg-bg-card/80 border border-border-subtle backdrop-blur-xl p-3.5 rounded-2xl flex flex-col justify-between h-[85px]">
      <span className={`text-[9px] font-bold uppercase ${labelClass}`}>{label}</span>
      <span className={`font-heading font-bold text-lg ${toneClass}`}>₹{count.toLocaleString("en-IN")}</span>
    </div>
  )
}

export default function FeesPage() {
  const supabase = createClient()
  const [fees, setFees] = useState<FeeWithClient[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const statsRef = useStaggerReveal<HTMLDivElement>([isLoading])
  const listRef = useStaggerReveal<HTMLDivElement>([isLoading])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return
      const coachId = userData.user.id

      const { data: clientRows } = await supabase.from("clients").select("id, user_id").eq("coach_id", coachId)
      const clients = (clientRows as Pick<Client, "id" | "user_id">[] | null) ?? []
      if (clients.length === 0) { setFees([]); return }

      const clientIds = clients.map((c) => c.id)
      const userIds = clients.map((c) => c.user_id).filter((uid): uid is string => uid !== null)

      const userIdByClientId = new Map<string, string>()
      for (const c of clients) if (c.user_id) userIdByClientId.set(c.id, c.user_id)

      const { data: profileRows } = await supabase.from("profiles").select("id, name, avatar_url").in("id", userIds)
      const profiles = (profileRows as Pick<Profile, "id" | "name" | "avatar_url">[] | null) ?? []
      const profileByUserId = new Map(profiles.map((p) => [p.id, p]))

      function resolveClient(clientId: string): { name: string; avatar: string | null } {
        const uid = userIdByClientId.get(clientId)
        const p = uid ? profileByUserId.get(uid) : undefined
        return { name: p?.name ?? "Unknown", avatar: p?.avatar_url ?? null }
      }

      const { data: feeRows } = await supabase
        .from("fees")
        .select("*")
        .in("client_id", clientIds)
        .order("due_date", { ascending: true })

      const mapped = ((feeRows as Fee[] | null) ?? []).map((f) => {
        const c = resolveClient(f.client_id)
        return { ...f, clientName: c.name, clientAvatar: c.avatar }
      })
      setFees(mapped)
    } catch {
      toast.error("Failed to load fees")
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleMarkPaid(feeId: string) {
    const paidDate = new Date().toISOString().split("T")[0]
    const { error } = await supabase.from("fees").update({ status: "paid", paid_date: paidDate }).eq("id", feeId)
    if (error) { toast.error("Failed to update fee"); return }
    setFees((prev) => prev.map((f) => (f.id === feeId ? { ...f, status: "paid" as const, paid_date: paidDate } : f)))
    toast.success("Marked as paid")
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const revenue = fees.filter((f) => f.status === "paid" && f.paid_date && new Date(f.paid_date) >= monthStart).reduce((s, f) => s + Number(f.amount), 0)
  const overdue = fees.filter((f) => f.status === "overdue").reduce((s, f) => s + Number(f.amount), 0)
  const pending = fees.filter((f) => f.status === "pending").reduce((s, f) => s + Number(f.amount), 0)
  const remindableCount = fees.filter((f) => f.status === "pending" || f.status === "overdue").length

  return (
    <div className="px-5 pt-2 space-y-5 pb-8 bg-bg-primary min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-bold text-xl text-text-primary tracking-tight">
          Fees Ledger
        </h2>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => toast(remindableCount > 0 ? "WhatsApp reminders coming soon" : "No pending fees to remind")}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-accent-gold text-bg-primary text-[10px] font-heading font-bold uppercase tracking-wide cursor-pointer"
        >
          <Bell className="size-3" />
          Remind All
        </motion.button>
      </div>

      {/* Summary bento */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-2.5">
          {Array.from({ length: 3 }).map((_, i) => <FeeSkeleton key={i} />)}
        </div>
      ) : (
        <div ref={statsRef} className="grid grid-cols-3 gap-2.5 select-none">
          <RevenueStat label="Revenue" value={revenue} tone="gold" />
          <RevenueStat label="Overdue" value={overdue} tone="danger" />
          <RevenueStat label="Pending" value={pending} tone="muted" />
        </div>
      )}

      <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider -mb-2">Ledger</p>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <FeeSkeleton key={i} />)}
        </div>
      ) : fees.length === 0 ? (
        <div className="bg-bg-card/80 border border-border-subtle backdrop-blur-xl rounded-2xl py-16 flex flex-col items-center gap-4">
          <IndianRupee className="size-12 text-text-muted/40" />
          <div className="text-center">
            <p className="text-text-primary font-heading font-bold">No fees recorded</p>
            <p className="text-sm text-text-muted mt-1">Fees are created when you add a client</p>
          </div>
        </div>
      ) : (
        <div ref={listRef} className="space-y-3">
          {fees.map((f) => {
            const initials = getInitials(f.clientName)
            return (
              <div key={f.id} className="reveal-item bg-bg-card/80 border border-border-subtle backdrop-blur-xl rounded-2xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {f.clientAvatar ? (
                      <img src={f.clientAvatar} alt={f.clientName} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-bg-elevated flex items-center justify-center flex-shrink-0 border border-accent-gold/30">
                        <span className="text-accent-gold text-xs font-heading font-bold">{initials}</span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-text-primary font-heading font-bold text-xs truncate">{f.clientName}</p>
                      <p className="text-text-muted text-[10px] mt-0.5">
                        Due: {format(new Date(f.due_date), "d MMM")} · ₹{Number(f.amount).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0 ${statusBadge(f.status)}`}>{f.status}</span>
                </div>

                {(f.status === "pending" || f.status === "overdue") && (
                  <div className="flex gap-2 mt-3">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleMarkPaid(f.id)}
                      className="flex-1 h-9 rounded-full bg-accent-gold text-bg-primary text-[10px] font-heading font-bold uppercase tracking-wide cursor-pointer"
                    >
                      Mark Paid
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => toast("WhatsApp reminder coming soon")}
                      className="flex-1 h-9 rounded-full bg-bg-elevated border border-border-subtle text-text-primary text-[10px] font-heading font-bold uppercase tracking-wide flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Bell className="size-3" />
                      Remind
                    </motion.button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
