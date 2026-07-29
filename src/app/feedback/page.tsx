"use client"

import { useState } from "react"
import { CheckCircle2 } from "lucide-react"
import toast from "react-hot-toast"
import { PublicPageShell } from "@/components/shared/PublicPageShell"

export default function FeedbackPage() {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [feedback, setFeedback] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDone, setIsDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !feedback.trim()) {
      toast.error("Name and feedback are required")
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/public/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, feedback }),
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
        <CheckCircle2 className="size-14 text-accent-orange" />
        <p className="font-heading text-2xl text-text-primary">Thank You</p>
        <p className="text-text-muted text-sm max-w-xs">Your feedback has been received.</p>
      </div>
    )
  }

  return (
    <PublicPageShell eyebrow="Aman Khurana Fitness" title="Feedback">
      <form onSubmit={handleSubmit} className="ledger p-5 space-y-4">
        <div className="space-y-1">
          <label className="text-text-muted text-[11px] font-medium uppercase tracking-wide">Name*</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-bg-elevated border border-border-subtle focus:border-accent-orange rounded-lg py-2.5 px-3 text-sm text-text-primary outline-none"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-text-muted text-[11px] font-medium uppercase tracking-wide">Contact Number</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-bg-elevated border border-border-subtle focus:border-accent-orange rounded-lg py-2.5 px-3 text-sm text-text-primary outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-text-muted text-[11px] font-medium uppercase tracking-wide">Your Feedback/Suggestion*</label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={5}
            className="w-full bg-bg-elevated border border-border-subtle focus:border-accent-orange rounded-lg py-2.5 px-3 text-sm text-text-primary outline-none resize-none"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-accent-orange text-bg-primary font-heading text-sm py-3 rounded-full disabled:opacity-60"
        >
          {isSubmitting ? "Submitting…" : "Submit"}
        </button>
      </form>
    </PublicPageShell>
  )
}
