"use client"

import { useState } from "react"
import { CheckCircle2 } from "lucide-react"
import toast from "react-hot-toast"
import { PublicPageShell } from "@/components/shared/PublicPageShell"

const INQUIRY_OPTIONS = [
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

const QUESTIONS = [
  "Has your doctor ever said you have a heart condition and that you should only do physical activity recommended by a doctor?",
  "Do you feel pain in your chest when you do physical activity? In the past month, have you had a chest pain when you were not doing physical activity?",
  "Do you lose balance because of dizziness or do you ever lose consciousness?",
  "Do you have a bone or joint problem (for example back, knee or hip) that could be made worse by a change in your physical activity?",
  "Is your doctor currently prescribing medication for your blood pressure or heart condition?",
  "Do you know of any other reason why you should not take part in physical activity?",
]

export default function ParQPage() {
  const [name, setName] = useState("")
  const [dob, setDob] = useState("")
  const [email, setEmail] = useState("")
  const [tel, setTel] = useState("")
  const [inquiryFor, setInquiryFor] = useState("")
  const [answers, setAnswers] = useState<Array<"Yes" | "No" | "">>(Array(6).fill(""))
  const [comment, setComment] = useState("")
  const [printName, setPrintName] = useState("")
  const [date, setDate] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDone, setIsDone] = useState(false)

  function setAnswer(i: number, val: "Yes" | "No") {
    setAnswers((prev) => prev.map((a, idx) => (idx === i ? val : a)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !tel.trim() || !printName.trim()) {
      toast.error("Name, phone and signature name are required")
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/public/par-q", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, dob, email, tel, inquiryFor, questions: QUESTIONS, answers, comment, printName, date }),
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
        <p className="font-heading text-2xl text-text-primary">PAR-Q Submitted</p>
        <p className="text-text-muted text-sm max-w-xs">Thank you for completing the questionnaire.</p>
      </div>
    )
  }

  const inputClass = "w-full bg-bg-elevated border border-border-subtle focus:border-accent-orange rounded-lg py-2.5 px-3 text-sm text-text-primary outline-none"
  const labelClass = "text-text-muted text-[11px] font-medium uppercase tracking-wide"

  return (
    <PublicPageShell eyebrow="Aman Khurana Fitness" title="PAR-Q">
      <div className="ledger p-5">
        <p className="text-text-muted text-xs leading-relaxed">
          If you&rsquo;re aged 15-69, the PAR-Q will tell you if you should check with your doctor before
          significantly changing your physical activity patterns. If you&rsquo;re over 69 years and aren&rsquo;t
          used to being very active, check with your doctor. Please read each question carefully and answer
          honestly by ticking YES/NO.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="ledger p-5 space-y-4">
        <div className="space-y-1">
          <label className={labelClass}>Name*</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>DOB</label>
          <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={inputClass} />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Tel*</label>
          <input value={tel} onChange={(e) => setTel(e.target.value)} className={inputClass} required />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Inquiry for</label>
          <select value={inquiryFor} onChange={(e) => setInquiryFor(e.target.value)} className={inputClass}>
            <option value="">--Select--</option>
            {INQUIRY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div className="border-t border-border-subtle pt-4 space-y-4">
          {QUESTIONS.map((q, i) => (
            <div key={i} className="space-y-2">
              <p className="text-text-primary text-xs leading-relaxed">{q}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAnswer(i, "Yes")}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium border ${answers[i] === "Yes" ? "bg-accent-orange text-bg-primary border-accent-orange" : "border-border-subtle text-text-muted"}`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setAnswer(i, "No")}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium border ${answers[i] === "No" ? "bg-accent-orange text-bg-primary border-accent-orange" : "border-border-subtle text-text-muted"}`}
                >
                  No
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <label className={labelClass}>If YES, please comment</label>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} className={`${inputClass} resize-none`} />
        </div>

        <div className="border-t border-border-subtle pt-4 text-text-muted text-xs leading-relaxed">
          I have read, understood and accurately completed this questionnaire. I confirm that I am voluntarily
          engaging in an acceptable level of exercise, and my participation involves a risk of injury.
        </div>

        <div className="space-y-1">
          <label className={labelClass}>Print Name (Signature)*</label>
          <input value={printName} onChange={(e) => setPrintName(e.target.value)} className={inputClass} required />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
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
