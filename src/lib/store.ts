import type { Lead } from "@/types"
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
export const getWorkoutPlan = supabase.getWorkoutPlan
export const saveWorkoutPlan = supabase.saveWorkoutPlan
export const getDietPlan = supabase.getDietPlan
export const saveDietPlan = supabase.saveDietPlan
export const getNotifications = supabase.getNotifications
export const markNotificationRead = supabase.markNotificationRead
