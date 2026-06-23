"use client"

import { useState, useRef, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { Phone, ChevronRight, ArrowLeft } from "lucide-react"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [step, setStep] = useState<"phone" | "otp">("phone")
  const [isLoading, setIsLoading] = useState(false)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])
  const supabase = createClient()

  async function handleSendOtp(e: FormEvent) {
    e.preventDefault()
    const fullPhone = `+91${phone.replace(/\D/g, "")}`
    if (fullPhone.length < 12) {
      toast.error("Enter a valid 10-digit phone number")
      return
    }
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
      })
      if (error) throw error
      setStep("otp")
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send OTP")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault()
    const otpString = otp.join("")
    if (otpString.length < 6) {
      toast.error("Enter the complete 6-digit OTP")
      return
    }
    setIsLoading(true)
    try {
      const fullPhone = `+91${phone.replace(/\D/g, "")}`
      const { error } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: otpString,
        type: "sms",
      })
      if (error) throw error

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Login failed")

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      if (profile?.role === "coach") {
        router.push("/coach/dashboard")
      } else {
        router.push("/client/home")
      }
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid OTP")
    } finally {
      setIsLoading(false)
    }
  }

  function handleOtpChange(index: number, value: string) {
    if (value.length > 1) {
      const chars = value.split("").slice(0, 6)
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
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-10">
          <div className="size-16 rounded-2xl bg-[#C9A84C] flex items-center justify-center mx-auto mb-4">
            <span className="text-[#0A0A0A] text-2xl font-bold" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
              AK
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
            AMAN KHURANA
          </h1>
          <p className="text-[#A0A0A0] text-sm mt-1">Elite Coaching Platform</p>
        </div>

        {step === "phone" ? (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div>
              <label className="text-sm text-[#A0A0A0] mb-2 block">Phone Number</label>
              <div className="flex items-center gap-3 bg-[#111111] border border-[#222222] rounded-2xl px-4 h-14 focus-within:border-[#C9A84C] transition-colors">
                <Phone className="size-5 text-[#C9A84C] flex-shrink-0" />
                <span className="text-white font-medium">+91</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="9876543210"
                  className="flex-1 bg-transparent text-white text-lg outline-none placeholder:text-[#555555]"
                  autoFocus
                  disabled={isLoading}
                />
              </div>
            </div>
            <motion.button
              type="submit"
              disabled={isLoading}
              whileTap={{ scale: 0.97 }}
              className="w-full h-14 rounded-2xl bg-[#C9A84C] text-[#0A0A0A] font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
            >
              {isLoading ? "Sending..." : "Send OTP"}
              {!isLoading && <ChevronRight className="size-5" />}
            </motion.button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <button
              type="button"
              onClick={() => { setStep("phone"); setOtp(["", "", "", "", "", ""]) }}
              className="flex items-center gap-1 text-[#A0A0A0] text-sm hover:text-white transition-colors"
            >
              <ArrowLeft className="size-4" />
              Change number
            </button>
            <div>
              <label className="text-sm text-[#A0A0A0] mb-3 block">
                Enter OTP sent to <span className="text-white">+91 {phone}</span>
              </label>
              <div className="flex gap-2 justify-center">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-12 h-14 bg-[#111111] border border-[#222222] rounded-xl text-center text-white text-xl font-bold outline-none focus:border-[#C9A84C] transition-colors"
                    disabled={isLoading}
                  />
                ))}
              </div>
            </div>
            <motion.button
              type="submit"
              disabled={isLoading}
              whileTap={{ scale: 0.97 }}
              className="w-full h-14 rounded-2xl bg-[#C9A84C] text-[#0A0A0A] font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
            >
              {isLoading ? "Verifying..." : "Verify & Enter"}
              {!isLoading && <ChevronRight className="size-5" />}
            </motion.button>
          </form>
        )}
      </motion.div>
    </div>
  )
}
