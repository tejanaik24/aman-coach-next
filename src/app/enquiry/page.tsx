"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle2 } from "lucide-react"
import toast from "react-hot-toast"
import { PublicPageShell } from "@/components/shared/PublicPageShell"

const INTEREST_OPTIONS = [
  "One time on call consult",
  "Bodybuilding Contest Prep (24 Weeks)",
  "Bodybuilding Contest Prep (12 Weeks)",
  "Complete Online Coaching - Any Lifestyle Goals (1 Year)",
  "Complete Online Coaching - Any Lifestyle Goals (24 Weeks)",
  "Complete Online Coaching - Any Lifestyle Goals (12 Weeks)",
  "Only Nutrition/Diet Consultancy (12 Weeks)",
  "Only Nutrition/Diet Consultancy (24 Weeks)",
  "Bodybuilding Posing Coaching (4 Virtual Sessions)",
  "Bodybuilding Posing Coaching (8 Virtual Sessions)",
  "Online Antenatal - Postnatal Complete Care (2nd - 4th Trimester)",
  "Child Nutrition (One Time Consult)",
  "Child Nutrition (1 Month Consult)",
  'Offline "Exercise Training Execution Camp" (3-5 Days)',
  "Online Training/Workout Consultancy (12 Weeks)",
  "POSTPARTUM Care - Training & Nutrition (12 Weeks)",
  "POSTPARTUM Care - Training & Nutrition (24 Weeks)",
  "Complete Coaching - Any Lifestyle Goals (12 Weeks)",
]

const HEARD_FROM_OPTIONS = ["client ref", "Flyer", "Hoarders", "Instagram"]

function EnquiryForm() {
  const searchParams = useSearchParams()
  const [name, setName] = useState("")
  const [countryCode, setCountryCode] = useState("+91")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [interest, setInterest] = useState(searchParams.get("interest") || "")
  const [heardFrom, setHeardFrom] = useState("")
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
      const res = await fetch("/api/public/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, countryCode, phone, email, interest, heardFrom }),
      })
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
        <p className="font-heading text-2xl text-text-primary">Enquiry Received</p>
        <p className="text-text-muted text-sm max-w-xs">
          You will Receive a Revert soon on your WhatsApp OR Email. Thank you.
        </p>
      </div>
    )
  }

  return (
    <PublicPageShell eyebrow="Aman Khurana Fitness" title="General Enquiry">
      <form onSubmit={handleSubmit} className="ledger p-5 space-y-4">
        <p className="font-heading italic text-lg text-text-primary">
          You will Receive a Revert soon on your WhatsApp OR Email. Thank you
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
          <label className="text-text-muted text-[11px] font-medium uppercase tracking-wide">Interest In</label>
          <select
            value={interest}
            onChange={(e) => setInterest(e.target.value)}
            className="w-full bg-bg-elevated border border-border-subtle focus:border-accent-gold rounded-lg py-2.5 px-3 text-sm text-text-primary outline-none"
          >
            <option value="">--Select--</option>
            {INTEREST_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-text-muted text-[11px] font-medium uppercase tracking-wide">From where you heard about us?</label>
          <select
            value={heardFrom}
            onChange={(e) => setHeardFrom(e.target.value)}
            className="w-full bg-bg-elevated border border-border-subtle focus:border-accent-gold rounded-lg py-2.5 px-3 text-sm text-text-primary outline-none"
          >
            <option value="">--Select--</option>
            {HEARD_FROM_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-accent-gold text-bg-primary font-heading text-sm py-3 rounded-full disabled:opacity-60"
        >
          {isSubmitting ? "Submitting…" : "Submit"}
        </button>
      </form>
    </PublicPageShell>
  )
}

export default function EnquiryPage() {
  return (
    <Suspense>
      <EnquiryForm />
    </Suspense>
  )
}
