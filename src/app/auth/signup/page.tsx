"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "motion/react"
import { useAuth } from "@/hooks/useAuth"
import toast from "react-hot-toast"
import { UserPlus, Eye, EyeOff } from "lucide-react"

export default function SignupPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) {
      toast.error("Please fill in all required fields")
      return
    }
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }
    setLoading(true)
    try {
      await register(form.email, form.password, form.name, "client")
      toast.success("Account created!")
      router.push("/client/dashboard")
    } catch (err: unknown) {
      toast.error((err as Error).message || "Signup failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-black px-4 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.12),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(124,58,237,0.05),transparent_50%)]" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <Link href="/" className="font-heading text-3xl text-white tracking-wider block">
            AK FITNESS
          </Link>
          <p className="mt-2 text-sm text-zinc-500">Create your account</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-zinc-500 font-medium mb-1.5 uppercase tracking-wider">Full Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple focus:ring-1 focus:ring-purple/30"
                placeholder="Aman Khurana"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 font-medium mb-1.5 uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple focus:ring-1 focus:ring-purple/30"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 font-medium mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2.5 pr-10 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple focus:ring-1 focus:ring-purple/30"
                  placeholder="Min. 6 characters"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 font-medium mb-1.5 uppercase tracking-wider">Confirm Password</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple focus:ring-1 focus:ring-purple/30"
                placeholder="Confirm your password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-purple px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-purple-dark disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                <>
                  <UserPlus className="size-4" />
                  Create Account
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-500">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-purple-light font-medium hover:text-purple transition-colors">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
