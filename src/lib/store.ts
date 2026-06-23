export { getClientProfile, getCoachClients, getCheckins, getCoachCheckins, getWorkoutPlan, getNutritionPlan, getFees } from "./supabase-store"

export async function initStore() {
  return true
}

export function isSupabaseActive() {
  return true
}
