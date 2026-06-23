import { getSupabaseClient } from "./supabase"
import type { Profile } from "@/types"

function sb() {
  const c = getSupabaseClient()
  if (!c) throw new Error("Supabase not configured")
  return c
}

export async function signOut() {
  const { error } = await sb().auth.signOut()
  if (error) throw error
}

export async function getUserProfile(uid: string): Promise<Profile | null> {
  const { data, error } = await sb()
    .from("profiles")
    .select("*")
    .eq("id", uid)
    .single()
  if (error || !data) return null
  return data as Profile
}

export function onAuthChange(
  callback: (user: import("@supabase/supabase-js").User | null) => void
) {
  const client = getSupabaseClient()
  if (!client) {
    callback(null)
    return () => {}
  }
  const {
    data: { subscription },
  } = client.auth.onAuthStateChange((_event: import("@supabase/supabase-js").AuthChangeEvent, session: import("@supabase/supabase-js").Session | null) => {
    callback(session?.user ?? null)
  })
  return () => subscription.unsubscribe()
}
