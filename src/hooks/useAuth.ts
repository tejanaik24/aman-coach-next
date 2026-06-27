"use client"

import { useContext } from "react"
import { AuthContext } from "@/contexts/AuthContext"

// PREVIEW MODE: useAuth now reads from AuthContext (mock data, no Supabase calls)
export function useAuth() {
  return useContext(AuthContext)
}
