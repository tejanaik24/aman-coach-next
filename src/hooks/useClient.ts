"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "./useAuth"
import { getClientProfile, getCheckins, getFees, getWorkoutPlan, getNutritionPlan } from "@/lib/store"
import type { Client, Checkin, Fee, WorkoutPlan, NutritionPlan } from "@/types"

export function useClient() {
  const { user, loading: authLoading } = useAuth()
  const [clientRecord, setClientRecord] = useState<Client | null>(null)
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null)
  const [nutritionPlan, setNutritionPlan] = useState<NutritionPlan | null>(null)
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    try {
      const c = await getClientProfile(user.id)
      if (c) {
        setClientRecord(c)
        const [w, n, ch] = await Promise.all([
          getWorkoutPlan(c.id),
          getNutritionPlan(c.id),
          getCheckins(c.id)
        ])
        setWorkoutPlan(w)
        setNutritionPlan(n)
        setCheckins(ch)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!authLoading) load()
  }, [authLoading, load])

  return { clientRecord, workoutPlan, nutritionPlan, checkins, loading, refresh: load }
}

export function useClientData(clientId?: string) {
  const { user } = useAuth()
  const uid = clientId || user?.id
  const [client, setClient] = useState<Client | null>(null)
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [payments, setPayments] = useState<Fee[]>([]) // Mapped to Fee
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null)
  const [dietPlan, setDietPlan] = useState<NutritionPlan | null>(null) // Mapped to NutritionPlan
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!uid) {
      setLoading(false)
      return
    }

    let cancelled = false
    const cid: string = uid

    async function load() {
      try {
        setLoading(true)
        // Try getting profile by user ID or client ID
        let c = await getClientProfile(cid)
        if (!c) {
          // If cid is client_id (UUID) instead of user_id (metadata string)
          const { data, error } = await getClientProfile(cid) as any // fallback check
          c = data || null
        }
        
        if (c && !cancelled) {
          const [ch, p, w, d] = await Promise.all([
            getCheckins(c.id),
            getFees(c.id),
            getWorkoutPlan(c.id),
            getNutritionPlan(c.id)
          ])
          if (cancelled) return
          setClient(c)
          setCheckins(ch)
          setPayments(p)
          setWorkoutPlan(w)
          setDietPlan(d)
        }
      } catch (err) {
        console.error("useClientData error:", err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [uid, version])

  const refresh = () => setVersion((v) => v + 1)

  return { client, checkins, payments, workoutPlan, dietPlan, loading, refresh }
}
