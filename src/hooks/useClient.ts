"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
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
    if (!user) { setLoading(false); return }
    const supabase = createClient()
    setLoading(true)
    try {
      const { data: clientRow } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id)
        .single()
      setClientRecord(clientRow)

      if (clientRow) {
        const [{ data: wp }, { data: np }, { data: ck }] = await Promise.all([
          supabase
            .from("workout_plans")
            .select("*")
            .eq("client_id", clientRow.id)
            .eq("is_active", true)
            .single(),
          supabase
            .from("nutrition_plans")
            .select("*")
            .eq("client_id", clientRow.id)
            .eq("is_active", true)
            .single(),
          supabase
            .from("checkins")
            .select("*")
            .eq("client_id", clientRow.id)
            .order("submitted_at", { ascending: false })
            .limit(10),
        ])
        setWorkoutPlan(wp)
        setNutritionPlan(np)
        setCheckins(ck ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!authLoading) load()
  }, [authLoading, load])

  return { clientRecord, workoutPlan, nutritionPlan, checkins, loading, refresh: load }
}
