"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ClientLayout } from "@/components/layout/ClientLayout"
import { useAuth } from "@/hooks/useAuth"
import { saveOnboardingDraft, submitOnboardingForm, getOnboardingForm } from "@/lib/store"
import toast from "react-hot-toast"
import { motion, AnimatePresence } from "motion/react"
import {
  ChevronLeft, ChevronRight, Check, User, Dumbbell, Heart, Utensils,
  Activity, Camera, Ruler, FileText, Upload, X
} from "lucide-react"

// ─── Types ──────────────────────────────────────────────────────────────────

type FormData = {
  // Step 1 — Contact
  fullName: string
  email: string
  address: string
  contactNumber: string
  altContact: string
  // Step 2 — General
  dob: string
  height: string
  heightUnit: "cm" | "ft"
  goal: string
  gender: string
  wakeTime: string
  sleepTime: string
  hiredCoachBefore: string
  hasHomeEquipment: string
  equipmentDetails: string
  // Step 3 — Lifestyle & Training
  isWorking: string
  workHoursTimings: string
  exercisesCurrently: string
  activityType: string
  workingOutSince: string
  workoutRoutine: string
  dailySteps: string
  cardioFrequency: string
  preferWorkoutTime: string
  tentativeWorkoutTime: string
  daysPerWeek: string
  // Step 4 — Health History
  injuryPainStiffness: string
  injurySurgeryHistory: string
  healthIssues: string
  prescribedMeds: string
  constipationHistory: string
  poopingFrequency: string
  drugAlcoholSmoke: string
  urineColor: string
  menstrualDuration: string
  menstrualCycleFreq: string
  menstrualBloodLoss: string
  menstrualDays14: string
  steroidsSarmsHistory: string
  // Step 5 — Nutrition
  dietType: string
  nonVegRestrictedDays: string
  lactoseIntolerant: string
  breakfastTime: string
  midDaySnackTime: string
  lunchTime: string
  eveningSnackTime: string
  dinnerTime: string
  maxMealsPerDay: string
  preWorkoutMeal: string
  currentSupplements: string
  wheyProtein: string
  foodAllergies: string
  currentDietMorning: string
  currentDietBreakfast: string
  currentDietMidDay: string
  currentDietLunch: string
  currentDietEvening: string
  currentDietDinner: string
  waterIntake: string
  favoriteFoods: string
  dislikedFoods: string
  preferredPlanFoods: string
  seasonalFruits: string
  savourySweet: string
  chocolatePref: string
  favoriteCheatMeal: string
  groceryStoreLinks: string
  supplementStoreLinks: string
  // Step 6 — Physiological
  morningBpSystolic: string
  morningBpDiastolic: string
  afternoonBpSystolic: string
  afternoonBpDiastolic: string
  eveningBpSystolic: string
  eveningBpDiastolic: string
  // Step 7 — Photos (base64 strings)
  photoFront: string
  photoBack: string
  photoLeft: string
  photoRight: string
  photoFavPose: string
  photoMandatoryPose: string
  // Step 8 — Measurements
  weight: string
  neck: string
  abdomen: string
  hips: string
  rightArm: string
  rightThigh: string
  rightCalf: string
  lowestWeight: string
  lowestWeightPeriod: string
  heaviestWeight: string
  heaviestWeightPeriod: string
  homeEquipmentDetails: string
  additionalInfo: string
  isOverseas: string
}

const defaultForm: FormData = {
  fullName: "", email: "", address: "", contactNumber: "", altContact: "",
  dob: "", height: "", heightUnit: "cm", goal: "", gender: "", wakeTime: "", sleepTime: "",
  hiredCoachBefore: "", hasHomeEquipment: "", equipmentDetails: "",
  isWorking: "", workHoursTimings: "", exercisesCurrently: "", activityType: "",
  workingOutSince: "", workoutRoutine: "", dailySteps: "", cardioFrequency: "",
  preferWorkoutTime: "", tentativeWorkoutTime: "", daysPerWeek: "",
  injuryPainStiffness: "", injurySurgeryHistory: "", healthIssues: "",
  prescribedMeds: "", constipationHistory: "", poopingFrequency: "",
  drugAlcoholSmoke: "", urineColor: "", menstrualDuration: "", menstrualCycleFreq: "",
  menstrualBloodLoss: "", menstrualDays14: "", steroidsSarmsHistory: "",
  dietType: "", nonVegRestrictedDays: "", lactoseIntolerant: "",
  breakfastTime: "", midDaySnackTime: "", lunchTime: "", eveningSnackTime: "", dinnerTime: "",
  maxMealsPerDay: "", preWorkoutMeal: "", currentSupplements: "", wheyProtein: "",
  foodAllergies: "", currentDietMorning: "", currentDietBreakfast: "", currentDietMidDay: "",
  currentDietLunch: "", currentDietEvening: "", currentDietDinner: "",
  waterIntake: "", favoriteFoods: "", dislikedFoods: "", preferredPlanFoods: "",
  seasonalFruits: "", savourySweet: "", chocolatePref: "", favoriteCheatMeal: "",
  groceryStoreLinks: "", supplementStoreLinks: "",
  morningBpSystolic: "", morningBpDiastolic: "",
  afternoonBpSystolic: "", afternoonBpDiastolic: "",
  eveningBpSystolic: "", eveningBpDiastolic: "",
  photoFront: "", photoBack: "", photoLeft: "", photoRight: "", photoFavPose: "", photoMandatoryPose: "",
  weight: "", neck: "", abdomen: "", hips: "", rightArm: "", rightThigh: "", rightCalf: "",
  lowestWeight: "", lowestWeightPeriod: "", heaviestWeight: "", heaviestWeightPeriod: "",
  homeEquipmentDetails: "", additionalInfo: "", isOverseas: "",
}

// ─── Step Config ─────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Contact", icon: User },
  { label: "General", icon: FileText },
  { label: "Training", icon: Dumbbell },
  { label: "Health", icon: Heart },
  { label: "Nutrition", icon: Utensils },
  { label: "Health Tests", icon: Activity },
  { label: "Photos", icon: Camera },
  { label: "Measurements", icon: Ruler },
]

// ─── Reusable sub-components ─────────────────────────────────────────────────

function FieldLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="block text-sm text-zinc-300 mb-1.5">
      {children}
      {optional && <span className="text-zinc-600 text-xs ml-1">(optional)</span>}
    </label>
  )
}

function TextInput({ label, value, onChange, placeholder, optional, type = "text", inputMode }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
  optional?: boolean; type?: string; inputMode?: React.InputHTMLAttributes<HTMLInputElement>["inputMode"]
}) {
  return (
    <div>
      <FieldLabel optional={optional}>{label}</FieldLabel>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl bg-[#111111] border border-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800]/30 transition-colors"
      />
    </div>
  )
}

function TimeInput({ label, value, onChange, optional }: {
  label: string; value: string; onChange: (v: string) => void; optional?: boolean
}) {
  return (
    <div>
      <FieldLabel optional={optional}>{label}</FieldLabel>
      <input
        type="time"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl bg-[#111111] border border-zinc-800 px-3 py-2.5 text-sm text-white outline-none focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800]/30 transition-colors"
      />
    </div>
  )
}

function TextArea({ label, value, onChange, placeholder, optional, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
  optional?: boolean; rows?: number
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

function CardRadio({ label, options, value, onChange }: {
  label: string; options: { value: string; label: string; emoji?: string }[]
  value: string; onChange: (v: string) => void
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 min-w-[120px] rounded-xl border px-3 py-3 text-sm font-medium transition-all text-left ${
              value === opt.value
                ? "bg-[#FFB800]/15 border-[#FFB800]/60 text-white"
                : "bg-[#111111] border-zinc-800 text-zinc-400 hover:border-zinc-600"
            }`}
          >
            {opt.emoji && <span className="mr-1.5">{opt.emoji}</span>}
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function BpRow({ label, systolic, diastolic, onSys, onDia }: {
  label: string; systolic: string; diastolic: string
  onSys: (v: string) => void; onDia: (v: string) => void
}) {
  return (
    <div>
      <FieldLabel optional>{label}</FieldLabel>
      <div className="flex gap-2 items-center">
        <input type="number" value={systolic} onChange={e => onSys(e.target.value)} placeholder="Systolic"
          className="flex-1 rounded-xl bg-[#111111] border border-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800]/30" />
        <span className="text-zinc-500">/</span>
        <input type="number" value={diastolic} onChange={e => onDia(e.target.value)} placeholder="Diastolic"
          className="flex-1 rounded-xl bg-[#111111] border border-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800]/30" />
        <span className="text-zinc-500 text-xs">mmHg</span>
      </div>
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
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-2 right-2 size-6 rounded-full bg-black/70 flex items-center justify-center"
          >
            <X className="size-3 text-white" />
          </button>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 py-2 px-3">
            <p className="text-xs text-green-400 flex items-center gap-1"><Check className="size-3" /> Captured</p>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleCapture}
          className="w-full aspect-[3/4] rounded-xl border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center gap-2 hover:border-[#FFB800]/40 transition-colors"
        >
          <Camera className="size-7 text-zinc-500" />
          <p className="text-xs text-zinc-500">Tap to capture</p>
        </button>
      )}
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

function NumberInput({ label, value, onChange, placeholder, suffix, optional }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; suffix?: string; optional?: boolean
}) {
  return (
    <div>
      <FieldLabel optional={optional}>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded-xl bg-[#111111] border border-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800]/30"
        />
        {suffix && <span className="text-zinc-500 text-xs">{suffix}</span>}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const set = useCallback(<K extends keyof FormData>(key: K, val: FormData[K]) => {
    setForm(prev => ({ ...prev, [key]: val }))
  }, [])

  // Load existing draft
  useEffect(() => {
    if (!user?.id || loaded) return
    getOnboardingForm(user.id).then(existing => {
      if (existing?.data) {
        setForm(prev => ({ ...prev, ...(existing.data as Partial<FormData>) }))
        if (existing.status === "submitted") setDone(true)
      }
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [user?.id, loaded])

  // Pre-fill name and email from auth profile
  useEffect(() => {
    if (profile?.name && !form.fullName) set("fullName", profile.name)
    if (user?.email && !form.email) set("email", user.email)
  }, [profile, form.fullName, form.email, set])

  const autoSave = useCallback(async (data: FormData) => {
    if (!user?.id) return
    setSaving(true)
    try {
      await saveOnboardingDraft(user.id, data as unknown as Record<string, unknown>)
    } catch { /* silent */ }
    finally { setSaving(false) }
  }, [user?.id])

  const handleNext = async () => {
    await autoSave(form)
    if (step < STEPS.length - 1) setStep(s => s + 1)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handlePrev = () => {
    if (step > 0) setStep(s => s - 1)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleSubmit = async () => {
    if (!user?.id) return
    setSubmitting(true)
    try {
      await submitOnboardingForm(user.id, form as unknown as Record<string, unknown>)
      setDone(true)
    } catch {
      toast.error("Could not submit. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const isFemale = form.gender === "female"
  const isContestPrep = form.goal === "contest_prep"
  const isOverseas = form.isOverseas === "yes"

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
          <h2 className="font-heading text-3xl text-white mb-3">FORM SUBMITTED!</h2>
          <p className="text-sm text-zinc-400 max-w-xs mb-8">
            Aman will review your information and create your personalised plan. You&apos;ll hear back shortly!
          </p>
          <button
            onClick={() => router.push("/client/dashboard")}
            className="px-8 py-3 rounded-full bg-[#FFB800] text-sm font-bold uppercase tracking-wider text-black"
          >
            Go to Dashboard
          </button>
        </motion.div>
      </ClientLayout>
    )
  }

  return (
    <ClientLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl text-white">ONBOARDING QUESTIONNAIRE</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Help Aman build your perfect plan</p>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-zinc-500">
            Step {step + 1} of {STEPS.length} · {STEPS[step].label}
          </p>
          <p className="text-xs text-[#FFB800]">
            {Math.round(((step + 1) / STEPS.length) * 100)}%
            {saving && <span className="ml-2 text-zinc-500">Saving…</span>}
          </p>
        </div>
        <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #B28000, #FFB800, #FFD200)" }}
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
          />
        </div>
        {/* Step dots */}
        <div className="flex gap-1 mt-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            return (
              <div key={i} className={`flex-1 flex flex-col items-center gap-1`}>
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

          {/* ── STEP 1: CONTACT ──────────────────────────────────────── */}
          {step === 0 && (
            <SectionCard title="Contact Information">
              <TextInput label="Full Name" value={form.fullName} onChange={v => set("fullName", v)} placeholder="Your full name" />
              <TextInput label="Email ID" value={form.email} onChange={v => set("email", v)} placeholder="email@example.com" type="email" />
              <TextInput label="Contact Number" value={form.contactNumber} onChange={v => set("contactNumber", v)} placeholder="+91 9876543210" type="tel" />
              <TextInput label="Address" value={form.address} onChange={v => set("address", v)} placeholder="City, State, Country" />
              <TextInput label="Alternate Contact Number" value={form.altContact} onChange={v => set("altContact", v)} placeholder="+91 (optional)" optional />
              <CardRadio
                label="Are you based overseas?"
                value={form.isOverseas}
                onChange={v => set("isOverseas", v)}
                options={[
                  { value: "no", label: "India", emoji: "🇮🇳" },
                  { value: "yes", label: "Overseas", emoji: "✈️" },
                ]}
              />
            </SectionCard>
          )}

          {/* ── STEP 2: GENERAL ──────────────────────────────────────── */}
          {step === 1 && (
            <>
              <SectionCard title="General Information">
                <TextInput label="Date of Birth" value={form.dob} onChange={v => set("dob", v)} type="date" />
                <div>
                  <FieldLabel>Height</FieldLabel>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={form.height}
                      onChange={e => set("height", e.target.value)}
                      placeholder={form.heightUnit === "cm" ? "e.g. 175" : "e.g. 5.9"}
                      className="flex-1 rounded-xl bg-[#111111] border border-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800]/30"
                    />
                    <div className="flex rounded-xl overflow-hidden border border-zinc-800">
                      {(["cm", "ft"] as const).map(u => (
                        <button key={u} type="button" onClick={() => set("heightUnit", u)}
                          className={`px-4 py-2.5 text-xs font-bold transition-colors ${
                            form.heightUnit === u ? "bg-[#FFB800] text-black" : "bg-[#111111] text-zinc-400"
                          }`}
                        >{u}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <CardRadio
                  label="Gender"
                  value={form.gender}
                  onChange={v => set("gender", v)}
                  options={[
                    { value: "male", label: "Male", emoji: "♂️" },
                    { value: "female", label: "Female", emoji: "♀️" },
                    { value: "other", label: "Other" },
                  ]}
                />
                <CardRadio
                  label="What is your goal?"
                  value={form.goal}
                  onChange={v => set("goal", v)}
                  options={[
                    { value: "fat_loss", label: "Fat Loss", emoji: "🔥" },
                    { value: "muscle_building", label: "Muscle Building", emoji: "💪" },
                    { value: "contest_prep", label: "Contest Prep", emoji: "🏆" },
                    { value: "maintenance", label: "Maintenance", emoji: "⚖️" },
                    { value: "antenatal", label: "Antenatal / Postnatal", emoji: "🤱" },
                  ]}
                />
                <TimeInput label="What time do you wake up?" value={form.wakeTime} onChange={v => set("wakeTime", v)} />
                <TimeInput label="What time do you sleep?" value={form.sleepTime} onChange={v => set("sleepTime", v)} />
              </SectionCard>
              <SectionCard title="Equipment & Coaching">
                <TextArea label="Have you hired a coach or nutritionist before?" value={form.hiredCoachBefore} onChange={v => set("hiredCoachBefore", v)} placeholder="Tell us about your experience…" optional />
                <CardRadio
                  label="Do you have equipment at home?"
                  value={form.hasHomeEquipment}
                  onChange={v => set("hasHomeEquipment", v)}
                  options={[
                    { value: "yes", label: "Yes", emoji: "🏋️" },
                    { value: "no", label: "No", emoji: "❌" },
                  ]}
                />
                {form.hasHomeEquipment === "yes" && (
                  <TextArea label="What equipment do you have?" value={form.equipmentDetails} onChange={v => set("equipmentDetails", v)} placeholder="e.g. Dumbbells, resistance bands, treadmill…" optional />
                )}
              </SectionCard>
            </>
          )}

          {/* ── STEP 3: LIFESTYLE & TRAINING ─────────────────────────── */}
          {step === 2 && (
            <>
              <SectionCard title="Work & Lifestyle">
                <CardRadio
                  label="Are you currently working?"
                  value={form.isWorking}
                  onChange={v => set("isWorking", v)}
                  options={[
                    { value: "sitting_job", label: "Yes — Sitting Job", emoji: "💼" },
                    { value: "standing_job", label: "Yes — Standing Job", emoji: "🧍" },
                    { value: "no", label: "Not Working", emoji: "🏠" },
                  ]}
                />
                {form.isWorking !== "no" && (
                  <TextInput label="How many hours per day & timings?" value={form.workHoursTimings} onChange={v => set("workHoursTimings", v)} placeholder="e.g. 9am–6pm, 9 hours" />
                )}
              </SectionCard>
              <SectionCard title="Current Exercise Routine">
                <CardRadio
                  label="Do you exercise currently?"
                  value={form.exercisesCurrently}
                  onChange={v => set("exercisesCurrently", v)}
                  options={[
                    { value: "yes", label: "Yes", emoji: "✅" },
                    { value: "no", label: "No", emoji: "❌" },
                  ]}
                />
                {form.exercisesCurrently === "yes" && (
                  <>
                    <TextInput label="What type of activity?" value={form.activityType} onChange={v => set("activityType", v)} placeholder="e.g. Weight training, running, yoga" />
                    <TextInput label="How long have you been working out?" value={form.workingOutSince} onChange={v => set("workingOutSince", v)} placeholder="e.g. 2 years" />
                    <TextArea label="Share your exact current workout routine" value={form.workoutRoutine} onChange={v => set("workoutRoutine", v)} placeholder="Day 1: Chest & Triceps — Bench Press 4×10…" rows={4} />
                  </>
                )}
                <TextInput label="Average daily steps" value={form.dailySteps} onChange={v => set("dailySteps", v)} placeholder="e.g. 5000" optional inputMode="numeric" />
                <TextInput label="Cardio frequency & type" value={form.cardioFrequency} onChange={v => set("cardioFrequency", v)} placeholder="e.g. 3× a week, 30 min cycling" optional />
              </SectionCard>
              <SectionCard title="Workout Preferences">
                <CardRadio
                  label="Preferred workout time"
                  value={form.preferWorkoutTime}
                  onChange={v => set("preferWorkoutTime", v)}
                  options={[
                    { value: "morning", label: "Morning", emoji: "🌅" },
                    { value: "evening", label: "Evening", emoji: "🌆" },
                    { value: "no_pref", label: "No Preference" },
                  ]}
                />
                <TimeInput label="Tentative workout time" value={form.tentativeWorkoutTime} onChange={v => set("tentativeWorkoutTime", v)} optional />
                <CardRadio
                  label="How many days per week are suitable?"
                  value={form.daysPerWeek}
                  onChange={v => set("daysPerWeek", v)}
                  options={[
                    { value: "3", label: "3 Days" },
                    { value: "4", label: "4 Days" },
                    { value: "5", label: "5 Days" },
                    { value: "6", label: "6 Days" },
                  ]}
                />
              </SectionCard>
            </>
          )}

          {/* ── STEP 4: HEALTH HISTORY ───────────────────────────────── */}
          {step === 3 && (
            <>
              <SectionCard title="Injuries & Medical">
                <TextArea label="Any current injury, pain, or stiffness?" value={form.injuryPainStiffness} onChange={v => set("injuryPainStiffness", v)} placeholder="e.g. Lower back pain since 2022, knee stiffness…" />
                <TextArea label="Previous injury or surgery history" value={form.injurySurgeryHistory} onChange={v => set("injurySurgeryHistory", v)} placeholder="e.g. ACL surgery 2019, hernia repair…" />
                <TextArea label="Any health issues or genetic disorders?" value={form.healthIssues} onChange={v => set("healthIssues", v)} placeholder="e.g. Thyroid, PCOS, diabetes, hypertension…" />
                <TextArea label="Prescribed drugs or medicines" value={form.prescribedMeds} onChange={v => set("prescribedMeds", v)} placeholder="List any medications you're currently taking" optional />
              </SectionCard>
              <SectionCard title="Digestive & Lifestyle">
                <CardRadio
                  label="Do you have a history of constipation?"
                  value={form.constipationHistory}
                  onChange={v => set("constipationHistory", v)}
                  options={[
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                    { value: "sometimes", label: "Sometimes" },
                  ]}
                />
                <TextInput label="How often do you go to the toilet?" value={form.poopingFrequency} onChange={v => set("poopingFrequency", v)} placeholder="e.g. Once a day, every 2 days" />
                <TextInput label="Average urine colour throughout the day" value={form.urineColor} onChange={v => set("urineColor", v)} placeholder="e.g. Light yellow, dark yellow" optional />
                <TextArea label="Alcohol / smoking / drug use" value={form.drugAlcoholSmoke} onChange={v => set("drugAlcoholSmoke", v)} placeholder="Be honest — it helps Aman design a better plan" optional />
              </SectionCard>
              {isFemale && (
                <SectionCard title="Menstrual Health">
                  <TextInput label="Duration (how many days do you bleed?)" value={form.menstrualDuration} onChange={v => set("menstrualDuration", v)} placeholder="e.g. 5 days" optional />
                  <TextInput label="Cycle frequency (every how many days?)" value={form.menstrualCycleFreq} onChange={v => set("menstrualCycleFreq", v)} placeholder="e.g. Every 28 days" optional />
                  <CardRadio
                    label="Amount of blood loss"
                    value={form.menstrualBloodLoss}
                    onChange={v => set("menstrualBloodLoss", v)}
                    options={[
                      { value: "heavy", label: "Heavy" },
                      { value: "moderate", label: "Moderate" },
                      { value: "light", label: "Light" },
                    ]}
                  />
                  <TextInput label="How do you feel in days 1–4?" value={form.menstrualDays14} onChange={v => set("menstrualDays14", v)} placeholder="e.g. Cramps, fatigue, mood swings" optional />
                </SectionCard>
              )}
              {isContestPrep && (
                <SectionCard title="Performance History">
                  <TextArea label="Any history of Anabolic Steroids / SARMS / Peptides?" value={form.steroidsSarmsHistory} onChange={v => set("steroidsSarmsHistory", v)} placeholder="Please share honestly — coaches need this to plan your protocol" optional />
                </SectionCard>
              )}
            </>
          )}

          {/* ── STEP 5: NUTRITION ────────────────────────────────────── */}
          {step === 4 && (
            <>
              <SectionCard title="Diet Type">
                <CardRadio
                  label="What is your diet type?"
                  value={form.dietType}
                  onChange={v => set("dietType", v)}
                  options={[
                    { value: "non_veg", label: "Non-Vegetarian", emoji: "🍗" },
                    { value: "vegetarian", label: "Vegetarian", emoji: "🥦" },
                    { value: "vegan", label: "Vegan", emoji: "🌱" },
                    { value: "lacto_ovo", label: "Lacto-Ovo Veg", emoji: "🥚" },
                  ]}
                />
                {form.dietType === "non_veg" && (
                  <TextInput label="Any days you avoid non-veg (religious)?" value={form.nonVegRestrictedDays} onChange={v => set("nonVegRestrictedDays", v)} placeholder="e.g. Tuesdays, Saturdays" optional />
                )}
                <CardRadio
                  label="Are you lactose intolerant?"
                  value={form.lactoseIntolerant}
                  onChange={v => set("lactoseIntolerant", v)}
                  options={[
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                    { value: "partial", label: "Partially / Sometimes" },
                  ]}
                />
              </SectionCard>
              <SectionCard title="Meal Timings">
                <TimeInput label="Breakfast time" value={form.breakfastTime} onChange={v => set("breakfastTime", v)} optional />
                <TimeInput label="Mid-day snack time" value={form.midDaySnackTime} onChange={v => set("midDaySnackTime", v)} optional />
                <TimeInput label="Lunch time" value={form.lunchTime} onChange={v => set("lunchTime", v)} optional />
                <TimeInput label="Evening snack time" value={form.eveningSnackTime} onChange={v => set("eveningSnackTime", v)} optional />
                <TimeInput label="Dinner time" value={form.dinnerTime} onChange={v => set("dinnerTime", v)} optional />
                <CardRadio
                  label="Maximum meals you can manage per day?"
                  value={form.maxMealsPerDay}
                  onChange={v => set("maxMealsPerDay", v)}
                  options={[
                    { value: "3", label: "3 Meals" },
                    { value: "4", label: "4 Meals" },
                    { value: "5", label: "5 Meals" },
                  ]}
                />
                <CardRadio
                  label="Can you eat a pre-workout meal?"
                  value={form.preWorkoutMeal}
                  onChange={v => set("preWorkoutMeal", v)}
                  options={[
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                  ]}
                />
              </SectionCard>
              <SectionCard title="Supplements & Allergies">
                <TextArea label="Current supplements you take" value={form.currentSupplements} onChange={v => set("currentSupplements", v)} placeholder="e.g. Whey protein, creatine, multivitamin, B12…" optional />
                <CardRadio
                  label="Are you okay with whey protein?"
                  value={form.wheyProtein}
                  onChange={v => set("wheyProtein", v)}
                  options={[
                    { value: "yes", label: "Yes", emoji: "✅" },
                    { value: "no", label: "No", emoji: "❌" },
                    { value: "not_sure", label: "Not Sure" },
                  ]}
                />
                <TextArea label="Any food allergies or intolerances?" value={form.foodAllergies} onChange={v => set("foodAllergies", v)} placeholder="e.g. Peanut allergy, gluten sensitivity…" optional />
              </SectionCard>
              <SectionCard title="Current Diet — What Are You Eating Now?">
                <p className="text-xs text-zinc-500">Be as detailed as possible. This helps Aman understand your starting point.</p>
                <TextArea label="Morning (before breakfast)" value={form.currentDietMorning} onChange={v => set("currentDietMorning", v)} placeholder="e.g. 1 glass warm water, 5 almonds…" optional rows={2} />
                <TextArea label="Breakfast" value={form.currentDietBreakfast} onChange={v => set("currentDietBreakfast", v)} placeholder="e.g. 3 eggs + 2 slices brown bread + 1 banana…" optional rows={2} />
                <TextArea label="Mid-day snack" value={form.currentDietMidDay} onChange={v => set("currentDietMidDay", v)} placeholder="e.g. Handful of nuts, fruit…" optional rows={2} />
                <TextArea label="Lunch" value={form.currentDietLunch} onChange={v => set("currentDietLunch", v)} placeholder="e.g. 200g chicken + 1 cup rice + salad…" optional rows={2} />
                <TextArea label="Evening snack" value={form.currentDietEvening} onChange={v => set("currentDietEvening", v)} placeholder="e.g. Protein shake, roasted chana…" optional rows={2} />
                <TextArea label="Dinner" value={form.currentDietDinner} onChange={v => set("currentDietDinner", v)} placeholder="e.g. 2 rotis + daal + sabzi…" optional rows={2} />
              </SectionCard>
              <SectionCard title="Food Preferences">
                <TextInput label="Daily water intake" value={form.waterIntake} onChange={v => set("waterIntake", v)} placeholder="e.g. 2.5 litres" />
                <TextArea label="Foods you love" value={form.favoriteFoods} onChange={v => set("favoriteFoods", v)} placeholder="e.g. Rice, paneer, chicken, mango…" />
                <TextArea label="Foods you hate or will not eat" value={form.dislikedFoods} onChange={v => set("dislikedFoods", v)} placeholder="e.g. Bitter gourd, liver, fish…" />
                <TextArea label="Foods you'd like included in your plan" value={form.preferredPlanFoods} onChange={v => set("preferredPlanFoods", v)} placeholder="e.g. Oats, sweet potato, eggs…" optional />
                <TextArea label="Seasonal fruits available to you" value={form.seasonalFruits} onChange={v => set("seasonalFruits", v)} placeholder="e.g. Mango (May–Jul), papaya year-round…" optional />
                <CardRadio
                  label="Do you prefer savoury or sweet?"
                  value={form.savourySweet}
                  onChange={v => set("savourySweet", v)}
                  options={[
                    { value: "savoury", label: "Savoury", emoji: "🧂" },
                    { value: "sweet", label: "Sweet", emoji: "🍬" },
                    { value: "both", label: "Both" },
                  ]}
                />
                <TextInput label="Do you like chocolate? What kind?" value={form.chocolatePref} onChange={v => set("chocolatePref", v)} placeholder="e.g. Dark chocolate only, or any kind…" optional />
                <TextArea label="Favourite cheat meal" value={form.favoriteCheatMeal} onChange={v => set("favoriteCheatMeal", v)} placeholder="e.g. Pizza, biryani, ice cream…" optional />
                {isOverseas && (
                  <>
                    <TextInput label="Grocery store names / links" value={form.groceryStoreLinks} onChange={v => set("groceryStoreLinks", v)} placeholder="e.g. Whole Foods, Walmart — or provide website URL" optional />
                    <TextInput label="Supplement store names / links" value={form.supplementStoreLinks} onChange={v => set("supplementStoreLinks", v)} placeholder="e.g. iHerb, Bodybuilding.com…" optional />
                  </>
                )}
              </SectionCard>
            </>
          )}

          {/* ── STEP 6: PHYSIOLOGICAL HEALTH ─────────────────────────── */}
          {step === 5 && (
            <SectionCard title="Blood Pressure & Health Reports">
              <p className="text-xs text-zinc-500 mb-2">Take readings after 5 minutes of sitting calmly. All optional.</p>
              <BpRow
                label="Morning (empty stomach)"
                systolic={form.morningBpSystolic} diastolic={form.morningBpDiastolic}
                onSys={v => set("morningBpSystolic", v)} onDia={v => set("morningBpDiastolic", v)}
              />
              <BpRow
                label="Afternoon / Early evening"
                systolic={form.afternoonBpSystolic} diastolic={form.afternoonBpDiastolic}
                onSys={v => set("afternoonBpSystolic", v)} onDia={v => set("afternoonBpDiastolic", v)}
              />
              <BpRow
                label="Late evening / Night"
                systolic={form.eveningBpSystolic} diastolic={form.eveningBpDiastolic}
                onSys={v => set("eveningBpSystolic", v)} onDia={v => set("eveningBpDiastolic", v)}
              />
              <div className="rounded-xl border border-dashed border-zinc-700 p-4 flex items-center gap-3">
                <Upload className="size-5 text-zinc-500 shrink-0" />
                <div>
                  <p className="text-sm text-zinc-300">Blood tests / scan reports</p>
                  <p className="text-xs text-zinc-600 mt-0.5">You can WhatsApp these to Aman directly at +91 98156 90656</p>
                </div>
              </div>
            </SectionCard>
          )}

          {/* ── STEP 7: PROGRESS PHOTOS ──────────────────────────────── */}
          {step === 6 && (
            <div className="space-y-4">
              <SectionCard title="Progress Photos">
                <p className="text-xs text-zinc-500">Wear fitted clothing. Stand in good lighting. All optional but very helpful for Aman to design your plan.</p>
                <div className="grid grid-cols-2 gap-3">
                  <PhotoCard label="Front" value={form.photoFront} onChange={v => set("photoFront", v)} />
                  <PhotoCard label="Back" value={form.photoBack} onChange={v => set("photoBack", v)} />
                  <PhotoCard label="Left Side" value={form.photoLeft} onChange={v => set("photoLeft", v)} />
                  <PhotoCard label="Right Side" value={form.photoRight} onChange={v => set("photoRight", v)} />
                </div>
              </SectionCard>
              {!isFemale && (
                <SectionCard title="Bonus Poses">
                  <div className="grid grid-cols-2 gap-3">
                    <PhotoCard label="Favourite Pose" value={form.photoFavPose} onChange={v => set("photoFavPose", v)} />
                    {isContestPrep && (
                      <PhotoCard label="Mandatory Poses" value={form.photoMandatoryPose} onChange={v => set("photoMandatoryPose", v)} />
                    )}
                  </div>
                </SectionCard>
              )}
            </div>
          )}

          {/* ── STEP 8: MEASUREMENTS ─────────────────────────────────── */}
          {step === 7 && (
            <>
              <SectionCard title="Current Measurements">
                <p className="text-xs text-zinc-500">All in kg / cm. Leave blank if you don&apos;t have a measuring tape.</p>
                <NumberInput label="Current Weight" value={form.weight} onChange={v => set("weight", v)} placeholder="e.g. 75.5" suffix="kg" />
                <NumberInput label="Neck" value={form.neck} onChange={v => set("neck", v)} placeholder="cm" suffix="cm" optional />
                <NumberInput label="Abdomen (at navel)" value={form.abdomen} onChange={v => set("abdomen", v)} placeholder="cm" suffix="cm" optional />
                <NumberInput label="Hips (widest point)" value={form.hips} onChange={v => set("hips", v)} placeholder="cm" suffix="cm" optional />
                <NumberInput label="Right Arm (flexed)" value={form.rightArm} onChange={v => set("rightArm", v)} placeholder="cm" suffix="cm" optional />
                <NumberInput label="Right Thigh" value={form.rightThigh} onChange={v => set("rightThigh", v)} placeholder="cm" suffix="cm" optional />
                <NumberInput label="Right Calf" value={form.rightCalf} onChange={v => set("rightCalf", v)} placeholder="cm" suffix="cm" optional />
              </SectionCard>
              <SectionCard title="Weight History">
                <NumberInput label="Lowest weight in last 3–5 years" value={form.lowestWeight} onChange={v => set("lowestWeight", v)} placeholder="kg" suffix="kg" optional />
                <TextInput label="When were you at your lowest?" value={form.lowestWeightPeriod} onChange={v => set("lowestWeightPeriod", v)} placeholder="e.g. June 2022" optional />
                <NumberInput label="Heaviest weight ever" value={form.heaviestWeight} onChange={v => set("heaviestWeight", v)} placeholder="kg" suffix="kg" optional />
                <TextInput label="When were you at your heaviest?" value={form.heaviestWeightPeriod} onChange={v => set("heaviestWeightPeriod", v)} placeholder="e.g. Dec 2023" optional />
              </SectionCard>
              <SectionCard title="Additional Information">
                <TextArea label="Anything else Aman should know?" value={form.additionalInfo} onChange={v => set("additionalInfo", v)} placeholder="Any other context about your health, lifestyle, or goals…" optional rows={3} />
              </SectionCard>
            </>
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
            disabled={saving}
            className="flex-1 rounded-full py-3.5 text-sm font-bold uppercase tracking-wider text-black flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
            style={{ background: "linear-gradient(135deg, #FFB800, #B28000)" }}
          >
            Save & Continue
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
