"use client"

import { useState } from "react"
import { CheckCircle2 } from "lucide-react"
import toast from "react-hot-toast"
import { PublicPageShell } from "@/components/shared/PublicPageShell"

export default function ContractPage() {
  const [clientName, setClientName] = useState("")
  const [tel, setTel] = useState("")
  const [signature, setSignature] = useState("")
  const [date, setDate] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDone, setIsDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientName.trim() || !tel.trim() || !signature.trim() || !agreed) {
      toast.error("Name, phone, signature and agreement checkbox are required")
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/public/contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName, tel, signature, date, agreed }),
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
        <p className="font-heading text-2xl text-text-primary">Contract Signed</p>
        <p className="text-text-muted text-sm max-w-xs">Welcome to #teamAKF!</p>
      </div>
    )
  }

  const inputClass = "w-full bg-bg-elevated border border-border-subtle focus:border-accent-gold rounded-lg py-2.5 px-3 text-sm text-text-primary outline-none"
  const labelClass = "text-text-muted text-[11px] font-medium uppercase tracking-wide"

  return (
    <PublicPageShell eyebrow="Aman Khurana Fitness" title="Online Coaching Contract">
      <div className="ledger p-5 space-y-4 text-text-muted text-xs leading-relaxed">
        <p>
          Congratulations on your decision of joining #teamAKF & stepping into your fitness journey! With the help
          of our Customised & Tailored Plans, we as a team will gradually move forward in order to accomplish your
          goals keeping your Safety, Your Internal Health & Sustainability In top Priority. If your goal is to lose
          fat - then remember, you didn&rsquo;t gain fat overnight, you are not going to lose it overnight. If your
          goal is to Grown Muscle Mass, when you were born, there was no magic pill to make you 10 years old in a
          couple of days or weeks, same way there isn&rsquo;t any magic pill to get you 6 pack abs or make your
          Arnold Schwarzenegger In a couple of days or week. No one can win over &ldquo;TIME&rdquo;. Always
          remember, Patience & Consistency are the prime keys to achieve anything in your life - We Neither Opt Nor
          we Believe in any &ldquo;SHORT CUTS&rdquo;.
        </p>
        <p>
          In order to maximize your progress, it will be necessary for you to follow our plan with honesty,
          understand the discussed guidelines & work as a #team as i always say, it&rsquo;s always #teamwork. In the
          end, we can just show you the right path, you will only have to walk alone on it. And Remember, Exercise &
          Nutrition both plays equal roles in achieving our health goals. There is no such 80:20 thing, Neither one
          is superior or inferior to the other, both works hands on hands.
        </p>

        <div className="border-t border-border-subtle pt-4">
          <p className="font-heading italic text-base text-accent-gold mb-2">Nutrition Terms</p>
          <p>
            Although, your Nutrition plans will be custom made post knowing about your lifestyle & health history
            along with detailed discussion in regards to your likings, dislikings, food allergies etc. However as
            with any Nutritional intervention, there are risks of unknown food allergies, Digestive Disruptions,
            Gastrointestinal Distress etc. Which can only Be diagnosed & corrected after understanding your body&rsquo;s
            individual response to certain food items. So in volunteering for this, you agree to assume
            responsibility for these risks & willing to show your cooperation for the same in such possibilities.
            You also agree that, when asked, you have shared & provided every possible & important details
            contributing to any of your underlying health history with unhidden secrets.
          </p>
        </div>

        <div className="border-t border-border-subtle pt-4">
          <p className="font-heading italic text-base text-accent-gold mb-2">Exercise/Training Terms</p>
          <p>
            During your exercise program, every effort should be made to assure your safety first by prioritizing
            the provided technical Points & Exercise Execution methods. Although our plans are designed keeping all
            parameters in check & as per your body&rsquo;s individual needs. However, as with any exercise program,
            there are risks, including heart stress, Hyper/Hypotensive Crisis, Hypoglycemia, chances of
            musculoskeletal injuries etc. In volunteering for this program, you agree to assume responsibility for
            these risks & waive any possibility for personal damage. You also agree that, to your knowledge, you
            have no limiting physical conditions or disability that would preclude an exercise program. You also
            agree that, to implement our plans, if taken help from any trainer of your own without our consent or
            knowledge, we will not be responsible for any unwilling outcomes or damages
          </p>
        </div>

        <p className="border-t border-border-subtle pt-4">
          By signing below, you accept full responsibility for your own health & well-being with dignity AND
          promising your loyalty & sense of commitment towards your Health Coach.
        </p>
        <p>
          We Look Forward To Provide You The Best Coaching Experience You Ever Had. Gracefully Welcoming You To The
          #teamAKF Family!!
        </p>
        <p>Regards<br />Aman Khurana</p>
      </div>

      <form onSubmit={handleSubmit} className="ledger p-5 space-y-4">
        <div className="space-y-1">
          <label className={labelClass}>Client Name*</label>
          <input value={clientName} onChange={(e) => setClientName(e.target.value)} className={inputClass} required />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Tel*</label>
          <input value={tel} onChange={(e) => setTel(e.target.value)} className={inputClass} required />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Client Signature (type full name)*</label>
          <input value={signature} onChange={(e) => setSignature(e.target.value)} className={inputClass} required />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </div>
        <label className="flex items-start gap-2 text-text-muted text-xs">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
          I read and agree about all terms and conditions.
        </label>
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
