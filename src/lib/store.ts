export {
  getClientProfile,
  getCoachClients,
  getCheckins,
  getCoachCheckins,
  getWorkoutPlan,
  getNutritionPlan,
  getFees,
  saveOnboardingDraft,
  submitOnboardingForm,
  getOnboardingForm,
  getCoachAvailability,
  setCoachAvailability,
  getAppointments,
  createAppointment,
  updateAppointmentStatus,
  getAvailableSlots
} from "./supabase-store"

export async function initStore() {
  return true
}

export function isSupabaseActive() {
  return true
}
