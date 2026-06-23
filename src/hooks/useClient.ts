"use client"

import { useEffect, useState } from "react"
import { useAuth } from "./useAuth"
import { getClientProfile, getCheckins, getPayments, getWorkoutPlan, getDietPlan } from "@/lib/store"
import { Client, Checkin, Payment, WorkoutPlan, DietPlan } from "@/types"

export function useClientData(clientId?: string) {
  const { user } = useAuth()
  const uid = clientId || user?.id
  const [client, setClient] = useState<Client | null>(null)
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null)
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null)
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
        const [c, ch, p, w, d] = await Promise.all([
          getClientProfile(cid),
          getCheckins(cid),
          getPayments(cid),
          getWorkoutPlan(cid),
          getDietPlan(cid),
        ])
        if (cancelled) return
        setClient(c)
        setCheckins(ch)
        setPayments(p)
        setWorkoutPlan(w)
        setDietPlan(d)
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
