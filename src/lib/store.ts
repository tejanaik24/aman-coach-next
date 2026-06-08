import type { Lead } from "@/types"
import { checkSupabaseConfig } from "./supabase"
import * as firebase from "./firestore"
import * as supabase from "./supabase-store"

let useSupabase = false

export async function initStore() {
  useSupabase = await checkSupabaseConfig()
  return useSupabase
}

export function isSupabaseActive() {
  return useSupabase
}

export async function getClientProfile(uid: string) {
  if (useSupabase) return supabase.getClientProfile(uid)
  return firebase.getClientProfile(uid)
}

export async function getCoachClients(coachId: string) {
  if (useSupabase) return supabase.getCoachClients(coachId)
  return firebase.getCoachClients(coachId)
}

export async function getCheckins(clientId: string, max = 20) {
  if (useSupabase) return supabase.getCheckins(clientId, max)
  return firebase.getCheckins(clientId, max)
}

export async function getCoachCheckins(coachId: string, max = 50) {
  if (useSupabase) return supabase.getCoachCheckins(coachId, max)
  return firebase.getCoachCheckins(coachId, max)
}

export async function addCheckin(data: Parameters<typeof firebase.addCheckin>[0]) {
  if (useSupabase) return supabase.addCheckin(data)
  return firebase.addCheckin(data)
}

export async function getPayments(clientId: string, max = 20) {
  if (useSupabase) return supabase.getPayments(clientId, max)
  return firebase.getPayments(clientId, max)
}

export async function getCoachPayments(coachId: string, max = 50) {
  if (useSupabase) return supabase.getCoachPayments(coachId, max)
  return firebase.getCoachPayments(coachId, max)
}

export async function addPayment(data: Parameters<typeof firebase.addPayment>[0]) {
  if (useSupabase) return supabase.addPayment(data)
  return firebase.addPayment(data)
}

export async function getLeads(status?: Lead["status"]) {
  if (useSupabase) return supabase.getLeads(status)
  return firebase.getLeads(status)
}

export async function addLead(data: Parameters<typeof firebase.addLead>[0]) {
  if (useSupabase) return supabase.addLead(data)
  return firebase.addLead(data)
}

export async function updateLeadStatus(id: string, status: Lead["status"]) {
  if (useSupabase) return supabase.updateLeadStatus(id, status)
  return firebase.updateLeadStatus(id, status)
}

export async function sendMessage(data: Parameters<typeof firebase.sendMessage>[0]) {
  if (useSupabase) return supabase.sendMessage(data)
  return firebase.sendMessage(data)
}

export async function getMessages(uid: string, otherUid: string, max = 50) {
  if (useSupabase) return supabase.getMessages(uid, otherUid, max)
  return firebase.getMessages(uid, otherUid, max)
}

export async function getWorkoutPlan(clientId: string) {
  if (useSupabase) return supabase.getWorkoutPlan(clientId)
  return firebase.getWorkoutPlan(clientId)
}

export async function saveWorkoutPlan(data: Parameters<typeof firebase.saveWorkoutPlan>[0]) {
  if (useSupabase) return supabase.saveWorkoutPlan(data)
  return firebase.saveWorkoutPlan(data)
}

export async function getDietPlan(clientId: string) {
  if (useSupabase) return supabase.getDietPlan(clientId)
  return firebase.getDietPlan(clientId)
}

export async function saveDietPlan(data: Parameters<typeof firebase.saveDietPlan>[0]) {
  if (useSupabase) return supabase.saveDietPlan(data)
  return firebase.saveDietPlan(data)
}

export async function getNotifications(userId: string) {
  if (useSupabase) return supabase.getNotifications(userId)
  return firebase.getNotifications(userId)
}

export async function markNotificationRead(id: string) {
  if (useSupabase) return supabase.markNotificationRead(id)
  return firebase.markNotificationRead(id)
}
