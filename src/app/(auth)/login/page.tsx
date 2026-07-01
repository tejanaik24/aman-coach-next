"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { ChevronRight, ArrowLeft, Phone, Mail } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

type Method = "choose" | "phone" | "phone-otp" | "email"

export default function LoginPage() {
  const router = useRouter()
  const [method, setMethod] = useState<Method>("choose")
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  function reset(m: Method) {
    setError("")
    setMethod(m)
  }

  async function redirectAfterLogin() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const role = user?.user_metadata?.role ?? "client"
    router.replace(role === "coach" ? "/coach/dashboard" : "/home")
  }

  // ── Phone OTP ─────────────────────────────────────────────
  async function handleSendOtp(e: FormEvent) {
    e.preventDefault()
    setError("")
    const digits = phone.replace(/\D/g, "")
    if (digits.length !== 10) { setError("Enter a valid 10-digit number"); return }
    setLoading(true)
    try {
      const { error: err } = await createClient().auth.signInWithOtp({ phone: `+91${digits}` })
      if (err) setError(err.message)
      else setMethod("phone-otp")
    } catch { setError("Something went wrong. Try again.") }
    finally { setLoading(false) }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault()
    setError("")
    if (otp.length < 4) { setError("Enter the full OTP"); return }
    setLoading(true)
    try {
      const digits = phone.replace(/\D/g, "")
      const { error: err } = await createClient().auth.verifyOtp({
        phone: `+91${digits}`, token: otp, type: "sms",
      })
      if (err) setError(err.message)
      else await redirectAfterLogin()
    } catch { setError("Verification failed. Try again.") }
    finally { setLoading(false) }
  }

  // ── Email + Password ──────────────────────────────────────
  async function handleEmailLogin(e: FormEvent) {
    e.preventDefault()
    setError("")
    if (!email.trim() || !password) { setError("Enter email and password"); return }
    setLoading(true)
    try {
      const { error: err } = await createClient().auth.signInWithPassword({ email: email.trim(), password })
      if (err) setError(err.message)
      else await redirectAfterLogin()
    } catch { setError("Login failed. Try again.") }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col justify-between px-5 py-10">
      <div className="flex-1 flex flex-col justify-center">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-[72px] h-[72px] rounded-2xl bg-[#C9A84C] flex items-center justify-center mx-auto mb-5">
            <span className="text-black text-2xl font-bold" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>AK</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-widest" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>
            AMAN KHURANA
          </h1>
          <p className="text-[#A0A0A0] text-xs tracking-[0.3em] mt-1">ELITE COACHING PLATFORM</p>
          <div className="w-12 h-px bg-[#C9A84C] mx-auto mt-3" />
        </div>

        {/* Card */}
        <div className="bg-[#111111] rounded-3xl border border-[#222222] p-6">
          <AnimatePresence mode="wait">

            {/* Choose method */}
            {method === "choose" && (
              <motion.div key="choose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div>
                  <p className="text-white font-semibold text-lg" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>
                    Welcome back
                  </p>
                  <p className="text-[#A0A0A0] text-sm mt-0.5">How would you like to sign in?</p>
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => reset("phone")}
                  className="w-full h-14 rounded-2xl bg-[#1A1A1A] border border-[#333333] text-white font-semibold text-base flex items-center gap-3 px-4 hover:border-[#C9A84C] transition-colors"
                >
                  <Phone className="size-5 text-[#C9A84C]" />
                  Sign in with Phone (Client)
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => reset("email")}
                  className="w-full h-14 rounded-2xl bg-[#C9A84C] text-black font-bold text-base flex items-center gap-3 px-4"
                >
                  <Mail className="size-5" />
                  Sign in as Coach
                </motion.button>
              </motion.div>
            )}

            {/* Phone number entry */}
            {method === "phone" && (
              <motion.form key="phone" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                onSubmit={handleSendOtp} className="space-y-5">
                <BackHeader title="Your mobile number" sub="Enter your registered number" onBack={() => reset("choose")} />

                <div>
                  <div className={cn(
                    "flex items-center bg-[#1A1A1A] border rounded-2xl h-14 px-4 transition-colors",
                    error ? "border-red-500" : "border-[#333333] focus-within:border-[#C9A84C]"
                  )}>
                    <span className="text-[#C9A84C] font-semibold text-sm">+91</span>
                    <div className="w-px h-5 bg-[#333333] mx-3 flex-shrink-0" />
                    <input
                      type="tel" inputMode="numeric" value={phone}
                      onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setError("") }}
                      placeholder="9876543210"
                      className="flex-1 bg-transparent text-white outline-none placeholder:text-[#555555] text-base"
                      autoFocus
                    />
                  </div>
                  {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
                </div>

                <GoldButton loading={loading} disabled={phone.replace(/\D/g, "").length !== 10} label="Send OTP" />
              </motion.form>
            )}

            {/* OTP entry */}
            {method === "phone-otp" && (
              <motion.form key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                onSubmit={handleVerifyOtp} className="space-y-5">
                <BackHeader title="Verify OTP" sub={`Sent to +91 ${phone}`} onBack={() => reset("phone")} />

                <div>
                  <input
                    type="tel" inputMode="numeric" value={otp}
                    onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setError("") }}
                    placeholder="Enter OTP"
                    className={cn(
                      "w-full bg-[#1A1A1A] border rounded-2xl h-14 px-4 text-white text-center text-xl tracking-[0.5em] outline-none transition-colors placeholder:text-[#555555] placeholder:tracking-normal placeholder:text-sm",
                      error ? "border-red-500" : "border-[#333333] focus:border-[#C9A84C]"
                    )}
                    autoFocus
                  />
                  {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
                </div>

                <GoldButton loading={loading} disabled={otp.length < 4} label="Verify & Login" />
                <button type="button" onClick={handleSendOtp} disabled={loading}
                  className="w-full text-[#A0A0A0] text-sm text-center hover:text-white transition-colors">
                  Resend OTP
                </button>
              </motion.form>
            )}

            {/* Email + Password (Coach) */}
            {method === "email" && (
              <motion.form key="email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                onSubmit={handleEmailLogin} className="space-y-4">
                <BackHeader title="Coach Login" sub="Enter your email and password" onBack={() => reset("choose")} />

                <div>
                  <input
                    type="email" value={email}
                    onChange={(e) => { setEmail(e.target.value); setError("") }}
                    placeholder="coach@email.com"
                    className="w-full bg-[#1A1A1A] border border-[#333333] rounded-2xl h-14 px-4 text-white outline-none focus:border-[#C9A84C] transition-colors placeholder:text-[#555555]"
                    autoFocus
                  />
                </div>

                <div>
                  <input
                    type="password" value={password}
                    onChange={(e) => { setPassword(e.target.value); setError("") }}
                    placeholder="Password"
                    className={cn(
                      "w-full bg-[#1A1A1A] border rounded-2xl h-14 px-4 text-white outline-none transition-colors placeholder:text-[#555555]",
                      error ? "border-red-500" : "border-[#333333] focus:border-[#C9A84C]"
                    )}
                  />
                  {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
                </div>

                <GoldButton loading={loading} disabled={!email.trim() || !password} label="Login as Coach" />
              </motion.form>
            )}

          </AnimatePresence>
        </div>
      </div>

      <p className="text-center text-[#333333] text-xs mt-8">Powered by Vyzma</p>
    </div>
  )
}

function BackHeader({ title, sub, onBack }: { title: string; sub: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={onBack}
        className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center text-[#A0A0A0] hover:text-white transition-colors flex-shrink-0">
        <ArrowLeft className="size-4" />
      </button>
      <div>
        <p className="text-white font-semibold text-lg leading-tight" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>{title}</p>
        <p className="text-[#A0A0A0] text-xs">{sub}</p>
      </div>
    </div>
  )
}

function GoldButton({ loading, disabled, label }: { loading: boolean; disabled: boolean; label: string }) {
  return (
    <motion.button type="submit" disabled={loading || disabled} whileTap={{ scale: 0.97 }}
      className="w-full h-14 rounded-2xl bg-[#C9A84C] text-black font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50">
      {loading
        ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
        : <>{label} <ChevronRight className="size-5" /></>}
    </motion.button>
  )
}
