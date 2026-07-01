"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { User, Session } from "@supabase/supabase-js"
import type { Profile } from "@/types"
import { createClient } from "@/lib/supabase/client"

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  role: "coach" | "client" | null
  loading: boolean
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  role: null,
  loading: true,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then((result: { data: { session: Session | null } }) => {
      const session = result.data.session
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        loadProfile(u.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from("profiles")
      .select("id, name, phone, avatar_url, role, created_at, updated_at")
      .eq("id", userId)
      .single()
    setProfile(data as Profile | null)
    setLoading(false)
  }

  const role = (profile?.role ?? null) as "coach" | "client" | null

  return (
    <AuthContext.Provider value={{ user, profile, role, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
