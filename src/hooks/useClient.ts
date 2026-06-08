"use client"

import { useEffect, useState, useRef } from "react"
import { useAuth } from "./useAuth"
import { getClientProfile, getCheckins, getPayments, getWorkoutPlan, getDietPlan } from "@/lib/firestore"
import { Client, Checkin, Payment, WorkoutPlan, DietPlan } from "@/types"

export function useClientData(clientId?: string) {
  const { user } = useAuth()
  const uid = clientId || user?.uid
  const [client, setClient] = useState<Client | null>(null)
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null)
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    if (!uid) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false)
      return
    }

    const cid: string = uid
    async function load() {
      try {
        const [c, ch, p, w, d] = await Promise.all([
          getClientProfile(cid),
          getCheckins(cid),
          getPayments(cid),
          getWorkoutPlan(cid),
          getDietPlan(cid),
        ])
        setClient(c)
        setCheckins(ch)
        setPayments(p)
        setWorkoutPlan(w)
        setDietPlan(d)
      } catch (err) {
        console.error("useClientData error:", err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [uid])

  return { client, checkins, payments, workoutPlan, dietPlan, loading }
}
