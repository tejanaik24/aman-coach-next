"use client"

import Link from "next/link"
import { useAuth } from "@/hooks/useAuth"
import { ReactNode, useState } from "react"

export function PublicLayout({ children }: { children: ReactNode }) {
  const { user, role } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const dashboardHref = role === "coach" ? "/coach/admin" : "/client/dashboard"

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="fixed top-0 left-0 right-0 z-30 border-b border-white/10 bg-black/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="font-heading text-xl text-gold tracking-wider">
            AMAN KHURANA FITNESS
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/" className="text-sm text-white/60 hover:text-gold transition-colors">Home</Link>
            <Link href="/about" className="text-sm text-white/60 hover:text-gold transition-colors">About</Link>
            <Link href="/services" className="text-sm text-white/60 hover:text-gold transition-colors">Services</Link>
            <Link href="/transformations" className="text-sm text-white/60 hover:text-gold transition-colors">Transformations</Link>
            <Link href="/contact" className="text-sm text-white/60 hover:text-gold transition-colors">Contact</Link>
            {user ? (
              <Link
                href={dashboardHref}
                className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/auth/login"
                className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90"
              >
                Login
              </Link>
            )}
          </nav>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-white/60 md:hidden"
            aria-label="Toggle menu"
          >
            <span className="text-2xl">{menuOpen ? "✕" : "☰"}</span>
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-white/10 bg-black px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              <Link href="/" onClick={() => setMenuOpen(false)} className="text-sm text-white/60 hover:text-gold">Home</Link>
              <Link href="/about" onClick={() => setMenuOpen(false)} className="text-sm text-white/60 hover:text-gold">About</Link>
              <Link href="/services" onClick={() => setMenuOpen(false)} className="text-sm text-white/60 hover:text-gold">Services</Link>
              <Link href="/transformations" onClick={() => setMenuOpen(false)} className="text-sm text-white/60 hover:text-gold">Transformations</Link>
              <Link href="/contact" onClick={() => setMenuOpen(false)} className="text-sm text-white/60 hover:text-gold">Contact</Link>
              {user ? (
                <Link href={dashboardHref} onClick={() => setMenuOpen(false)} className="rounded-lg bg-gold px-4 py-2 text-center text-sm font-medium text-black">Dashboard</Link>
              ) : (
                <Link href="/auth/login" onClick={() => setMenuOpen(false)} className="rounded-lg bg-gold px-4 py-2 text-center text-sm font-medium text-black">Login</Link>
              )}
            </div>
          </div>
        )}
      </header>
      <main className="pt-16">{children}</main>
      <footer className="border-t border-white/10 bg-black/50 px-4 py-8 text-center">
        <p className="font-heading text-lg text-gold">AMAN KHURANA FITNESS</p>
        <p className="mt-1 text-xs text-white/40">Transforming Lives Through Fitness</p>
        <p className="mt-4 text-xs text-white/30">&copy; {new Date().getFullYear()} Aman Khurana Fitness. All rights reserved.</p>
      </footer>
    </div>
  )
}
