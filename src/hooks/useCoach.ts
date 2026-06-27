"use client"

import { useEffect, useState, useCallback } from "react"
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
    // PREVIEW MODE: inject mock data, no Supabase calls
    setClients([])
    setStats({
      totalClients: 12,
      activeClients: 10,
      pendingCheckins: 4,
      feesDue: 3,
      monthlyRevenue: 48000,
    })
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!authLoading) load()
  }, [authLoading, load])

  return { clients, stats, loading, refresh: load }
}
