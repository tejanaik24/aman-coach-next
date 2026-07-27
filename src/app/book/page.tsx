"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import toast from "react-hot-toast"

const UPI_ID = "aman.khurana.1460-1@okhdfcbank"
const AMOUNT = 1000
const UPI_LINK = `upi://pay?pa=${UPI_ID}&pn=Aman%20Khurana%20Fitness&am=${AMOUNT}&cu=INR`

export default function BookConsultationPage() {
  const [name, setName] = useState("")
  const [countryCode, setCountryCode] = useState("+91")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDone, setIsDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) {
      toast.error("Name and mobile number are required")
      return
    }
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append("name", name.trim())
      formData.append("countryCode", countryCode)
      formData.append("phone", phone.trim())
      formData.append("email", email.trim())
      if (screenshot) formData.append("screenshot", screenshot)

      const res = await fetch("/api/public/book-consultation", { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Something went wrong, please try again")
        return
      }
      setIsDone(true)
    } catch {
      toast.error("Network error, please try again")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isDone) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4">
        <CheckCircle2 className="size-14 text-accent-gold" />
        <p className="font-heading text-2xl text-text-primary">Booking Received</p>
        <p className="text-text-muted text-sm max-w-xs">
          You will receive a revert soon on your WhatsApp or Email. Thank you.
        </p>
        <Link href="/" className="text-accent-gold text-xs font-medium uppercase tracking-widest mt-4">
          ← Back to Home
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative bg-bg-primary">
      <div className="ghost-bg" style={{ backgroundImage: "url(/images/backgrounds/ghost-fees.jpg)" }} />
      <div className="grain-overlay" />
      <div className="relative z-10 px-5 pt-8 pb-16 max-w-lg mx-auto space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-text-muted text-xs font-medium uppercase tracking-widest">
          <ArrowLeft className="size-3.5" /> Home
        </Link>

        <div>
          <p className="text-text-muted text-[11px] font-medium uppercase tracking-[0.2em] mb-2">
            Aman Khurana Fitness
          </p>
          <h1 className="font-heading italic text-4xl text-white">Book A Consultation Call</h1>
        </div>

        {/* Payment card */}
        <div className="ledger p-5 space-y-3">
          <p className="text-text-muted text-[11px] font-medium uppercase tracking-[0.14em]">Scan to pay with any UPI app</p>
          <div className="flex items-baseline justify-between border-t border-border-subtle pt-3">
            <span className="text-text-muted text-xs">UPI ID</span>
            <span className="font-heading text-sm text-text-primary">{UPI_ID}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-text-muted text-xs">Amount</span>
            <span className="font-heading text-2xl text-accent-gold">₹{AMOUNT.toLocaleString("en-IN")}.00</span>
          </div>
          <a
            href={UPI_LINK}
            className="block w-full text-center bg-accent-gold text-bg-primary font-heading text-sm py-3 rounded-full mt-2"
          >
            Pay via UPI App
          </a>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="ledger p-5 space-y-4">
          <p className="font-heading italic text-lg text-text-primary">
            You will receive a revert soon on your WhatsApp or Email. Thank you.
          </p>

          <div className="space-y-1">
            <label className="text-text-muted text-[11px] font-medium uppercase tracking-wide">Full Name*</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-bg-elevated border border-border-subtle focus:border-accent-gold rounded-lg py-2.5 px-3 text-sm text-text-primary outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-text-muted text-[11px] font-medium uppercase tracking-wide">Code*</label>
              <input
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full bg-bg-elevated border border-border-subtle focus:border-accent-gold rounded-lg py-2.5 px-3 text-sm text-text-primary outline-none"
                required
              />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-text-muted text-[11px] font-medium uppercase tracking-wide">Mobile Number*</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-bg-elevated border border-border-subtle focus:border-accent-gold rounded-lg py-2.5 px-3 text-sm text-text-primary outline-none"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-text-muted text-[11px] font-medium uppercase tracking-wide">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-bg-elevated border border-border-subtle focus:border-accent-gold rounded-lg py-2.5 px-3 text-sm text-text-primary outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-text-muted text-[11px] font-medium uppercase tracking-wide">Transaction Screenshot</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
              className="w-full text-text-muted text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-border-subtle file:bg-bg-elevated file:text-text-primary file:text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-accent-gold text-bg-primary font-heading text-sm py-3 rounded-full disabled:opacity-60"
          >
            {isSubmitting ? "Submitting…" : "Submit"}
          </button>
        </form>
      </div>
    </div>
  )
}
