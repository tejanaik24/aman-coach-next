"use client"

import { useEffect, useState } from "react"
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/types"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function loadProfile(u: User): Promise<void> {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", u.id)
        .single()
      setProfile(data as Profile | null)
    }

    void supabase.auth.getUser().then((result: { data: { user: User | null } }) => {
      const u = result.data.user
      setUser(u)
      if (u) void loadProfile(u).finally(() => setLoading(false))
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        const u: User | null = session?.user ?? null
        setUser(u)
        if (u) void loadProfile(u)
        else { setProfile(null); setLoading(false) }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, profile, role: profile?.role ?? null, loading }
}
