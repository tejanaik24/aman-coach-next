"use client"

import { useState } from "react"
import { ClientLayout } from "@/components/layout/ClientLayout"
import { useAuth } from "@/hooks/useAuth"
import { addCheckin } from "@/lib/store"
import toast from "react-hot-toast"
import { motion, AnimatePresence } from "motion/react"
import { Dumbbell, Utensils, Sun, Ruler, Camera, Check, ChevronLeft, ChevronRight, ClipboardCheck, X } from "lucide-react"

// ─── Steps ───────────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Training", icon: Dumbbell },
  { label: "Diet", icon: Utensils },
  { label: "General", icon: Sun },
  { label: "Measurements", icon: Ruler },
  { label: "Photos", icon: Camera },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="block text-sm text-zinc-300 mb-1.5">
      {children}
      {optional && <span className="text-zinc-600 text-xs ml-1">(optional)</span>}
    </label>
  )
}

function TextArea({ label, value, onChange, placeholder, optional, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; optional?: boolean; rows?: number
}) {
  return (
    <div>
      <FieldLabel optional={optional}>{label}</FieldLabel>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-xl bg-[#111111] border border-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800]/30 transition-colors resize-none"
      />
    </div>
  )
}

function NumberField({ label, value, onChange, placeholder, suffix }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; suffix?: string
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded-xl bg-[#111111] border border-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800]/30 transition-colors"
        />
        {suffix && <span className="text-zinc-500 text-xs w-6">{suffix}</span>}
      </div>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#111111] p-5 space-y-4">
      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">{title}</p>
      {children}
    </div>
  )
}

function PhotoCard({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void
}) {
  const handleCapture = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.capture = "environment"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const canvas = document.createElement("canvas")
      const img = new Image()
      const reader = new FileReader()
      reader.onload = (ev) => {
        img.onload = () => {
          const MAX = 800
          const ratio = Math.min(MAX / img.width, MAX / img.height, 1)
          canvas.width = img.width * ratio
          canvas.height = img.height * ratio
          canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height)
          onChange(canvas.toDataURL("image/jpeg", 0.75))
        }
        img.src = ev.target?.result as string
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  return (
    <div className="space-y-1">
      <p className="text-xs text-zinc-400 font-medium">{label}</p>
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-[#FFB800]/30 aspect-[3/4]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label} className="w-full h-full object-cover" />
          <button type="button" onClick={() => onChange("")}
            className="absolute top-2 right-2 size-6 rounded-full bg-black/70 flex items-center justify-center">
            <X className="size-3 text-white" />
          </button>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 py-2 px-3">
            <p className="text-xs text-green-400 flex items-center gap-1"><Check className="size-3" /> Captured</p>
          </div>
        </div>
      ) : (
        <button type="button" onClick={handleCapture}
          className="w-full aspect-[3/4] rounded-xl border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center gap-2 hover:border-[#FFB800]/40 transition-colors">
          <Camera className="size-7 text-zinc-500" />
          <p className="text-xs text-zinc-500">Tap to capture</p>
        </button>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type FormState = {
  // Training
  workoutEnergy: string
  workoutDays: string
  workoutDeviation: string
  exerciseIssues: string
  cardioAchievement: string
  // Diet
  dietDeviation: string
  appetite: string
  digestion: string
  stoolFrequency: string
  dietChangeRequest: string
  foodAddRemove: string
  // General
  dailyEnergy: string
  sleepQuality: string
  waterIntake: string
  urineColor: string
  coachingFeeling: string
  additionalNotes: string
  // Measurements
  weight: string
  abdomen: string
  hips: string
  // Photos
  photoFront: string
  photoBack: string
  photoLeft: string
  photoRight: string
  photoFavPose: string
}

const defaultForm: FormState = {
  workoutEnergy: "", workoutDays: "", workoutDeviation: "", exerciseIssues: "", cardioAchievement: "",
  dietDeviation: "", appetite: "", digestion: "", stoolFrequency: "", dietChangeRequest: "", foodAddRemove: "",
  dailyEnergy: "", sleepQuality: "", waterIntake: "", urineColor: "", coachingFeeling: "", additionalNotes: "",
  weight: "", abdomen: "", hips: "",
  photoFront: "", photoBack: "", photoLeft: "", photoRight: "", photoFavPose: "",
}

export default function CheckinPage() {
  const { user } = useAuth()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState<FormState>(defaultForm)

  const set = <K extends keyof FormState>(key: K, val: string) =>
    setForm(prev => ({ ...prev, [key]: val }))

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const handlePrev = () => {
    if (step > 0) {
      setStep(s => s - 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const handleSubmit = async () => {
    if (!user?.id) return
    setSubmitting(true)
    try {
      const photos = [form.photoFront, form.photoBack, form.photoLeft, form.photoRight, form.photoFavPose]
        .filter(Boolean)
      await addCheckin({
        clientId: user.id,
        coachId: "",
        date: new Date(),
        weight: form.weight ? Number(form.weight) : undefined,
        abdomen: form.abdomen ? Number(form.abdomen) : undefined,
        hips: form.hips ? Number(form.hips) : undefined,
        photos,
        notes: form.additionalNotes,
        feedback: {
          workoutEnergy: form.workoutEnergy || undefined,
          workoutDays: form.workoutDays ? Number(form.workoutDays) : undefined,
          workoutDeviation: form.workoutDeviation || undefined,
          exerciseIssues: form.exerciseIssues || undefined,
          cardioAchievement: form.cardioAchievement || undefined,
          dietDeviation: form.dietDeviation || undefined,
          appetite: form.appetite || undefined,
          digestion: form.digestion || undefined,
          stoolFrequency: form.stoolFrequency || undefined,
          dietChangeRequest: form.dietChangeRequest || undefined,
          foodAddRemove: form.foodAddRemove || undefined,
          dailyEnergy: form.dailyEnergy || undefined,
          sleepQuality: form.sleepQuality || undefined,
          waterIntake: form.waterIntake || undefined,
          urineColor: form.urineColor || undefined,
          coachingFeeling: form.coachingFeeling || undefined,
        },
      })
      setDone(true)
    } catch {
      toast.error("Failed to submit. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <ClientLayout>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center px-4"
        >
          <div className="size-20 rounded-full bg-[#FFB800]/20 flex items-center justify-center mb-6">
            <Check className="size-10 text-[#FFB800]" />
          </div>
          <h2 className="font-heading text-3xl text-white mb-3">CHECK-IN DONE! 🎉</h2>
          <p className="text-sm text-zinc-400 max-w-xs">
            Aman will review your updates and get back to you with any plan changes. Keep crushing it!
          </p>
        </motion.div>
      </ClientLayout>
    )
  }

  return (
    <ClientLayout>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <ClipboardCheck className="size-6 text-[#FFB800]" />
        <h1 className="font-heading text-2xl text-white">BI-WEEKLY CHECK-IN</h1>
      </div>
      <p className="text-xs text-zinc-500 mb-6">Update Aman on your progress every 2 weeks</p>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-zinc-500">
            Step {step + 1} of {STEPS.length} · {STEPS[step].label}
          </p>
          <p className="text-xs text-[#FFB800]">{Math.round(((step + 1) / STEPS.length) * 100)}%</p>
        </div>
        <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #B28000, #FFB800, #FFD200)" }}
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
          />
        </div>
        <div className="flex gap-1 mt-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            return (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div className={`size-7 rounded-full flex items-center justify-center transition-colors ${
                  i < step ? "bg-[#FFB800] text-black" :
                  i === step ? "bg-[#FFB800]/20 border border-[#FFB800] text-[#FFB800]" :
                  "bg-zinc-900 border border-zinc-800 text-zinc-600"
                }`}>
                  {i < step ? <Check className="size-3" /> : <Icon className="size-3" />}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.22 }}
          className="space-y-4 pb-4"
        >

          {/* STEP 1 — Training Feedback */}
          {step === 0 && (
            <SectionCard title="Training Feedback">
              <TextArea
                label="How are your energy levels during workouts?"
                value={form.workoutEnergy}
                onChange={v => set("workoutEnergy", v)}
                placeholder="e.g. I feel strong in the first half but crash in the last 30 min…"
              />
              <div>
                <FieldLabel optional>How many days did you work out in the past 2 weeks?</FieldLabel>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={14}
                  value={form.workoutDays}
                  onChange={e => set("workoutDays", e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full rounded-xl bg-[#111111] border border-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800]/30"
                />
              </div>
              <TextArea
                label="Any deviation from the workout? Did you miss any sessions?"
                value={form.workoutDeviation}
                onChange={v => set("workoutDeviation", v)}
                placeholder="e.g. Missed leg day twice due to work travel…"
                optional
              />
              <TextArea
                label="Any issues with a specific exercise? (if training under Aman)"
                value={form.exerciseIssues}
                onChange={v => set("exerciseIssues", v)}
                placeholder="e.g. Shoulder press causes left shoulder pain, swapped for cable lateral raises…"
                optional
              />
              <TextArea
                label="Did you achieve your cardio / steps goal? If not, how much did you do?"
                value={form.cardioAchievement}
                onChange={v => set("cardioAchievement", v)}
                placeholder="e.g. Target was 8000 steps, averaged 6500. Did 2 cardio sessions instead of 3."
              />
            </SectionCard>
          )}

          {/* STEP 2 — Diet Feedback */}
          {step === 1 && (
            <SectionCard title="Diet Feedback">
              <TextArea
                label="Any deviation from your diet plan? Missed meals or ate differently?"
                value={form.dietDeviation}
                onChange={v => set("dietDeviation", v)}
                placeholder="e.g. Ate out on Saturday — had biryani. Missed post-workout shake on 3 days…"
              />
              <TextArea
                label="How is your appetite / hunger throughout the day?"
                value={form.appetite}
                onChange={v => set("appetite", v)}
                placeholder="e.g. Very hungry by lunch, not hungry for dinner…"
              />
              <TextArea
                label="How is your digestion?"
                value={form.digestion}
                onChange={v => set("digestion", v)}
                placeholder="e.g. Feeling bloated after lunch, good otherwise…"
              />
              <TextArea
                label="Any constipation? How frequently are you going to the toilet?"
                value={form.stoolFrequency}
                onChange={v => set("stoolFrequency", v)}
                placeholder="e.g. Once a day, usually in the morning. No issues."
              />
              <TextArea
                label="Any specific change you want in your diet?"
                value={form.dietChangeRequest}
                onChange={v => set("dietChangeRequest", v)}
                placeholder="e.g. The evening meal is too heavy, can we lighten it?"
              />
              <TextArea
                label="Any food item to add or remove from your plan?"
                value={form.foodAddRemove}
                onChange={v => set("foodAddRemove", v)}
                placeholder="e.g. Please add paneer, remove oats from breakfast."
              />
            </SectionCard>
          )}

          {/* STEP 3 — General Feedback */}
          {step === 2 && (
            <SectionCard title="General Feedback">
              <TextArea
                label="How are your energy levels throughout the day?"
                value={form.dailyEnergy}
                onChange={v => set("dailyEnergy", v)}
                placeholder="e.g. Good in the morning, dip after lunch, tired by 9pm…"
              />
              <TextArea
                label="How is your sleep quality and duration?"
                value={form.sleepQuality}
                onChange={v => set("sleepQuality", v)}
                placeholder="e.g. 7 hours, deep sleep but wake up once around 3am…"
              />
              <TextArea
                label="How much water are you drinking daily?"
                value={form.waterIntake}
                onChange={v => set("waterIntake", v)}
                placeholder="e.g. About 3 litres"
              />
              <TextArea
                label="What colour is your urine throughout the day?"
                value={form.urineColor}
                onChange={v => set("urineColor", v)}
                placeholder="e.g. Light yellow in the morning, darker in the afternoon"
              />
              <TextArea
                label="How are you feeling under Aman's coaching so far?"
                value={form.coachingFeeling}
                onChange={v => set("coachingFeeling", v)}
                placeholder="Any wins, frustrations, or feedback for Aman…"
                optional
              />
              <TextArea
                label="Anything else you want to mention?"
                value={form.additionalNotes}
                onChange={v => set("additionalNotes", v)}
                placeholder="Any life events, stress, travel, health changes this fortnight…"
                optional
              />
            </SectionCard>
          )}

          {/* STEP 4 — Measurements */}
          {step === 3 && (
            <SectionCard title="Weight & Measurements">
              <p className="text-xs text-zinc-500">Measure first thing in the morning, before eating.</p>
              <NumberField label="Current Weight" value={form.weight} onChange={v => set("weight", v)} placeholder="e.g. 74.5" suffix="kg" />
              <NumberField label="Abdomen (at navel)" value={form.abdomen} onChange={v => set("abdomen", v)} placeholder="cm" suffix="cm" />
              <NumberField label="Hips (widest point)" value={form.hips} onChange={v => set("hips", v)} placeholder="cm" suffix="cm" />
            </SectionCard>
          )}

          {/* STEP 5 — Photos */}
          {step === 4 && (
            <div className="space-y-4">
              <SectionCard title="Progress Photos">
                <p className="text-xs text-zinc-500">Wear fitted clothing, good lighting, same spot as last time if possible.</p>
                <div className="grid grid-cols-2 gap-3">
                  <PhotoCard label="Front" value={form.photoFront} onChange={v => set("photoFront", v)} />
                  <PhotoCard label="Back" value={form.photoBack} onChange={v => set("photoBack", v)} />
                  <PhotoCard label="Left Side" value={form.photoLeft} onChange={v => set("photoLeft", v)} />
                  <PhotoCard label="Right Side" value={form.photoRight} onChange={v => set("photoRight", v)} />
                </div>
              </SectionCard>
              <SectionCard title="Bonus (Optional)">
                <div className="grid grid-cols-2 gap-3">
                  <PhotoCard label="Favourite Pose" value={form.photoFavPose} onChange={v => set("photoFavPose", v)} />
                </div>
              </SectionCard>
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex gap-3 mt-6 pb-8">
        {step > 0 && (
          <button
            type="button"
            onClick={handlePrev}
            className="flex-1 rounded-full border border-zinc-700 py-3.5 text-sm font-medium text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <ChevronLeft className="size-4" />
            Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={handleNext}
            className="flex-1 rounded-full py-3.5 text-sm font-bold uppercase tracking-wider text-black flex items-center justify-center gap-2 transition-all"
            style={{ background: "linear-gradient(135deg, #FFB800, #B28000)" }}
          >
            Next
            <ChevronRight className="size-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 rounded-full py-3.5 text-sm font-bold uppercase tracking-wider text-black flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
            style={{ background: "linear-gradient(135deg, #FFD200, #FFB800)" }}
          >
            {submitting ? "Submitting…" : "Submit to Aman 🚀"}
          </button>
        )}
      </div>
    </ClientLayout>
  )
}
