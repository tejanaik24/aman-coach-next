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
    <div className="flex-1 flex flex-col justify-center gap-8 p-6 bg-bg-primary min-h-full">
      <div className="flex flex-col items-center text-center space-y-2">
        <p className="font-heading font-bold text-2xl text-text-primary">Aman Khurana</p>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-accent-orange">Fitness Coaching</p>
      </div>

      <div className="rounded-[28px] border border-border-subtle bg-bg-surface p-6 space-y-5">
        <div className="space-y-1">
          <h1 className="font-heading font-bold text-lg text-text-primary">Set your password</h1>
          <p className="text-xs text-text-muted">Choose a password you will remember. You will use it with your mobile number to log in.</p>
        </div>

        {error && (
          <p className="text-[11px] font-medium text-danger bg-danger/10 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">New password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-bg-elevated border border-border-subtle focus:border-accent-orange rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted transition-colors outline-none"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Confirm password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-bg-elevated border border-border-subtle focus:border-accent-orange rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted transition-colors outline-none"
              required
            />
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileTap={{ scale: 0.97 }}
            className="w-full bg-accent-orange text-bg-primary font-heading font-bold text-sm py-4 rounded-full disabled:opacity-50 flex items-center justify-center"
          >
            {loading
              ? <div className="w-4 h-4 border-2 border-bg-primary/30 border-t-bg-primary rounded-full animate-spin" />
              : "Set password & continue"}
          </motion.button>
        </form>
      </div>
    </div>
  )
}
