"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { ClientLayout } from "@/components/layout/ClientLayout"
import { useAuth } from "@/hooks/useAuth"
import { getClientProfile, getCheckins } from "@/lib/store"
import toast from "react-hot-toast"
import jsPDF from "jspdf"
import {
  AlertTriangle, Sparkles, Download, Flame, Check, ShieldAlert
} from "lucide-react"

import {
  FormHeader,
  ResumeDraftBanner,
  QuestionWrapper,
  ChipSingleSelect,
  NumberStepper,
  TextAreaDark,
  PhotoUploadScreen,
  FormFooter,
} from "@/components/forms/ConversationalFormComponents"

// ─── Types & Defaults ────────────────────────────────────────────────────────

type CheckinFormData = {
  // Section 1: Training
  t1_energy_workout: string
  t2_days_worked_out: string
  t3_workout_deviation: string
  t4_exercise_issues: string
  t5_cardio_steps_goal: string
  t6_injury_pain: string

  // Section 2: Diet
  d1_diet_deviation: string
  d2_appetite: string
  d3_digestion: string
  d4_constipation: string
  d5_diet_changes_wanted: string
  d6_food_add_remove: string

  // Section 3: General
  g1_day_energy: string
  g2_sleep_quality: string
  g3_water_intake: string
  g4_urine_color: string
  g5_coaching_feedback: string
  g6_additional_notes: string

  // Section 4: Anthropometrics
  w1_weight: string
  w2_abdomen: string
  w3_hips: string

  // Section 5: Pictures Upload (6 slots)
  front_pic: string[]
  back_pic: string[]
  both_side_pic: string[]
  right_side_pic: string[]
  fav_pose_pic: string[]
  mandatory_pose_pic: string[]
}

const defaultCheckinForm: CheckinFormData = {
  t1_energy_workout: "",
  t2_days_worked_out: "10",
  t3_workout_deviation: "",
  t4_exercise_issues: "",
  t5_cardio_steps_goal: "",
  t6_injury_pain: "",
  d1_diet_deviation: "",
  d2_appetite: "",
  d3_digestion: "",
  d4_constipation: "",
  d5_diet_changes_wanted: "",
  d6_food_add_remove: "",
  g1_day_energy: "",
  g2_sleep_quality: "",
  g3_water_intake: "",
  g4_urine_color: "",
  g5_coaching_feedback: "",
  g6_additional_notes: "",
  w1_weight: "73.5",
  w2_abdomen: "33.5",
  w3_hips: "37.5",
  front_pic: [],
  back_pic: [],
  both_side_pic: [],
  right_side_pic: [],
  fav_pose_pic: [],
  mandatory_pose_pic: []
}

// ─── Gold Confetti Canvas ───────────────────────────────────────────────────

function GoldConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles: {
      x: number; y: number; vx: number; vy: number; size: number; color: string; rotation: number; rotSpeed: number
    }[] = []

    const goldColors = ["#FF6A1A", "#FF8540", "#FFA66B", "#C2470A", "#FFFFFF"]

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 3,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.7) * 16,
        size: Math.random() * 8 + 4,
        color: goldColors[Math.floor(Math.random() * goldColors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10
      })
    }

    let animationId: number
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let alive = false

      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.25
        p.vx *= 0.98
        p.rotation += p.rotSpeed

        if (p.y < canvas.height) alive = true

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
        ctx.restore()
      })

      if (alive) {
        animationId = requestAnimationFrame(render)
      }
    }

    render()

    return () => cancelAnimationFrame(animationId)
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" />
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CheckinFormPage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<CheckinFormData>(defaultCheckinForm)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [cooldownDaysLeft, setCooldownDaysLeft] = useState<number | null>(null)
  const [clientObj, setClientObj] = useState<{ id: string } | null>(null)
  const [showResumeBanner, setShowResumeBanner] = useState(false)

  // Touch Swipe Gesture State
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)

  const TOTAL_STEPS = 27

  const set = useCallback(<K extends keyof CheckinFormData>(key: K, val: CheckinFormData[K]) => {
    setForm(prev => {
      const updated = { ...prev, [key]: val }
      try {
        if (user?.id) localStorage.setItem(`draft_checkin_${user.id}`, JSON.stringify(updated))
      } catch {}
      return updated
    })
  }, [user?.id])

  // Check 5-day cooldown guard
  useEffect(() => {
    if (!user?.id) return
    getClientProfile(user.id).then(async clientData => {
      if (!clientData) return
      setClientObj({ id: clientData.id })

      const checkins = await getCheckins(clientData.id)
      if (checkins && checkins.length > 0) {
        const lastCheckin = checkins[0]
        const lastDate = new Date(lastCheckin.submitted_at || Date.now())
        const daysAgo = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)

        if (daysAgo < 5) {
          setCooldownDaysLeft(Math.ceil(5 - daysAgo))
        }
      }
    }).catch(() => {})
  }, [user?.id])

  // Check existing draft
  useEffect(() => {
    if (!user?.id) return
    try {
      const saved = localStorage.getItem(`draft_checkin_${user.id}`)
      if (saved) {
        setShowResumeBanner(true)
      }
    } catch {}
  }, [user?.id])

  const handleResumeDraft = () => {
    if (!user?.id) return
    try {
      const saved = localStorage.getItem(`draft_checkin_${user.id}`)
      if (saved) {
        setForm(prev => ({ ...prev, ...JSON.parse(saved) }))
        toast.success("Resumed saved draft!")
      }
    } catch {}
    setShowResumeBanner(false)
  }

  const handleStartFresh = () => {
    if (!user?.id) return
    try {
      localStorage.removeItem(`draft_checkin_${user.id}`)
    } catch {}
    setForm(defaultCheckinForm)
    setShowResumeBanner(false)
    toast.success("Started fresh form")
  }

  // Next / Prev Handlers
  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep(s => s + 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } else {
      handleSubmit()
    }
  }

  const handlePrev = () => {
    if (step > 0) {
      setStep(s => s - 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  // Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return
    const distance = touchStartX.current - touchEndX.current
    const isSwipeLeft = distance > 70
    const isSwipeRight = distance < -70

    if (isSwipeLeft && step < TOTAL_STEPS) {
      handleNext()
    } else if (isSwipeRight && step > 0) {
      handlePrev()
    }

    touchStartX.current = null
    touchEndX.current = null
  }

  const generatePDF = () => {
    const doc = new jsPDF()
    doc.setFillColor(10, 10, 10)
    doc.rect(0, 0, 210, 297, "F")

    doc.setTextColor(255, 106, 26)
    doc.setFontSize(18)
    doc.text("AMAN KHURANA FITNESS — WEEKLY CHECK-IN REPORT", 15, 20)

    doc.setFontSize(10)
    doc.setTextColor(200, 200, 200)
    doc.text(`Client: ${profile?.name || "Client"} | Date: ${new Date().toLocaleDateString("en-IN")}`, 15, 28)

    let y = 40
    doc.setFontSize(12)
    doc.setTextColor(255, 106, 26)
    doc.text("1. TRAINING FEEDBACK", 15, y); y += 8
    doc.setFontSize(10)
    doc.setTextColor(255, 255, 255)
    doc.text(`Workout Energy: ${form.t1_energy_workout || "N/A"}`, 15, y); y += 6
    doc.text(`Days Worked Out: ${form.t2_days_worked_out}`, 15, y); y += 6
    doc.text(`Workout Deviations: ${form.t3_workout_deviation || "None"}`, 15, y); y += 6
    doc.text(`Exercise Issues: ${form.t4_exercise_issues || "None"}`, 15, y); y += 6
    doc.text(`Cardio Goals: ${form.t5_cardio_steps_goal || "Achieved"}`, 15, y); y += 6
    doc.text(`Injuries/Pains: ${form.t6_injury_pain || "None"}`, 15, y); y += 12

    doc.setFontSize(12)
    doc.setTextColor(255, 106, 26)
    doc.text("2. DIET FEEDBACK", 15, y); y += 8
    doc.setFontSize(10)
    doc.setTextColor(255, 255, 255)
    doc.text(`Diet Deviation: ${form.d1_diet_deviation || "None"}`, 15, y); y += 6
    doc.text(`Appetite: ${form.d2_appetite || "Normal"}`, 15, y); y += 6
    doc.text(`Digestion: ${form.d3_digestion || "Good"}`, 15, y); y += 6
    doc.text(`Constipation: ${form.d4_constipation || "Regular"}`, 15, y); y += 6
    doc.text(`Diet Changes Wanted: ${form.d5_diet_changes_wanted || "None"}`, 15, y); y += 6
    doc.text(`Food Add/Remove: ${form.d6_food_add_remove || "None"}`, 15, y); y += 12

    doc.setFontSize(12)
    doc.setTextColor(255, 106, 26)
    doc.text("3. MEASUREMENTS & ENERGY", 15, y); y += 8
    doc.setFontSize(10)
    doc.setTextColor(255, 255, 255)
    doc.text(`Weight: ${form.w1_weight} kg | Abdomen: ${form.w2_abdomen} in | Hips: ${form.w3_hips} in`, 15, y); y += 6
    doc.text(`Daily Energy: ${form.g1_day_energy} | Sleep: ${form.g2_sleep_quality} | Water: ${form.g3_water_intake}`, 15, y); y += 12

    doc.save(`Checkin_${profile?.name || "Client"}_${new Date().toISOString().slice(0, 10)}.pdf`)
    toast.success("PDF summary downloaded!")
  }

  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error("Please login to submit")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/forms/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          clientId: clientObj?.id,
          formType: "checkin",
          formData: form
        })
      })

      if (!res.ok) throw new Error("Submission failed")

      try {
        localStorage.removeItem(`draft_checkin_${user.id}`)
      } catch {}

      setDone(true)
      toast.success("Weekly check-in submitted successfully!")
    } catch (err: unknown) {
      console.error(err)
      toast.error("Error submitting check-in. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  // Cooldown Guard View
  if (cooldownDaysLeft !== null) {
    return (
      <ClientLayout>
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
          <div className="size-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4">
            <AlertTriangle className="size-8 text-amber-500" />
          </div>
          <h2 className="font-heading text-2xl text-white mb-2">CHECK-IN COOLDOWN ACTIVE</h2>
          <p className="text-sm text-zinc-400 max-w-xs mb-6">
            You have already submitted a check-in recently. Your next check-in unlocks in <strong className="text-[#FF6A1A]">{cooldownDaysLeft} day(s)</strong>.
          </p>
          <button
            onClick={() => router.push("/home")}
            className="px-6 py-3 rounded-full bg-zinc-800 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white transition-all"
          >
            Return to Home
          </button>
        </div>
      </ClientLayout>
    )
  }

  // Completion View
  if (done) {
    return (
      <ClientLayout>
        <GoldConfettiCanvas />
        <div className="flex flex-col items-center justify-center min-h-[85vh] text-center px-4 relative z-10 space-y-6">
          <div className="size-20 rounded-full bg-[#FF6A1A]/20 flex items-center justify-center border border-[#FF6A1A]/40 animate-bounce">
            <Sparkles className="size-10 text-[#FF6A1A]" />
          </div>
          <div>
            <span className="text-[#FF6A1A] font-heading font-extrabold text-2xl uppercase tracking-widest block mb-2">
              #TeamAKF
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl text-white font-extrabold tracking-wide">
              GREAT JOB THIS WEEK! 🎉
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xs mx-auto mt-3 leading-relaxed">
              Your coach will review your details and build your updated plan within 24 hours. Till then keep pushing hard!
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full max-w-xs pt-4">
            <button
              onClick={generatePDF}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-[#FF6A1A] text-[#FF6A1A] text-xs font-bold uppercase tracking-wider hover:bg-[#FF6A1A]/10 transition-all"
            >
              <Download className="size-4" /> Download PDF Report
            </button>
            <button
              onClick={() => router.push("/home")}
              className="w-full py-4 rounded-2xl bg-[#FF6A1A] text-xs font-bold uppercase tracking-wider text-white hover:bg-[#FF8540] transition-all shadow-xl shadow-[#FF6A1A]/20"
            >
              Go to Home
            </button>
          </div>
        </div>
      </ClientLayout>
    )
  }

  return (
    <ClientLayout>
      {showResumeBanner && (
        <ResumeDraftBanner onResume={handleResumeDraft} onReset={handleStartFresh} />
      )}

      {step > 0 && (
        <FormHeader
          currentStep={step - 1}
          totalSteps={TOTAL_STEPS}
          onBack={handlePrev}
        />
      )}

      {/* Main Full Viewport Question Container */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="min-h-[85vh] pt-16 pb-24 flex flex-col justify-center px-4 max-w-xl mx-auto w-full"
      >
        {/* STEP 0: WELCOME INTRO SCREEN */}
        {step === 0 && (
          <div className="w-full rounded-3xl bg-[#111111]/95 border border-[#FF6A1A]/25 p-6 sm:p-8 space-y-6 text-center shadow-2xl backdrop-blur-xl">
            <div>
              <span className="inline-block text-xs font-heading font-extrabold text-[#FF6A1A] uppercase tracking-widest bg-[#FF6A1A]/10 px-3 py-1 rounded-full border border-[#FF6A1A]/30">
                WEEK CHECK-IN
              </span>
            </div>
            <div className="text-6xl sm:text-7xl animate-bounce pt-2">🔥</div>
            <div>
              <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-white leading-tight">Time to Check In 🔥</h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-sm mx-auto">Good week or tough week — your coach needs the truth to keep your plan on track.</p>
            </div>
            <div className="inline-flex items-center gap-2 bg-[#FF6A1A]/10 border border-[#FF6A1A]/30 px-4 py-2 rounded-2xl text-xs font-extrabold text-[#FF6A1A] tracking-wide">
              <span>🔥</span> 7 Day Check-in Streak
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#141414] border border-zinc-800 rounded-xl p-2.5 text-center"><span className="text-xs font-bold text-zinc-300 block">⏱ ~5 mins</span></div>
              <div className="bg-[#141414] border border-zinc-800 rounded-xl p-2.5 text-center"><span className="text-xs font-bold text-zinc-300 block">📸 Photos</span></div>
              <div className="bg-[#141414] border border-zinc-800 rounded-xl p-2.5 text-center"><span className="text-xs font-bold text-zinc-300 block">💬 Coach reads</span></div>
            </div>
            <div className="bg-[#141414] border-l-4 border-[#FF6A1A] border-y border-r border-zinc-800 rounded-2xl p-4 text-left space-y-1">
              <p className="text-xs sm:text-sm text-zinc-300 italic">"Don't sugarcoat it. If you had a bad week, tell me why — that's how we fix it together."</p>
              <p className="text-xs font-bold text-[#FF6A1A] text-right">— Coach Aman Khurana</p>
            </div>
            <button onClick={handleNext} className="w-full py-4 rounded-2xl bg-[#FF6A1A] text-sm font-extrabold uppercase tracking-wider text-white hover:bg-[#FF8540] shadow-[0_0_20px_rgba(255, 106, 26,0.4)] transition-all">
              Let's Go 💪
            </button>
            <p className="text-xs text-zinc-500 font-mono">27 questions • Your coach will review within 24hrs</p>
          </div>
        )}

        {/* STEP 1: Q1 */}
        {step === 1 && (
          <QuestionWrapper
            title="How are your energy levels during working out?"
            subtitle="Rate your workout intensity, stamina, and power output over the past week."
          >
            <TextAreaDark
              value={form.t1_energy_workout}
              onChange={(val) => set("t1_energy_workout", val)}
              rows={4}
              placeholder="e.g. Energy was 8/10 on push days, but felt slightly depleted during leg day..."
            />
          </QuestionWrapper>
        )}

        {/* STEP 2: Q2 */}
        {step === 2 && (
          <QuestionWrapper
            title="How many days did you workout in the past 2 weeks?"
            subtitle="Tap + or - to select total completed workout sessions."
          >
            <NumberStepper
              value={form.t2_days_worked_out}
              onChange={(val) => set("t2_days_worked_out", val)}
              min={0}
              max={14}
              unit="days"
            />
          </QuestionWrapper>
        )}

        {/* STEP 3: Q3 */}
        {step === 3 && (
          <QuestionWrapper
            title="Any deviation from the workout? Did you miss any workout?"
            subtitle="Honesty helps Coach Aman adjust your workout volume and schedule."
          >
            <TextAreaDark
              value={form.t3_workout_deviation}
              onChange={(val) => set("t3_workout_deviation", val)}
              rows={4}
              placeholder="e.g. Missed leg day on Thursday due to late office meeting, completed rest 100%..."
            />
          </QuestionWrapper>
        )}

        {/* STEP 4: Q4 */}
        {step === 4 && (
          <QuestionWrapper
            title="Any major issues with any particular exercise?"
            subtitle="Mention exercise name & form issues so Coach can replace it."
          >
            <TextAreaDark
              value={form.t4_exercise_issues}
              onChange={(val) => set("t4_exercise_issues", val)}
              rows={4}
              placeholder="e.g. Incline dumbbell press shoulder discomfort..."
            />
          </QuestionWrapper>
        )}

        {/* STEP 5: Q5 */}
        {step === 5 && (
          <QuestionWrapper
            title="Did you achieve your Cardio/Steps Goals? If not, how much did you miss?"
            subtitle="Tracked on your phone pedometer or smartwatch."
          >
            <TextAreaDark
              value={form.t5_cardio_steps_goal}
              onChange={(val) => set("t5_cardio_steps_goal", val)}
              rows={4}
              placeholder="e.g. Achieved 10,000 steps on 5 days, missed target on weekend by ~2,000 steps..."
            />
          </QuestionWrapper>
        )}

        {/* STEP 6: Q6 */}
        {step === 6 && (
          <QuestionWrapper
            title="Any injury or ache/pains?"
            subtitle="Describe any joint stiffness, knee pain, lower back tightness, or shoulder discomfort."
          >
            <TextAreaDark
              value={form.t6_injury_pain}
              onChange={(val) => set("t6_injury_pain", val)}
              rows={4}
              placeholder="e.g. Mild lower back tightness after heavy deadlifts, no acute injury..."
            />
          </QuestionWrapper>
        )}

        {/* STEP 7: Q7 */}
        {step === 7 && (
          <QuestionWrapper
            title="Any deviation from the current diet plan? Did you miss any meal or eat something else?"
            subtitle="Mention cheat meals, missed meals, or outside food eaten."
          >
            <TextAreaDark
              value={form.d1_diet_deviation}
              onChange={(val) => set("d1_diet_deviation", val)}
              rows={4}
              placeholder="e.g. Ate 2 slices of pizza on Saturday evening, rest 100% on plan..."
            />
          </QuestionWrapper>
        )}

        {/* STEP 8: Q8 */}
        {step === 8 && (
          <QuestionWrapper
            title="How is your appetite/hunger? Feeling hungry or full?"
            subtitle="Appetite reflects metabolic rate and caloric deficit adaptation."
          >
            <TextAreaDark
              value={form.d2_appetite}
              onChange={(val) => set("d2_appetite", val)}
              rows={4}
              placeholder="e.g. Feeling satisfied after meals, slight craving before bedtime..."
            />
          </QuestionWrapper>
        )}

        {/* STEP 9: Q9 */}
        {step === 9 && (
          <QuestionWrapper
            title="How is your digestion?"
            subtitle="Check for bloating, gas, or stomach discomfort after meals."
          >
            <TextAreaDark
              value={form.d3_digestion}
              onChange={(val) => set("d3_digestion", val)}
              rows={4}
              placeholder="e.g. Digestion is light and comfortable, no bloating..."
            />
          </QuestionWrapper>
        )}

        {/* STEP 10: Q10 */}
        {step === 10 && (
          <QuestionWrapper
            title="Any signs of constipation? Stool Frequency?"
            subtitle="Gut motility is crucial for nutrient absorption & fat loss tracking."
          >
            <TextAreaDark
              value={form.d4_constipation}
              onChange={(val) => set("d4_constipation", val)}
              rows={4}
              placeholder="e.g. Regular 1-2 times daily, no constipation..."
            />
          </QuestionWrapper>
        )}

        {/* STEP 11: Q11 */}
        {step === 11 && (
          <QuestionWrapper
            title="Any specific change you want in your diet? Be specific!"
            subtitle="Tell your coach exact meal replacements or food adjustments."
          >
            <TextAreaDark
              value={form.d5_diet_changes_wanted}
              onChange={(val) => set("d5_diet_changes_wanted", val)}
              rows={4}
              placeholder="e.g. Please replace oats with eggs in breakfast if possible..."
            />
          </QuestionWrapper>
        )}

        {/* STEP 12: Q12 */}
        {step === 12 && (
          <QuestionWrapper
            title="Any food item you want to add or remove?"
            subtitle="Describe any ingredients you want included or removed from your plan."
          >
            <TextAreaDark
              value={form.d6_food_add_remove}
              onChange={(val) => set("d6_food_add_remove", val)}
              rows={4}
              placeholder="e.g. Remove broccoli, add spinach or paneer..."
            />
          </QuestionWrapper>
        )}

        {/* STEP 13: Q13 */}
        {step === 13 && (
          <QuestionWrapper
            title="How are your energy levels during the day?"
            subtitle="Outside of workouts, describe your overall energy and alertness."
          >
            <TextAreaDark
              value={form.g1_day_energy}
              onChange={(val) => set("g1_day_energy", val)}
              rows={4}
              placeholder="e.g. High energy all day, slight afternoon slump around 4 PM..."
            />
          </QuestionWrapper>
        )}

        {/* STEP 14: Q14 */}
        {step === 14 && (
          <QuestionWrapper
            title="How is your sleep quality & duration?"
            subtitle="Restful sleep supports muscle recovery, BMR, & hormonal balance."
          >
            <TextAreaDark
              value={form.g2_sleep_quality}
              onChange={(val) => set("g2_sleep_quality", val)}
              rows={4}
              placeholder="e.g. 7.5 hours per night, deep uninterrupted sleep..."
            />
          </QuestionWrapper>
        )}

        {/* STEP 15: Q15 */}
        {step === 15 && (
          <QuestionWrapper
            title="How much is your daily water intake?"
            subtitle="Approximate liters or bottles consumed daily."
          >
            <TextAreaDark
              value={form.g3_water_intake}
              onChange={(val) => set("g3_water_intake", val)}
              rows={4}
              placeholder="e.g. 3.5 to 4.0 liters daily..."
            />
          </QuestionWrapper>
        )}

        {/* STEP 16: Q16 */}
        {step === 16 && (
          <QuestionWrapper
            title="Urine colour throughout the day?"
            subtitle="Select the color that best describes your daily urine hydration level."
          >
            <ChipSingleSelect
              options={["Clear", "Light Yellow", "Yellow", "Dark Yellow", "Orange", "Brown"]}
              selectedValue={form.g4_urine_color}
              onChange={(val) => set("g4_urine_color", val)}
            />
          </QuestionWrapper>
        )}

        {/* STEP 17: Q17 */}
        {step === 17 && (
          <QuestionWrapper
            title="How are you feeling under my coaching? Any positive/negative feedback?"
            subtitle="Share your honest thoughts, progress feeling, and feedback for Coach Aman."
          >
            <TextAreaDark
              value={form.g5_coaching_feedback}
              onChange={(val) => set("g5_coaching_feedback", val)}
              rows={4}
              placeholder="e.g. Loving the strength gains! Feeling lighter and more energetic..."
            />
          </QuestionWrapper>
        )}

        {/* STEP 18: Q18 */}
        {step === 18 && (
          <QuestionWrapper
            title="If anything else you wish to mention, write it here:"
            subtitle="Any extra message, travel plans, or upcoming events."
          >
            <TextAreaDark
              value={form.g6_additional_notes}
              onChange={(val) => set("g6_additional_notes", val)}
              rows={4}
              placeholder="Write any extra notes for Coach Aman..."
            />
          </QuestionWrapper>
        )}

        {/* STEP 19: Q19 */}
        {step === 19 && (
          <QuestionWrapper
            title="Your current Weight (kg)"
            subtitle="Measured empty stomach in the morning after getting fresh."
          >
            <NumberStepper
              value={form.w1_weight}
              onChange={(val) => set("w1_weight", val)}
              min={30}
              max={250}
              step={0.1}
              unit="kg"
            />
          </QuestionWrapper>
        )}

        {/* STEP 20: Q20 */}
        {step === 20 && (
          <QuestionWrapper
            title="Abdomen measurement at navel (inches)"
            subtitle="Measured horizontally at navel level."
          >
            <NumberStepper
              value={form.w2_abdomen}
              onChange={(val) => set("w2_abdomen", val)}
              min={20}
              max={70}
              step={0.25}
              unit="in"
            />
          </QuestionWrapper>
        )}

        {/* STEP 21: Q21 */}
        {step === 21 && (
          <QuestionWrapper
            title="Hips measurement (inches)"
            subtitle="Measured around widest part of glutes."
          >
            <NumberStepper
              value={form.w3_hips}
              onChange={(val) => set("w3_hips", val)}
              min={20}
              max={70}
              step={0.25}
              unit="in"
            />
          </QuestionWrapper>
        )}

        {/* STEP 22: Q22 */}
        {step === 22 && (
          <QuestionWrapper
            title="Front View Progress Photo"
            subtitle="Morning empty stomach. Standing straight in clear room lighting."
          >
            <PhotoUploadScreen
              userId={user?.id}
              label="FRONT VIEW PHOTO"
              files={form.front_pic}
              onFilesChange={(files) => set("front_pic", files)}
            />
          </QuestionWrapper>
        )}

        {/* STEP 23: Q23 */}
        {step === 23 && (
          <QuestionWrapper
            title="Back View Progress Photo"
            subtitle="Morning empty stomach. Standing straight."
          >
            <PhotoUploadScreen
              userId={user?.id}
              label="BACK VIEW PHOTO"
              files={form.back_pic}
              onFilesChange={(files) => set("back_pic", files)}
            />
          </QuestionWrapper>
        )}

        {/* STEP 24: Q24 */}
        {step === 24 && (
          <QuestionWrapper
            title="Left Side View Progress Photo"
            subtitle="Morning empty stomach."
          >
            <PhotoUploadScreen
              userId={user?.id}
              label="LEFT SIDE PHOTO"
              files={form.both_side_pic}
              onFilesChange={(files) => set("both_side_pic", files)}
            />
          </QuestionWrapper>
        )}

        {/* STEP 25: Q25 */}
        {step === 25 && (
          <QuestionWrapper
            title="Right Side View Progress Photo"
            subtitle="Morning empty stomach."
          >
            <PhotoUploadScreen
              userId={user?.id}
              label="RIGHT SIDE PHOTO"
              files={form.right_side_pic}
              onFilesChange={(files) => set("right_side_pic", files)}
            />
          </QuestionWrapper>
        )}

        {/* STEP 26: Q26 */}
        {step === 26 && (
          <QuestionWrapper
            title="Favourite Pose (For Guys)"
            subtitle="Optional flex pose photo. Tap Skip if not uploading."
          >
            <PhotoUploadScreen
              userId={user?.id}
              label="FAVOURITE POSE PHOTO"
              files={form.fav_pose_pic}
              onFilesChange={(files) => set("fav_pose_pic", files)}
            />
          </QuestionWrapper>
        )}

        {/* STEP 27: Q27 */}
        {step === 27 && (
          <QuestionWrapper
            title="Mandatory Poses (Only for Competitive Athletes)"
            subtitle="Optional athlete pose photos. Tap Skip if not applicable."
          >
            <PhotoUploadScreen
              userId={user?.id}
              label="MANDATORY ATHLETE POSES"
              multiple
              files={form.mandatory_pose_pic}
              onFilesChange={(files) => set("mandatory_pose_pic", files)}
            />
          </QuestionWrapper>
        )}
      </div>

      {step > 0 && (
        <FormFooter
          onNext={handleNext}
          isLastStep={step === TOTAL_STEPS}
          submitting={submitting}
          showSkip={step === 26 || step === 27}
          onSkip={handleNext}
        />
      )}
    </ClientLayout>
  )
}
