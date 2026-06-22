"use client"

import { useAuth } from "@/hooks/useAuth"
import { Sidebar } from "./Sidebar"
import { CoachBottomNav } from "./CoachBottomNav"
import { NotificationBell } from "@/components/NotificationBell"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { ReactNode } from "react"
import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"

export function CoachLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Sidebar />
      <div className="lg:ml-56">
        <header className="sticky top-0 z-30 border-b border-zinc-800 bg-black/95 backdrop-blur-md">
          <div className="flex h-14 items-center justify-between px-4 lg:px-6">
            <h1 className="font-heading text-lg text-white lg:hidden">AK FITNESS</h1>
            <div className="ml-auto flex items-center gap-3">
              <NotificationBell userId={user?.id} />
              <span className="text-xs text-zinc-500 hidden sm:block truncate max-w-32">
                {user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-full border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:text-white hover:border-zinc-600"
              >
                <LogOut className="size-3.5" />
                Logout
              </button>
            </div>
          </div>
        </header>
        <main className="px-4 py-4 pb-20 lg:px-6 lg:pb-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
      <CoachBottomNav />
    </div>
  )
}
