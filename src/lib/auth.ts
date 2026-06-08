import { getSupabaseClient } from "./supabase"
import type { AppUser } from "@/types"
import type { Session } from "@supabase/supabase-js"

function sb() {
  const c = getSupabaseClient()
  if (!c) throw new Error("Supabase not configured")
  return c
}

export async function signUp(
  email: string,
  password: string,
  displayName: string,
  role: "client" | "coach" = "client"
) {
  const { data, error } = await sb().auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName, role } },
  })
  if (error) throw error
  if (!data.user) throw new Error("Signup failed")

  const { error: insertError } = await sb().from("users").upsert({
    id: data.user.id,
    email,
    display_name: displayName,
    role,
    status: "active",
  })
  if (insertError) throw insertError

  return data.user
}

export async function signIn(email: string, password: string) {
  const { data, error } = await sb().auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.user
}

export async function signOut() {
  const { error } = await sb().auth.signOut()
  if (error) throw error
}

export async function getUserRole(uid: string): Promise<"client" | "coach" | "admin" | null> {
  const { data, error } = await sb()
    .from("users")
    .select("role")
    .eq("id", uid)
    .single()
  if (error || !data) return null
  return data.role as "client" | "coach" | "admin"
}

export async function getUserProfile(uid: string): Promise<AppUser | null> {
  const { data, error } = await sb()
    .from("users")
    .select("*")
    .eq("id", uid)
    .single()
  if (error || !data) return null
  return {
    uid: data.id,
    email: data.email,
    displayName: data.display_name,
    photoURL: data.photo_url,
    phone: data.phone,
    role: data.role || "client",
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  }
}

export function onAuthChange(callback: (user: import("@supabase/supabase-js").User | null) => void) {
  const client = getSupabaseClient()
  if (!client) {
    callback(null)
    return () => {}
  }
  const { data: { subscription } } = client.auth.onAuthStateChange((_event: string, session: Session | null) => {
    callback(session?.user ?? null)
  })
  return () => subscription.unsubscribe()
}
