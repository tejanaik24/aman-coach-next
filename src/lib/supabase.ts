import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let client: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) return null
  if (!client) {
    client = createBrowserClient(supabaseUrl, supabaseAnonKey)
  }
  return client
}

export async function checkSupabaseConfig() {
  return !!(supabaseUrl && supabaseAnonKey)
}
