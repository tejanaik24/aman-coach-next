"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError("")
    if (!email.trim() || !password) { setError("Enter email and password"); return }
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (err) { setError(err.message); return }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError("Login failed. Try again."); return }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, must_reset_password")
        .eq("id", user.id)
        .single()

      if (profile?.must_reset_password) { router.replace("/reset-password"); return }
      const role = profile?.role
      if (role === "coach") router.replace("/dashboard")
      else if (role === "client") router.replace("/home")
      else router.replace("/onboarding")
    } catch {
      setError("Login failed. Try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-cream min-h-full">
      {/* Top Graphic Header */}
      <div className="flex flex-col items-center mt-12 space-y-2">
        <div className="w-16 h-16 rounded-full bg-charcoal-deep flex items-center justify-center font-montserrat text-lime-electric font-black text-3xl tracking-tight animate-fade-in-up">
          AK
        </div>
        <h1 className="font-montserrat font-black text-2xl uppercase tracking-wider text-charcoal-deep animate-fade-in-up">
          AK Fitness
        </h1>
        <span className="text-[10px] font-bold uppercase tracking-widest text-charcoal-muted bg-lime-tint px-3 py-1.5 rounded-full border border-lime-electric/30 animate-fade-in-up">
          Kinetic Elite System
        </span>
      </div>

      {/* Main Login Card */}
      <div className="bg-white rounded-card-mobile p-6 shadow-premium space-y-6 animate-card-slide-up">
        <div className="space-y-1">
          <h2 className="font-montserrat font-extrabold text-lg text-charcoal-deep">Welcome Back</h2>
          <p className="text-xs text-charcoal-muted font-medium">Log in to check progress, diet, and training.</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-charcoal-deep uppercase tracking-wider">Email Address</label>
            <input
              type="email"
              placeholder="e.g. client@akfitness.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError("") }}
              className="w-full bg-cream focus:bg-white border-2 border-transparent focus:border-lime-electric rounded-input px-4 py-3 text-xs font-semibold text-charcoal-deep shadow-inner transition-all outline-none"
              autoFocus
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-charcoal-deep uppercase tracking-wider">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError("") }}
              className="w-full bg-cream focus:bg-white border-2 border-transparent focus:border-lime-electric rounded-input px-4 py-3 text-xs font-semibold text-charcoal-deep shadow-inner transition-all outline-none"
              required
            />
            {error && (
              <p className="text-[10px] font-semibold text-warmRed-text bg-warmRed-tint px-3 py-2 rounded-input mt-1">
                {error}
              </p>
            )}
          </div>

          <div className="pt-2">
            <motion.button
              type="submit"
              disabled={loading || !email.trim() || !password}
              whileTap={{ scale: 0.97 }}
              className="w-full bg-lime-electric text-charcoal-deep font-montserrat font-black text-xs uppercase tracking-widest py-4 px-6 rounded-full shadow-bento hover:bg-lime-electric/95 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center"
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-charcoal-deep/30 border-t-charcoal-deep rounded-full animate-spin" />
                : "Sign In"}
            </motion.button>
          </div>
        </form>
      </div>

      {/* Footer terms */}
      <div className="text-center pb-6">
        <p className="text-[10px] text-charcoal-muted font-medium animate-fade-in-up">
          Premium Fitness Coaching PWA. Designed for results.
        </p>
      </div>
    </div>
  )
}
