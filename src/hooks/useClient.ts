"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "./useAuth"
import type { Client, WorkoutPlan, NutritionPlan, Checkin } from "@/types"

export function useClient() {
  const { user, loading: authLoading } = useAuth()
  const [clientRecord, setClientRecord] = useState<Client | null>(null)
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null)
  const [nutritionPlan, setNutritionPlan] = useState<NutritionPlan | null>(null)
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    // PREVIEW MODE: inject mock data, no Supabase calls
    setClientRecord(null)
    setWorkoutPlan(null)
    setNutritionPlan(null)
    setCheckins([])
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!authLoading) load()
  }, [authLoading, load])

  return { clientRecord, workoutPlan, nutritionPlan, checkins, loading, refresh: load }
}
