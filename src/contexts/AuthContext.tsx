"use client"

import { createContext, type ReactNode } from "react"
import type { User } from "@supabase/supabase-js"
import type { Profile } from "@/types"

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
  loading: false,
})

// PREVIEW MODE: mock coach user so app renders without Supabase
const MOCK_PROFILE: Profile = {
  id: "preview-coach",
  name: "Aman Khurana",
  phone: "9876543210",
  avatar_url: null,
  role: "coach",
  created_at: "",
  updated_at: "",
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // PREVIEW MODE: loading is always false — no Supabase calls, mock data ready immediately
  return (
    <AuthContext.Provider value={{ user: { id: "preview-coach" } as User, profile: MOCK_PROFILE, role: "coach", loading: false }}>
      {children}
    </AuthContext.Provider>
  )
}
