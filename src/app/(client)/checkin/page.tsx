"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { ClientLayout } from "@/components/layout/ClientLayout"
import { useAuth } from "@/hooks/useAuth"
import { getClientProfile, getCheckins } from "@/lib/store"
import toast from "react-hot-toast"
import jsPDF from "jspdf"
import {
  AlertTriangle, Sparkles, Download, Dumbbell, Utensils, Activity, Ruler, Camera,
  Smile, Flame, Battery, ShieldAlert, Heart, Check
} from "lucide-react"

import {
  FormHeader,
  ResumeDraftBanner,
  QuestionWrapper,
  ImageCardPicker,
  ChipMultiSelect,
  ChipSingleSelect,
  GoldSlider,
  NumberStepper,
  TextInputDark,
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
  t1_energy_workout: "8",
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
  g1_day_energy: "8",
  g2_sleep_quality: "8",
  g3_water_intake: "3.5",
  g4_urine_color: "",
  g5_coaching_feedback: "",
  g6_additional_notes: "",
  w1_weight: "70",
  w2_abdomen: "32",
  w3_hips: "36",
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

    const goldColors = ["#FFB800", "#FFD700", "#FFE082", "#D4AF37", "#FFFFFF"]

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
    if (step < TOTAL_STEPS - 1) {
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

    if (isSwipeLeft && step < TOTAL_STEPS - 1) {
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

    doc.setTextColor(255, 184, 0)
    doc.setFontSize(18)
    doc.text("AMAN KHURANA FITNESS — WEEKLY CHECK-IN REPORT", 15, 20)

    doc.setFontSize(10)
    doc.setTextColor(200, 200, 200)
    doc.text(`Client: ${profile?.name || "Client"} | Date: ${new Date().toLocaleDateString("en-IN")}`, 15, 28)

    let y = 40
    doc.setFontSize(12)
    doc.setTextColor(255, 184, 0)
    doc.text("1. TRAINING FEEDBACK", 15, y); y += 8
    doc.setFontSize(10)
    doc.setTextColor(255, 255, 255)
    doc.text(`Workout Energy: ${form.t1_energy_workout}/10`, 15, y); y += 6
    doc.text(`Days Worked Out: ${form.t2_days_worked_out}`, 15, y); y += 6
    doc.text(`Workout Deviations: ${form.t3_workout_deviation || "None"}`, 15, y); y += 6
    doc.text(`Exercise Issues: ${form.t4_exercise_issues || "None"}`, 15, y); y += 6
    doc.text(`Cardio Goals: ${form.t5_cardio_steps_goal || "Achieved"}`, 15, y); y += 6
    doc.text(`Injuries/Pains: ${form.t6_injury_pain || "None"}`, 15, y); y += 12

    doc.setFontSize(12)
    doc.setTextColor(255, 184, 0)
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
    doc.setTextColor(255, 184, 0)
    doc.text("3. MEASUREMENTS & ENERGY", 15, y); y += 8
    doc.setFontSize(10)
    doc.setTextColor(255, 255, 255)
    doc.text(`Weight: ${form.w1_weight} kg | Abdomen: ${form.w2_abdomen} in | Hips: ${form.w3_hips} in`, 15, y); y += 6
    doc.text(`Daily Energy: ${form.g1_day_energy}/10 | Sleep: ${form.g2_sleep_quality}/10 | Water: ${form.g3_water_intake}L`, 15, y); y += 12

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
            You have already submitted a check-in recently. Your next check-in unlocks in <strong className="text-[#FFB800]">{cooldownDaysLeft} day(s)</strong>.
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
          <div className="size-20 rounded-full bg-[#FFB800]/20 flex items-center justify-center border border-[#FFB800]/40 animate-bounce">
            <Sparkles className="size-10 text-[#FFB800]" />
          </div>
          <div>
            <span className="text-[#FFB800] font-heading font-extrabold text-2xl uppercase tracking-widest block mb-2">
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
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-[#FFB800] text-[#FFB800] text-xs font-bold uppercase tracking-wider hover:bg-[#FFB800]/10 transition-all"
            >
              <Download className="size-4" /> Download PDF Report
            </button>
            <button
              onClick={() => router.push("/home")}
              className="w-full py-4 rounded-2xl bg-[#FFB800] text-xs font-bold uppercase tracking-wider text-black hover:bg-[#FFC82C] transition-all shadow-xl shadow-[#FFB800]/20"
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

      <FormHeader
        currentStep={step}
        totalSteps={TOTAL_STEPS}
        onBack={handlePrev}
      />

      {/* Main Full Viewport Question Container */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="min-h-[85vh] pt-16 pb-24 flex flex-col justify-center px-4"
      >
        {/* STEP 1: Workout Energy */}
        {step === 0 && (
          <QuestionWrapper
            title="How were your energy levels during workouts?"
            subtitle="Rate your training energy on a scale of 1 to 10."
          >
            <GoldSlider
              value={parseFloat(form.t1_energy_workout) || 8}
              onChange={(val) => set("t1_energy_workout", val.toString())}
              min={1}
              max={10}
              labels={{ min: "1 (Exhausted)", max: "10 (Peak Power)" }}
            />
          </QuestionWrapper>
        )}

        {/* STEP 2: Days Worked Out */}
        {step === 1 && (
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

        {/* STEP 3: Workout Deviations */}
        {step === 2 && (
          <QuestionWrapper
            title="Did you have any workout deviations or missed sessions?"
            subtitle="Be honest with Coach Aman. Write details or leave blank if none."
          >
            <TextAreaDark
              value={form.t3_workout_deviation}
              onChange={(val) => set("t3_workout_deviation", val)}
              placeholder="e.g. Missed leg day on Thursday due to late office meeting..."
            />
          </QuestionWrapper>
        )}

        {/* STEP 4: Exercise Issues */}
        {step === 3 && (
          <QuestionWrapper
            title="Any issues or discomfort with any specific exercise?"
            subtitle="Mention exercise name & form issues if any."
          >
            <TextAreaDark
              value={form.t4_exercise_issues}
              onChange={(val) => set("t4_exercise_issues", val)}
              placeholder="e.g. Incline dumbbell press shoulder discomfort..."
            />
          </QuestionWrapper>
        )}

        {/* STEP 5: Cardio / Steps Goal */}
        {step === 4 && (
          <QuestionWrapper
            title="Did you hit your daily Cardio & Step goals?"
            subtitle="Select your goal completion status."
          >
            <ImageCardPicker
              selectedValue={form.t5_cardio_steps_goal}
              onChange={(val) => set("t5_cardio_steps_goal", val)}
              options={[
                { value: "Achieved 100%", label: "Achieved 100%", subtitle: "Hit steps & cardio every day", icon: <Check /> },
                { value: "Missed 1-2 Days", label: "Missed 1-2 Days", subtitle: "Slight deviation due to busy days", icon: <Flame /> },
                { value: "Missed Most Days", label: "Missed Most Days", subtitle: "Struggled with target", icon: <AlertTriangle /> },
                { value: "N/A - No Goal Set", label: "No Goal Assigned", subtitle: "Not currently on steps protocol", icon: <Smile /> },
              ]}
            />
          </QuestionWrapper>
        )}

        {/* STEP 6: Injury / Pain */}
        {step === 5 && (
          <QuestionWrapper
            title="Any injuries, stiffness, or joint pain?"
            subtitle="Select all areas affected."
          >
            <ChipMultiSelect
              options={["Knee Pain", "Shoulder Discomfort", "Lower Back", "Neck / Upper Trap", "Hip Stiffness", "Ankle", "None"]}
              selectedValues={form.t6_injury_pain ? form.t6_injury_pain.split(", ") : []}
              onChange={(vals) => set("t6_injury_pain", vals.join(", "))}
            />
          </QuestionWrapper>
        )}

        {/* STEP 7: Diet Deviation */}
        {step === 6 && (
          <QuestionWrapper
            title="Any deviation from your diet plan this week?"
            subtitle="Mention cheat meals, missed meals, or outside food."
          >
            <TextAreaDark
              value={form.d1_diet_deviation}
              onChange={(val) => set("d1_diet_deviation", val)}
              placeholder="e.g. Had 2 slices of pizza on Saturday dinner, rest 100% on plan..."
            />
          </QuestionWrapper>
        )}

        {/* STEP 8: Appetite */}
        {step === 7 && (
          <QuestionWrapper
            title="How was your appetite throughout the week?"
            subtitle="Select the option that best describes your hunger."
          >
            <ImageCardPicker
              selectedValue={form.d2_appetite}
              onChange={(val) => set("d2_appetite", val)}
              options={[
                { value: "Feeling Full", label: "Feeling Full", subtitle: "Satisfied after meals, no cravings", icon: <Smile /> },
                { value: "Normal Appetite", label: "Normal Appetite", subtitle: "Healthy hunger around meal times", icon: <Utensils /> },
                { value: "Feeling Very Hungry", label: "Very Hungry", subtitle: "Constantly craving more food", icon: <Flame /> },
                { value: "Low / No Appetite", label: "Low Appetite", subtitle: "Forcing meals down", icon: <Battery /> },
              ]}
            />
          </QuestionWrapper>
        )}

        {/* STEP 9: Digestion */}
        {step === 8 && (
          <QuestionWrapper
            title="How is your digestion feeling?"
            subtitle="Check for bloating or stomach distress."
          >
            <ImageCardPicker
              selectedValue={form.d3_digestion}
              onChange={(val) => set("d3_digestion", val)}
              options={[
                { value: "Excellent", label: "Excellent", subtitle: "Light & comfortable", icon: <Sparkles /> },
                { value: "Normal", label: "Normal", subtitle: "No issues", icon: <Check /> },
                { value: "Bloated / Gas", label: "Bloated / Gas", subtitle: "Feeling heavy after meals", icon: <AlertTriangle /> },
                { value: "Poor / Acidity", label: "Poor / Acidity", subtitle: "Frequent acid reflux / pain", icon: <ShieldAlert /> },
              ]}
            />
          </QuestionWrapper>
        )}

        {/* STEP 10: Constipation */}
        {step === 9 && (
          <QuestionWrapper
            title="Stool frequency & constipation signs?"
            subtitle="Gut health is key for progress tracking."
          >
            <ChipSingleSelect
              options={["Regular (1-2x daily)", "Mild Constipation", "Severe Constipation", "Irregular Stool"]}
              selectedValue={form.d4_constipation}
              onChange={(val) => set("d4_constipation", val)}
            />
          </QuestionWrapper>
        )}

        {/* STEP 11: Diet Changes Wanted */}
        {step === 10 && (
          <QuestionWrapper
            title="Any specific changes you want in your diet?"
            subtitle="Be specific with meal replacements or food preferences."
          >
            <TextAreaDark
              value={form.d5_diet_changes_wanted}
              onChange={(val) => set("d5_diet_changes_wanted", val)}
              placeholder="e.g. Please replace oats with eggs in breakfast if possible..."
            />
          </QuestionWrapper>
        )}

        {/* STEP 12: Food Add/Remove */}
        {step === 11 && (
          <QuestionWrapper
            title="Any specific food items to add or remove?"
            subtitle="Tell your coach your current taste preferences."
          >
            <TextAreaDark
              value={form.d6_food_add_remove}
              onChange={(val) => set("d6_food_add_remove", val)}
              placeholder="e.g. Remove broccoli, add spinach or paneer..."
            />
          </QuestionWrapper>
        )}

        {/* STEP 13: Daily Energy */}
        {step === 12 && (
          <QuestionWrapper
            title="Rate your overall daily energy levels."
            subtitle="Outside of workouts, how energetic did you feel?"
          >
            <GoldSlider
              value={parseFloat(form.g1_day_energy) || 8}
              onChange={(val) => set("g1_day_energy", val.toString())}
              min={1}
              max={10}
              labels={{ min: "1 (Constant Fatigue)", max: "10 (High Energy All Day)" }}
            />
          </QuestionWrapper>
        )}

        {/* STEP 14: Sleep Quality */}
        {step === 13 && (
          <QuestionWrapper
            title="Rate your sleep quality & recovery."
            subtitle="Did you wake up feeling refreshed?"
          >
            <GoldSlider
              value={parseFloat(form.g2_sleep_quality) || 8}
              onChange={(val) => set("g2_sleep_quality", val.toString())}
              min={1}
              max={10}
              labels={{ min: "1 (Restless / Broken)", max: "10 (Deep 8h Sleep)" }}
            />
          </QuestionWrapper>
        )}

        {/* STEP 15: Water Intake */}
        {step === 14 && (
          <QuestionWrapper
            title="What was your average daily water intake?"
            subtitle="Drag slider to select liters per day."
          >
            <GoldSlider
              value={parseFloat(form.g3_water_intake) || 3.5}
              onChange={(val) => set("g3_water_intake", val.toString())}
              min={1.0}
              max={6.0}
              step={0.5}
              unit="L"
              labels={{ min: "1.0 L", max: "6.0 L" }}
            />
          </QuestionWrapper>
        )}

        {/* STEP 16: Urine Color */}
        {step === 15 && (
          <QuestionWrapper
            title="Average urine color throughout the day?"
            subtitle="Indicator of daily hydration levels."
          >
            <ImageCardPicker
              selectedValue={form.g4_urine_color}
              onChange={(val) => set("g4_urine_color", val)}
              options={[
                { value: "Clear / Transparent", label: "Clear / Transparent", subtitle: "Well hydrated", icon: <Sparkles /> },
                { value: "Pale Yellow (Optimal)", label: "Pale Yellow", subtitle: "Optimal hydration", icon: <Check /> },
                { value: "Dark Yellow", label: "Dark Yellow", subtitle: "Needs more water", icon: <AlertTriangle /> },
                { value: "Amber / Brownish", label: "Amber / Dehydrated", subtitle: "Severely dehydrated", icon: <ShieldAlert /> },
              ]}
            />
          </QuestionWrapper>
        )}

        {/* STEP 17: Coaching Feedback */}
        {step === 16 && (
          <QuestionWrapper
            title="How are you feeling under my coaching till now?"
            subtitle="Share your honest positive or constructive feedback."
          >
            <TextAreaDark
              value={form.g5_coaching_feedback}
              onChange={(val) => set("g5_coaching_feedback", val)}
              placeholder="e.g. Loving the strength gains! Feeling much lighter..."
            />
          </QuestionWrapper>
        )}

        {/* STEP 18: Additional Notes */}
        {step === 17 && (
          <QuestionWrapper
            title="Any extra message or notes for Coach Aman?"
            subtitle="Anything else you want to bring to Coach's attention."
          >
            <TextAreaDark
              value={form.g6_additional_notes}
              onChange={(val) => set("g6_additional_notes", val)}
              placeholder="Write any extra notes here..."
            />
          </QuestionWrapper>
        )}

        {/* STEP 19: Body Weight */}
        {step === 18 && (
          <QuestionWrapper
            title="Current Morning Weight (kg)"
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

        {/* STEP 20: Abdomen Measurement */}
        {step === 19 && (
          <QuestionWrapper
            title="Abdomen Measurement (inches)"
            subtitle="Measured at navel level."
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

        {/* STEP 21: Hips Measurement */}
        {step === 20 && (
          <QuestionWrapper
            title="Hips Measurement (inches)"
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

        {/* STEP 22: Front Photo */}
        {step === 21 && (
          <QuestionWrapper
            title="Front View Progress Photo"
            subtitle="Morning empty stomach. Clear front lighting."
          >
            <PhotoUploadScreen
              label="FRONT VIEW PHOTO"
              files={form.front_pic}
              onFilesChange={(f) => set("front_pic", f)}
            />
          </QuestionWrapper>
        )}

        {/* STEP 23: Back Photo */}
        {step === 22 && (
          <QuestionWrapper
            title="Back View Progress Photo"
            subtitle="Morning empty stomach. Standing straight."
          >
            <PhotoUploadScreen
              label="BACK VIEW PHOTO"
              files={form.back_pic}
              onFilesChange={(f) => set("back_pic", f)}
            />
          </QuestionWrapper>
        )}

        {/* STEP 24: Left Side Photo */}
        {step === 23 && (
          <QuestionWrapper
            title="Left Side View Progress Photo"
            subtitle="Morning empty stomach. Profile view."
          >
            <PhotoUploadScreen
              label="LEFT SIDE PHOTO"
              files={form.both_side_pic}
              onFilesChange={(f) => set("both_side_pic", f)}
            />
          </QuestionWrapper>
        )}

        {/* STEP 25: Right Side Photo */}
        {step === 24 && (
          <QuestionWrapper
            title="Right Side View Progress Photo"
            subtitle="Morning empty stomach. Profile view."
          >
            <PhotoUploadScreen
              label="RIGHT SIDE PHOTO"
              files={form.right_side_pic}
              onFilesChange={(f) => set("right_side_pic", f)}
            />
          </QuestionWrapper>
        )}

        {/* STEP 26: Favourite Pose Photo */}
        {step === 25 && (
          <QuestionWrapper
            title="Favourite Flex Pose Photo (Optional)"
            subtitle="Show off your favorite flex or physique angle!"
          >
            <PhotoUploadScreen
              label="FAVOURITE POSE PHOTO"
              files={form.fav_pose_pic}
              onFilesChange={(f) => set("fav_pose_pic", f)}
            />
          </QuestionWrapper>
        )}

        {/* STEP 27: Mandatory Pose Photo (Athletes) */}
        {step === 26 && (
          <QuestionWrapper
            title="Mandatory Athlete Poses (Optional)"
            subtitle="Only required for competitive bodybuilding clients."
          >
            <PhotoUploadScreen
              label="MANDATORY POSES"
              files={form.mandatory_pose_pic}
              onFilesChange={(f) => set("mandatory_pose_pic", f)}
              multiple
            />
          </QuestionWrapper>
        )}
      </div>

      <FormFooter
        onNext={handleNext}
        isLastStep={step === TOTAL_STEPS - 1}
        submitting={submitting}
        showSkip={step >= 21}
        onSkip={handleNext}
      />
    </ClientLayout>
  )
}
