"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "./useAuth"
import { createClient } from "@/lib/supabase/client"
import { amountDue, paidSoFar } from "@/lib/fee-math"
import type { ClientWithProfile, CoachStats, Fee } from "@/types"

export function useCoach() {
  const { user, loading: authLoading } = useAuth()
  const [clients, setClients] = useState<ClientWithProfile[]>([])
  const [stats, setStats] = useState<CoachStats>({
    totalClients: 0,
    activeClients: 0,
    pendingCheckins: 0,
    feesDue: 0,
    feesDueAmount: 0,
    overdueFeesCount: 0,
    overdueFeesAmount: 0,
    monthlyRevenue: 0,
  })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    const supabase = createClient()
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
    const todayStr = now.toISOString().split("T")[0]

    // 1. Fetch coach's clients (with profile)
    const { data: clientRows, error: clientRowsError } = await supabase
      .from("clients")
      .select("*, profile:profiles!user_id(*)")
      .eq("coach_id", user.id)
    if (clientRowsError) console.error("useCoach load failed:", clientRowsError.message)

    const coachClients = (clientRows ?? []) as ClientWithProfile[]
    setClients(coachClients)

    const clientIds = coachClients.map((c) => c.id)
    if (clientIds.length === 0) {
      setStats({
        totalClients: 0,
        activeClients: 0,
        pendingCheckins: 0,
        feesDue: 0,
        feesDueAmount: 0,
        overdueFeesCount: 0,
        overdueFeesAmount: 0,
        monthlyRevenue: 0,
      })
      setLoading(false)
      return
    }

    // 2. Counts in parallel
    const [activeRes, pendingRes, feesRes, revenueRes] = await Promise.all([
      supabase.from("clients").select("id", { count: "exact", head: true }).eq("coach_id", user.id).eq("status", "active"),
      supabase.from("checkins").select("id", { count: "exact", head: true }).in("client_id", clientIds).is("reviewed_at", null),
      supabase.from("fees").select("amount, amount_paid, status, due_date").in("client_id", clientIds).neq("status", "paid"),
      supabase.from("fees").select("amount, amount_paid, status").in("client_id", clientIds).eq("status", "paid").gte("paid_date", monthStart).lte("paid_date", monthEnd),
    ])

    const unpaidFees = ((feesRes.data ?? []) as Pick<Fee, "amount" | "amount_paid" | "status" | "due_date">[]).filter(
      (f) => amountDue(f) > 0
    )
    const feesDue = unpaidFees.length
    const feesDueAmount = unpaidFees.reduce((sum, f) => sum + amountDue(f), 0)
    const overdueFees = unpaidFees.filter((f) => f.due_date < todayStr)
    const overdueFeesCount = overdueFees.length
    const overdueFeesAmount = overdueFees.reduce((sum, f) => sum + amountDue(f), 0)
    const monthlyRevenue = ((revenueRes.data ?? []) as Pick<Fee, "amount" | "amount_paid" | "status">[]).reduce(
      (sum, r) => sum + paidSoFar(r),
      0
    )

    setStats({
      totalClients: coachClients.length,
      activeClients: activeRes.count ?? 0,
      pendingCheckins: pendingRes.count ?? 0,
      feesDue,
      feesDueAmount,
      overdueFeesCount,
      overdueFeesAmount,
      monthlyRevenue,
    })
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!authLoading) load()
  }, [authLoading, load])

  return { clients, stats, loading, refresh: load }
}
