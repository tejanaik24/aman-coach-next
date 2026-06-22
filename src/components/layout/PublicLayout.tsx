"use client"

import Link from "next/link"
import { useAuth } from "@/hooks/useAuth"
import { ReactNode, useState } from "react"
import { Menu, X } from "lucide-react"

export function PublicLayout({ children }: { children: ReactNode }) {
  const { user, role } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const dashboardHref = role === "coach" ? "/coach/admin" : "/client/dashboard"

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="fixed top-0 left-0 right-0 z-30 border-b border-zinc-800 bg-black/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="font-heading text-xl text-white tracking-wider">
            AMAN KHURANA FITNESS
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/" className="text-sm text-zinc-400 hover:text-white transition-colors">Home</Link>
            <Link href="/about" className="text-sm text-zinc-400 hover:text-white transition-colors">About</Link>
            <Link href="/services" className="text-sm text-zinc-400 hover:text-white transition-colors">Services</Link>
            <Link href="/transformations" className="text-sm text-zinc-400 hover:text-white transition-colors">Transformations</Link>
            <Link href="/contact" className="text-sm text-zinc-400 hover:text-white transition-colors">Contact</Link>
            {user ? (
              <Link
                href={dashboardHref}
                className="rounded-full bg-[#FFB800] px-5 py-2 text-sm font-bold uppercase tracking-wider text-black transition-all hover:bg-[#B28000]"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/auth/login"
                className="rounded-full bg-[#FFB800] px-5 py-2 text-sm font-bold uppercase tracking-wider text-black transition-all hover:bg-[#B28000]"
              >
                Login
              </Link>
            )}
          </nav>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-zinc-400 md:hidden"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-zinc-800 bg-black px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              <Link href="/" onClick={() => setMenuOpen(false)} className="text-sm text-zinc-400 hover:text-white">Home</Link>
              <Link href="/about" onClick={() => setMenuOpen(false)} className="text-sm text-zinc-400 hover:text-white">About</Link>
              <Link href="/services" onClick={() => setMenuOpen(false)} className="text-sm text-zinc-400 hover:text-white">Services</Link>
              <Link href="/transformations" onClick={() => setMenuOpen(false)} className="text-sm text-zinc-400 hover:text-white">Transformations</Link>
              <Link href="/contact" onClick={() => setMenuOpen(false)} className="text-sm text-zinc-400 hover:text-white">Contact</Link>
              {user ? (
                <Link href={dashboardHref} onClick={() => setMenuOpen(false)} className="rounded-full bg-[#FFB800] px-4 py-2 text-center text-sm font-bold uppercase tracking-wider text-black">Dashboard</Link>
              ) : (
                <Link href="/auth/login" onClick={() => setMenuOpen(false)} className="rounded-full bg-[#FFB800] px-4 py-2 text-center text-sm font-bold uppercase tracking-wider text-black">Login</Link>
              )}
            </div>
          </div>
        )}
      </header>
      <main className="pt-16">{children}</main>
      <footer className="border-t border-zinc-800 bg-black/50 px-4 py-8 text-center">
        <p className="font-heading text-lg text-white">AMAN KHURANA FITNESS</p>
        <p className="mt-1 text-xs text-zinc-500">Transforming Lives Through Fitness</p>
        <p className="mt-4 text-xs text-zinc-600">&copy; {new Date().getFullYear()} Aman Khurana Fitness. All rights reserved.</p>
      </footer>
    </div>
  )
}
