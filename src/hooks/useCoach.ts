"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "./useAuth"
import { createClient } from "@/lib/supabase/client"
import type { ClientWithProfile, CoachStats } from "@/types"

export function useCoach() {
  const { user, loading: authLoading } = useAuth()
  const [clients, setClients] = useState<ClientWithProfile[]>([])
  const [stats, setStats] = useState<CoachStats>({
    totalClients: 0,
    activeClients: 0,
    pendingCheckins: 0,
    feesDue: 0,
    monthlyRevenue: 0,
  })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    const supabase = createClient()
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

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
      setStats({ totalClients: 0, activeClients: 0, pendingCheckins: 0, feesDue: 0, monthlyRevenue: 0 })
      setLoading(false)
      return
    }

    // 2. Counts in parallel
    const [activeRes, pendingRes, feesRes, revenueRes] = await Promise.all([
      supabase.from("clients").select("id", { count: "exact", head: true }).eq("coach_id", user.id).eq("status", "active"),
      supabase.from("checkins").select("id", { count: "exact", head: true }).in("client_id", clientIds).is("reviewed_at", null),
      supabase.from("fees").select("id", { count: "exact", head: true }).in("client_id", clientIds).eq("status", "pending"),
      supabase.from("fees").select("amount").in("client_id", clientIds).eq("status", "paid").gte("paid_date", monthStart).lte("paid_date", monthEnd),
    ])

    const monthlyRevenue = (revenueRes.data ?? []).reduce((sum: number, r: { amount: number | null }) => sum + (r.amount ?? 0), 0)

    setStats({
      totalClients: coachClients.length,
      activeClients: activeRes.count ?? 0,
      pendingCheckins: pendingRes.count ?? 0,
      feesDue: feesRes.count ?? 0,
      monthlyRevenue,
    })
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!authLoading) load()
  }, [authLoading, load])

  return { clients, stats, loading, refresh: load }
}
