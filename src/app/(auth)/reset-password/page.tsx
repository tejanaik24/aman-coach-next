"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { createClient } from "@/lib/supabase/client"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function checkSession() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.replace("/login")
    }
    checkSession()
  }, [router])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }
    setError("")
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace("/login"); return }

      const { error: updateErr } = await supabase.auth.updateUser({ password })
      if (updateErr) { setError(updateErr.message); return }

      const { data: profile } = await supabase
        .from("profiles")
        .update({ must_reset_password: false })
        .eq("id", user.id)
        .select("role")
        .single()

      const role = profile?.role
      if (role === "coach") router.replace("/dashboard")
      else router.replace("/home")
    } catch {
      setError("Something went wrong. Try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-cream min-h-full">
      <div className="flex flex-col items-center mt-12 space-y-2 animate-fade-in-up">
        <div className="w-16 h-16 rounded-full bg-charcoal-deep flex items-center justify-center font-montserrat text-lime-electric font-black text-3xl tracking-tight">
          AK
        </div>
        <h1 className="font-montserrat font-black text-2xl uppercase tracking-wider text-charcoal-deep">
          First Login
        </h1>
        <span className="text-[10px] font-bold uppercase tracking-widest text-red-700 bg-red-50 px-3 py-1.5 rounded-full border border-red-200">
          Security Gate
        </span>
      </div>

      <div className="bg-white rounded-card-mobile p-6 shadow-premium space-y-6 animate-card-slide-up">
        <div className="space-y-1">
          <h2 className="font-montserrat font-extrabold text-lg text-charcoal-deep">Update Password</h2>
          <p className="text-xs text-charcoal-muted font-medium">To protect your account, please replace your default credentials.</p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 text-red-700 border border-red-100 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-charcoal-deep uppercase tracking-wider">New Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-cream focus:bg-white border-2 border-transparent focus:border-lime-electric rounded-input px-4 py-3 text-xs font-semibold text-charcoal-deep shadow-inner transition-all outline-none"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-charcoal-deep uppercase tracking-wider">Confirm Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-cream focus:bg-white border-2 border-transparent focus:border-lime-electric rounded-input px-4 py-3 text-xs font-semibold text-charcoal-deep shadow-inner transition-all outline-none"
              required
            />
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileTap={{ scale: 0.97 }}
            className="w-full bg-lime-electric text-charcoal-deep font-montserrat font-black text-xs uppercase tracking-widest py-4 px-6 rounded-full shadow-bento hover:bg-lime-electric/95 transition-colors cursor-pointer pt-4 disabled:opacity-50 flex items-center justify-center"
          >
            {loading
              ? <div className="w-4 h-4 border-2 border-charcoal-deep/30 border-t-charcoal-deep rounded-full animate-spin" />
              : "Set Password & Continue"}
          </motion.button>
        </form>
      </div>

      <div className="text-center pb-6 animate-fade-in-up">
        <p className="text-[10px] text-charcoal-muted font-medium">
          AK Fitness Security Protection Protocol
        </p>
      </div>
    </div>
  )
}
