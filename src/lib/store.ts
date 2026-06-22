import * as supabase from "./supabase-store"

export async function initStore() {
  return true
}

export function isSupabaseActive() {
  return true
}

export const getClientProfile = supabase.getClientProfile
export const getCoachClients = supabase.getCoachClients
export const getCheckins = supabase.getCheckins
export const updateCheckin = supabase.updateCheckin
export const getCoachCheckins = supabase.getCoachCheckins
export const addCheckin = supabase.addCheckin
export const getPayments = supabase.getPayments
export const getCoachPayments = supabase.getCoachPayments
export const addPayment = supabase.addPayment
export const getLeads = supabase.getLeads
export const addLead = supabase.addLead
export const updateLeadStatus = supabase.updateLeadStatus
export const sendMessage = supabase.sendMessage
export const getMessages = supabase.getMessages
export const getUserMessages = supabase.getUserMessages
export const markMessageRead = supabase.markMessageRead
export const getWorkoutPlan = supabase.getWorkoutPlan
export const saveWorkoutPlan = supabase.saveWorkoutPlan
export const getDietPlan = supabase.getDietPlan
export const saveDietPlan = supabase.saveDietPlan
export const getNotifications = supabase.getNotifications
export const markNotificationRead = supabase.markNotificationRead

export const getMealLogs = supabase.getMealLogs
export const logMeal = supabase.logMeal
export const deleteMealLog = supabase.deleteMealLog
export const searchFoodDatabase = supabase.searchFoodDatabase
export const getAllFoodCategories = supabase.getAllFoodCategories

export const getHabits = supabase.getHabits
export const createHabit = supabase.createHabit
export const deleteHabit = supabase.deleteHabit
export const getHabitLogs = supabase.getHabitLogs
export const getHabitLogsRange = supabase.getHabitLogsRange
export const toggleHabitLog = supabase.toggleHabitLog

export const getWearableMetrics = supabase.getWearableMetrics
export const getWearableMetricsRange = supabase.getWearableMetricsRange
export const saveWearableMetrics = supabase.saveWearableMetrics

export const getCoachAvailability = supabase.getCoachAvailability
export const setCoachAvailability = supabase.setCoachAvailability
export const getAppointments = supabase.getAppointments
export const createAppointment = supabase.createAppointment
export const updateAppointmentStatus = supabase.updateAppointmentStatus
export const getAvailableSlots = supabase.getAvailableSlots

export const saveOnboardingDraft = supabase.saveOnboardingDraft
export const submitOnboardingForm = supabase.submitOnboardingForm
export const getOnboardingForm = supabase.getOnboardingForm
export const getCoachOnboardingForms = supabase.getCoachOnboardingForms
