"use client"

import { createContext, useEffect, useState, ReactNode } from "react"
import { User } from "firebase/auth"
import { onAuthChange, getUserRole, signUp, signIn, signOut } from "@/lib/auth"
import { AppUser } from "@/types"

interface AuthContextValue {
  user: User | null
  profile: AppUser | null
  role: "client" | "coach" | "admin" | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  register: (
    email: string,
    password: string,
    name: string,
    role: "client" | "coach"
  ) => Promise<User>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  role: null,
  loading: true,
  login: async () => {
    throw new Error("AuthContext not initialized")
  },
  register: async () => {
    throw new Error("AuthContext not initialized")
  },
  logout: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AppUser | null>(null)
  const [role, setRole] = useState<"client" | "coach" | "admin" | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthChange(async (fbUser) => {
      setUser(fbUser)
      if (fbUser) {
        const r = await getUserRole(fbUser.uid)
        setRole(r)
        setProfile({
          uid: fbUser.uid,
          email: fbUser.email || "",
          displayName: fbUser.displayName || "",
          role: r || "client",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
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
    return u
  }

  const register = async (
    email: string,
    password: string,
    name: string,
    r: "client" | "coach"
  ) => {
    const u = await signUp(email, password, name, r)
    return u
  }

  const logout = async () => {
    await signOut()
  }

  return (
    <AuthContext.Provider
      value={{ user, profile, role, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}
