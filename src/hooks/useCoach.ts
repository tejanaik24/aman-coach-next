"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "./useAuth"
import type { Client, ClientWithProfile, CoachStats } from "@/types"

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
    if (!user) { setLoading(false); return }
    const supabase = createClient()
    setLoading(true)
    try {
      const { data: clientRows } = await supabase
        .from("clients")
        .select("*, profile:profiles(*)")
        .eq("coach_id", user.id)
        .order("created_at", { ascending: false })

      const rows = (clientRows ?? []) as (Client & { profile: import("@/types").Profile | null })[]
      const withProfiles: ClientWithProfile[] = rows.map((r) => ({
        ...r,
        profile: r.profile ?? null,
      }))
      setClients(withProfiles)

      const active = rows.filter((c) => c.status === "active").length

      const { count: checkinCount } = await supabase
        .from("checkins")
        .select("id", { count: "exact", head: true })
        .in("client_id", rows.map((r) => r.id))
        .is("reviewed_at", null)

      const { data: feeRows } = await supabase
        .from("fees")
        .select("amount")
        .in("client_id", rows.map((r) => r.id))
        .eq("status", "pending")

      const feesDue = (feeRows ?? []).length

      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const { data: paidFees } = await supabase
        .from("fees")
        .select("amount")
        .in("client_id", rows.map((r) => r.id))
        .eq("status", "paid")
        .gte("paid_date", monthStart)

      const monthlyRevenue = (paidFees ?? []).reduce((sum: number, f: { amount: number | null }) => sum + (f.amount ?? 0), 0)

      setStats({
        totalClients: rows.length,
        activeClients: active,
        pendingCheckins: checkinCount ?? 0,
        feesDue,
        monthlyRevenue,
      })
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!authLoading) load()
  }, [authLoading, load])

  return { clients, stats, loading, refresh: load }
}
