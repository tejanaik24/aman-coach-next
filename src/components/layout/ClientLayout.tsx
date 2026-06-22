"use client"

import Link from "next/link"
import { useAuth } from "@/hooks/useAuth"
import { BottomNav } from "./BottomNav"
import { NotificationBell } from "@/components/NotificationBell"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { ReactNode } from "react"

export function ClientLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-30 bg-black/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <Link href="/client/dashboard" className="font-heading text-lg tracking-wider text-white">
            AK FITNESS
          </Link>
          <NotificationBell userId={user?.id} />
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-4 pb-20">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
      <BottomNav />
    </div>
  )
}
