"use client"

import { useState, useRef, useEffect, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { ChevronRight, ArrowLeft } from "lucide-react"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

export default function LoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState("")
  const [phoneError, setPhoneError] = useState("")
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [step, setStep] = useState<"phone" | "otp">("phone")
  const [isLoading, setIsLoading] = useState(false)
  const [otpShake, setOtpShake] = useState(false)
  const [resendSeconds, setResendSeconds] = useState(30)
  const [canResend, setCanResend] = useState(false)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (step !== "otp") return
    setResendSeconds(30)
    setCanResend(false)
    const timer = setInterval(() => {
      setResendSeconds((s) => {
        if (s <= 1) {
          clearInterval(timer)
          setCanResend(true)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [step])

  // Auto-submit when all 6 digits filled
  useEffect(() => {
    if (step === "otp" && otp.every((d) => d !== "")) {
      verifyOtp(otp.join(""))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, step])

  async function sendOtp(e?: FormEvent) {
    e?.preventDefault()
    const cleaned = phone.replace(/\D/g, "")
    if (cleaned.length !== 10) {
      setPhoneError("Enter a valid 10-digit number")
      return
    }
    setPhoneError("")
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: `+91${cleaned}` })
      if (error) throw error
      setStep("otp")
      setTimeout(() => otpRefs.current[0]?.focus(), 200)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send OTP")
    } finally {
      setIsLoading(false)
    }
  }

  async function verifyOtp(code: string) {
    if (code.length < 6 || isLoading) return
    setIsLoading(true)
    try {
      const fullPhone = `+91${phone.replace(/\D/g, "")}`
      const { error } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: code,
        type: "sms",
      })
      if (error) throw error

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Login failed")

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      router.push(profile?.role === "coach" ? "/coach/dashboard" : "/client/home")
      router.refresh()
    } catch (err) {
      setOtpShake(true)
      setOtp(["", "", "", "", "", ""])
      setTimeout(() => {
        setOtpShake(false)
        otpRefs.current[0]?.focus()
      }, 500)
      toast.error(err instanceof Error ? err.message : "Invalid OTP")
    } finally {
      setIsLoading(false)
    }
  }

  function handleSubmitOtp(e: FormEvent) {
    e.preventDefault()
    verifyOtp(otp.join(""))
  }

  function handleOtpChange(index: number, value: string) {
    if (value.length > 1) {
      const chars = value.replace(/\D/g, "").split("").slice(0, 6)
      const newOtp = [...otp]
      chars.forEach((char, i) => {
        if (index + i < 6) newOtp[index + i] = char
      })
      setOtp(newOtp)
      const nextIndex = Math.min(index + chars.length, 5)
      otpRefs.current[nextIndex]?.focus()
      return
    }
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    if (value && index < 5) otpRefs.current[index + 1]?.focus()
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col justify-between px-5 py-10">
      <div className="flex-1 flex flex-col justify-center">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-[72px] h-[72px] rounded-2xl bg-[#C9A84C] flex items-center justify-center mx-auto mb-5">
            <span
              className="text-black text-2xl font-bold"
              style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
            >
              AK
            </span>
          </div>
          <h1
            className="text-3xl font-bold text-white tracking-widest"
            style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
          >
            AMAN KHURANA
          </h1>
          <p className="text-[#A0A0A0] text-xs tracking-[0.3em] mt-1">ELITE COACHING PLATFORM</p>
          <div className="w-12 h-px bg-[#C9A84C] mx-auto mt-3" />
        </div>

        {/* Form card */}
        <div className="bg-[#111111] rounded-3xl border border-[#222222] p-6 transition focus-within:shadow-[0_0_0_1px_rgba(201,168,76,0.25)]">
          <AnimatePresence mode="wait">
            {step === "phone" ? (
              <motion.form
                key="phone"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
                onSubmit={sendOtp}
                className="space-y-5"
              >
                <div>
                  <label className="text-sm text-[#A0A0A0] mb-2 block">Phone Number</label>
                  <div
                    className={cn(
                      "flex items-center bg-[#1A1A1A] border rounded-2xl h-14 px-4 transition-colors",
                      phoneError
                        ? "border-red-500"
                        : "border-[#333333] focus-within:border-[#C9A84C]"
                    )}
                  >
                    <span className="text-[#C9A84C] font-semibold text-sm">+91</span>
                    <div className="w-px h-5 bg-[#333333] mx-3 flex-shrink-0" />
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                        if (phoneError) setPhoneError("")
                      }}
                      placeholder="9876543210"
                      className="flex-1 bg-transparent text-white text-base outline-none placeholder:text-[#555555]"
                      autoFocus
                      disabled={isLoading}
                    />
                  </div>
                  {phoneError && <p className="text-red-400 text-xs mt-1.5">{phoneError}</p>}
                </div>

                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileTap={{ scale: 0.97 }}
                  className="w-full h-14 rounded-2xl bg-[#C9A84C] text-black font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      Send OTP <ChevronRight className="size-5" />
                    </>
                  )}
                </motion.button>
              </motion.form>
            ) : (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                <button
                  type="button"
                  onClick={() => {
                    setStep("phone")
                    setOtp(["", "", "", "", "", ""])
                  }}
                  className="flex items-center gap-1 text-[#A0A0A0] text-sm hover:text-white transition-colors"
                >
                  <ArrowLeft className="size-4" />
                  Change number
                </button>

                <div>
                  <p className="text-sm text-[#A0A0A0] mb-4">
                    Enter the 6-digit code sent to{" "}
                    <span className="text-white font-medium">+91 {phone}</span>
                  </p>
                  <motion.div
                    className="flex gap-2 justify-between"
                    animate={
                      otpShake
                        ? { x: [0, -10, 10, -10, 10, -6, 6, -3, 3, 0] }
                        : { x: 0 }
                    }
                    transition={{ duration: 0.5 }}
                  >
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => {
                          otpRefs.current[i] = el
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className={cn(
                          "w-11 h-14 rounded-xl border text-center text-white text-xl font-bold outline-none transition-colors",
                          otpShake
                            ? "bg-red-500/10 border-red-500"
                            : "bg-[#1A1A1A] border-[#333333] focus:border-[#C9A84C]"
                        )}
                        disabled={isLoading}
                      />
                    ))}
                  </motion.div>
                </div>

                <form onSubmit={handleSubmitOtp}>
                  <motion.button
                    type="submit"
                    disabled={isLoading || otp.join("").length < 6}
                    whileTap={{ scale: 0.97 }}
                    className="w-full h-14 rounded-2xl bg-[#C9A84C] text-black font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : (
                      <>
                        Verify &amp; Enter <ChevronRight className="size-5" />
                      </>
                    )}
                  </motion.button>
                </form>

                <div className="text-center pt-1">
                  {canResend ? (
                    <button
                      type="button"
                      onClick={() => sendOtp()}
                      className="text-[#C9A84C] text-sm font-medium"
                    >
                      Resend OTP
                    </button>
                  ) : (
                    <p className="text-[#555555] text-sm">Resend in {resendSeconds}s</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-[#333333] text-xs mt-8">Powered by Vyzma</p>
    </div>
  )
}
