"use client"

import { createContext, useEffect, useState, ReactNode } from "react"
import type { User } from "@supabase/supabase-js"
import { onAuthChange, getUserRole, getUserProfile, signUp, signIn, signOut } from "@/lib/auth"
import { AppUser } from "@/types"

interface AuthContextValue {
  user: User | null
  profile: AppUser | null
  role: "client" | "coach" | "admin" | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ user: User; role: string | null }>
  register: (
    email: string,
    password: string,
    name: string,
    role: "client" | "coach"
  ) => Promise<{ user: User; role: string | null }>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  role: null,
  loading: true,
  login: async () => { throw new Error("AuthContext not initialized") },
  register: async () => { throw new Error("AuthContext not initialized") },
  logout: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AppUser | null>(null)
  const [role, setRole] = useState<"client" | "coach" | "admin" | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthChange(async (supabaseUser) => {
      setUser(supabaseUser)
      if (supabaseUser) {
        const p = await getUserProfile(supabaseUser.id)
        setProfile(p)
        setRole(p?.role || null)
      } else {
        setRole(null)
        setProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const login = async (email: string, password: string) => {
    const u = await signIn(email, password)
    const p = await getUserProfile(u.id)
    setProfile(p)
    setRole(p?.role || null)
    return { user: u, role: p?.role || null }
  }

  const register = async (
    email: string,
    password: string,
    name: string,
    r: "client" | "coach"
  ) => {
    const u = await signUp(email, password, name, r)
    const p = await getUserProfile(u.id)
    setProfile(p)
    setRole(p?.role || null)
    return { user: u, role: p?.role || null }
  }

  const logout = async () => {
    await signOut()
    setUser(null)
    setProfile(null)
    setRole(null)
  }

  return (
    <AuthContext.Provider
      value={{ user, profile, role, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}
