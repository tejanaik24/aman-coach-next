"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ClientLayout } from "@/components/layout/ClientLayout"
import { useAuth } from "@/hooks/useAuth"
import { saveOnboardingDraft, submitOnboardingForm, getOnboardingForm } from "@/lib/store"
import toast from "react-hot-toast"
import { motion, AnimatePresence } from "motion/react"
import {
  ChevronLeft, ChevronRight, Check, User, Heart, Utensils,
  Activity, Camera, Ruler, Baby, X, Upload
} from "lucide-react"

const STEPS = [
  { label: "Contact", icon: User },
  { label: "Pregnancy", icon: Baby },
  { label: "Health", icon: Heart },
  { label: "Nutrition", icon: Utensils },
  { label: "Health Tests", icon: Activity },
  { label: "Photos", icon: Camera },
  { label: "Measurements", icon: Ruler },
]

// ─── Reusable sub-components (same pattern as onboarding) ─────────────────────

function FieldLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="block text-sm text-zinc-300 mb-1.5">
      {children}
      {optional && <span className="text-zinc-600 text-xs ml-1">(optional)</span>}
    </label>
  )
}

function TextInput({ label, value, onChange, placeholder, optional, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; optional?: boolean; type?: string
}) {
  return (
    <div>
      <FieldLabel optional={optional}>{label}</FieldLabel>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
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
      <input type="time" value={value} onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl bg-[#111111] border border-zinc-800 px-3 py-2.5 text-sm text-white outline-none focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800]/30 transition-colors"
      />
    </div>
  )
}

function TextArea({ label, value, onChange, placeholder, optional, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; optional?: boolean; rows?: number
}) {
  return (
    <div>
      <FieldLabel optional={optional}>{label}</FieldLabel>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        className="w-full rounded-xl bg-[#111111] border border-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800]/30 transition-colors resize-none"
      />
    </div>
  )
}

function CardRadio({ label, options, value, onChange, optional }: {
  label: string; options: { value: string; label: string; emoji?: string }[]
  value: string; onChange: (v: string) => void; optional?: boolean
}) {
  return (
    <div>
      <FieldLabel optional={optional}>{label}</FieldLabel>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
            className={`flex-1 min-w-[100px] rounded-xl border px-3 py-3 text-sm font-medium transition-all text-left ${
              value === opt.value
                ? "bg-[#FFB800]/15 border-[#FFB800]/60 text-white"
                : "bg-[#111111] border-zinc-800 text-zinc-400 hover:border-zinc-600"
            }`}>
            {opt.emoji && <span className="mr-1.5">{opt.emoji}</span>}
            {opt.label}
          </button>
        ))}
      </div>
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
        <input type="number" inputMode="decimal" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="flex-1 rounded-xl bg-[#111111] border border-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800]/30"
        />
        {suffix && <span className="text-zinc-500 text-xs">{suffix}</span>}
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
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 py-2 px-3">
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

// ─── Form State ───────────────────────────────────────────────────────────────

type FormData = {
  // Step 1 — Contact
  fullName: string; email: string; contactNumber: string; address: string; altContact: string
  // Step 2 — Pregnancy Info
  gestationalAge: string; lmp: string; edd: string; gravidity: string; pregnancyType: string
  wakeTime: string; sleepTime: string
  hiredCoachBefore: string; hasHomeEquipment: string; equipmentDetails: string
  isWorking: string; workHoursTimings: string
  exercisesCurrently: string; workoutRoutine: string; dailySteps: string; cardioFrequency: string
  preferWorkoutTime: string
  // Step 3 — Health
  injuryPainMobility: string; healthIssues: string; familyHistory: string
  palpitationDizziness: string; surgicalHistory: string; prescribedMeds: string
  constipationFrequency: string; alcoholSmokeDrugs: string; urineColor: string; sleepDetails: string
  menstrualDuration: string; menstrualCycleFreq: string; menstrualBloodLoss: string; menstrualDays14: string
  // Step 4 — Nutrition
  dietType: string; lactoseIntolerant: string; wheyProtein: string
  breakfastTime: string; midDaySnackTime: string; lunchTime: string; eveningSnackTime: string; dinnerTime: string
  currentSupplements: string; foodAllergies: string; nauseasFoods: string
  currentDietMorning: string; currentDietBreakfast: string; currentDietMidDay: string
  currentDietLunch: string; currentDietEvening: string; currentDietDinner: string
  waterIntake: string; favoriteFoods: string; dislikedFoods: string
  savourySweet: string; chocolatePref: string; favoriteCheatMeal: string
  // Step 5 — Health Tests
  morningBpSystolic: string; morningBpDiastolic: string
  afternoonBpSystolic: string; afternoonBpDiastolic: string
  eveningBpSystolic: string; eveningBpDiastolic: string
  fastingGlucose: string; postBreakfastGlucose: string; postLunchGlucose: string; postDinnerGlucose: string
  restingBpm: string
  // Step 6 — Photos
  photoFront: string; photoBack: string; photoLeft: string; photoRight: string; photoPreConception: string
  // Step 7 — Measurements
  presentWeight: string; abdomen: string; waist: string; hips: string
  weightBeforeConceiving: string; weightStart1stTrimester: string; weightEnd1stTrimester: string
  heaviestWeight: string; additionalInfo: string
}

const defaultForm: FormData = {
  fullName: "", email: "", contactNumber: "", address: "", altContact: "",
  gestationalAge: "", lmp: "", edd: "", gravidity: "", pregnancyType: "",
  wakeTime: "", sleepTime: "", hiredCoachBefore: "", hasHomeEquipment: "", equipmentDetails: "",
  isWorking: "", workHoursTimings: "", exercisesCurrently: "", workoutRoutine: "",
  dailySteps: "", cardioFrequency: "", preferWorkoutTime: "",
  injuryPainMobility: "", healthIssues: "", familyHistory: "", palpitationDizziness: "",
  surgicalHistory: "", prescribedMeds: "", constipationFrequency: "", alcoholSmokeDrugs: "",
  urineColor: "", sleepDetails: "", menstrualDuration: "", menstrualCycleFreq: "",
  menstrualBloodLoss: "", menstrualDays14: "",
  dietType: "", lactoseIntolerant: "", wheyProtein: "",
  breakfastTime: "", midDaySnackTime: "", lunchTime: "", eveningSnackTime: "", dinnerTime: "",
  currentSupplements: "", foodAllergies: "", nauseasFoods: "",
  currentDietMorning: "", currentDietBreakfast: "", currentDietMidDay: "",
  currentDietLunch: "", currentDietEvening: "", currentDietDinner: "",
  waterIntake: "", favoriteFoods: "", dislikedFoods: "", savourySweet: "", chocolatePref: "", favoriteCheatMeal: "",
  morningBpSystolic: "", morningBpDiastolic: "", afternoonBpSystolic: "", afternoonBpDiastolic: "",
  eveningBpSystolic: "", eveningBpDiastolic: "",
  fastingGlucose: "", postBreakfastGlucose: "", postLunchGlucose: "", postDinnerGlucose: "",
  restingBpm: "",
  photoFront: "", photoBack: "", photoLeft: "", photoRight: "", photoPreConception: "",
  presentWeight: "", abdomen: "", waist: "", hips: "",
  weightBeforeConceiving: "", weightStart1stTrimester: "", weightEnd1stTrimester: "",
  heaviestWeight: "", additionalInfo: "",
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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AntenatalPage() {
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

  useEffect(() => {
    if (!user?.id || loaded) return
    getOnboardingForm(user.id).then(existing => {
      if (existing?.data && existing.form_type === "antenatal") {
        setForm(prev => ({ ...prev, ...(existing.data as Partial<FormData>) }))
        if (existing.status === "submitted") setDone(true)
      }
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [user?.id, loaded])

  useEffect(() => {
    if (profile?.name && !form.fullName) set("fullName", profile.name)
    if (user?.email && !form.email) set("email", user.email)
  }, [profile, form.fullName, form.email, set])

  const autoSave = useCallback(async (data: FormData) => {
    if (!user?.id) return
    setSaving(true)
    try { await saveOnboardingDraft(user.id, data as unknown as Record<string, unknown>, "antenatal") }
    catch { /* silent */ }
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
      await submitOnboardingForm(user.id, form as unknown as Record<string, unknown>, "antenatal")
      setDone(true)
    } catch {
      toast.error("Could not submit. Please try again.")
    } finally { setSubmitting(false) }
  }

  if (done) {
    return (
      <ClientLayout>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center px-4">
          <div className="size-20 rounded-full bg-[#FFB800]/20 flex items-center justify-center mb-6">
            <Check className="size-10 text-[#FFB800]" />
          </div>
          <h2 className="font-heading text-3xl text-white mb-3">FORM SUBMITTED! 🤱</h2>
          <p className="text-sm text-zinc-400 max-w-xs mb-8">
            Aman will review your information and create a safe, personalised antenatal plan for you.
          </p>
          <button onClick={() => router.push("/client/dashboard")}
            className="px-8 py-3 rounded-full bg-[#FFB800] text-sm font-bold uppercase tracking-wider text-black">
            Go to Dashboard
          </button>
        </motion.div>
      </ClientLayout>
    )
  }

  return (
    <ClientLayout>
      <div className="mb-2">
        <div className="flex items-center gap-2 mb-1">
          <Baby className="size-5 text-[#FFB800]" />
          <h1 className="font-heading text-2xl text-white">ANTENATAL QUESTIONNAIRE</h1>
        </div>
        <p className="text-xs text-zinc-500">Specialised intake for pregnant & postnatal clients</p>
      </div>

      {/* Progress */}
      <div className="mt-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-zinc-500">Step {step + 1} of {STEPS.length} · {STEPS[step].label}</p>
          <p className="text-xs text-[#FFB800]">
            {Math.round(((step + 1) / STEPS.length) * 100)}%
            {saving && <span className="ml-2 text-zinc-500">Saving…</span>}
          </p>
        </div>
        <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
          <motion.div className="h-full rounded-full"
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

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.22 }}
          className="space-y-4 pb-4"
        >

          {/* STEP 1 — Contact */}
          {step === 0 && (
            <SectionCard title="Contact Information">
              <TextInput label="Full Name" value={form.fullName} onChange={v => set("fullName", v)} placeholder="Your full name" />
              <TextInput label="Email ID" value={form.email} onChange={v => set("email", v)} placeholder="email@example.com" type="email" />
              <TextInput label="Contact Number" value={form.contactNumber} onChange={v => set("contactNumber", v)} placeholder="+91 9876543210" type="tel" />
              <TextInput label="Address" value={form.address} onChange={v => set("address", v)} placeholder="City, State, Country" />
              <TextInput label="Alternate Contact Number" value={form.altContact} onChange={v => set("altContact", v)} optional />
            </SectionCard>
          )}

          {/* STEP 2 — Pregnancy Info */}
          {step === 1 && (
            <>
              <SectionCard title="Pregnancy Details">
                <TextInput label="Gestational Age (how many weeks pregnant?)" value={form.gestationalAge} onChange={v => set("gestationalAge", v)} placeholder="e.g. 18 weeks" />
                <TextInput label="LMP — Last Menstrual Period date" value={form.lmp} onChange={v => set("lmp", v)} type="date" optional />
                <TextInput label="EDD — Expected Date of Delivery" value={form.edd} onChange={v => set("edd", v)} type="date" optional />
                <TextInput label="Number of Pregnancies (Gravidity)" value={form.gravidity} onChange={v => set("gravidity", v)} placeholder="e.g. 1 (first pregnancy), 2 (second)…" optional />
                <CardRadio
                  label="Type of Pregnancy"
                  value={form.pregnancyType}
                  onChange={v => set("pregnancyType", v)}
                  options={[
                    { value: "singleton", label: "Singleton (1 baby)", emoji: "👶" },
                    { value: "twin", label: "Twins", emoji: "👶👶" },
                    { value: "other", label: "Other / Not sure" },
                  ]}
                  optional
                />
              </SectionCard>
              <SectionCard title="Sleep & Lifestyle">
                <TimeInput label="What time do you wake up?" value={form.wakeTime} onChange={v => set("wakeTime", v)} optional />
                <TimeInput label="What time do you sleep?" value={form.sleepTime} onChange={v => set("sleepTime", v)} optional />
                <TextArea label="Have you hired a coach or nutritionist before?" value={form.hiredCoachBefore} onChange={v => set("hiredCoachBefore", v)} placeholder="Share your experience…" optional rows={2} />
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
                  <TextArea label="What equipment do you have?" value={form.equipmentDetails} onChange={v => set("equipmentDetails", v)} placeholder="Dumbbells, resistance bands, yoga mat…" optional rows={2} />
                )}
              </SectionCard>
              <SectionCard title="Work & Current Activity">
                <TextArea label="Are you currently working? Describe your role." value={form.isWorking} onChange={v => set("isWorking", v)} placeholder="e.g. Work-from-home, 6hr desk job. Currently on maternity leave." optional rows={2} />
                <CardRadio
                  label="Do you exercise currently?"
                  value={form.exercisesCurrently}
                  onChange={v => set("exercisesCurrently", v)}
                  options={[
                    { value: "yes", label: "Yes, regularly" },
                    { value: "light", label: "Light walks only" },
                    { value: "no", label: "Not currently" },
                  ]}
                />
                {form.exercisesCurrently !== "no" && (
                  <TextArea label="Describe your current routine (last 3 months)" value={form.workoutRoutine} onChange={v => set("workoutRoutine", v)} placeholder="e.g. 20-min morning walk daily, prenatal yoga 3× week…" optional rows={2} />
                )}
                <TextInput label="Average daily steps" value={form.dailySteps} onChange={v => set("dailySteps", v)} placeholder="e.g. 4000 steps" optional />
                <TextInput label="Cardio frequency and type" value={form.cardioFrequency} onChange={v => set("cardioFrequency", v)} placeholder="e.g. 3× week, 20 min walking" optional />
                <CardRadio
                  label="Preferred workout time"
                  value={form.preferWorkoutTime}
                  onChange={v => set("preferWorkoutTime", v)}
                  options={[
                    { value: "morning", label: "Morning", emoji: "🌅" },
                    { value: "evening", label: "Evening", emoji: "🌆" },
                    { value: "no_pref", label: "Flexible" },
                  ]}
                  optional
                />
              </SectionCard>
            </>
          )}

          {/* STEP 3 — Health */}
          {step === 2 && (
            <>
              <SectionCard title="Health & Medical History">
                <TextArea label="Any injury, pain, or mobility issues?" value={form.injuryPainMobility} onChange={v => set("injuryPainMobility", v)} placeholder="e.g. Lower back pain, SPD (symphysis pubis dysfunction), wrist stiffness…" optional />
                <TextArea label="Any health issues or genetic disorders?" value={form.healthIssues} onChange={v => set("healthIssues", v)} placeholder="e.g. Gestational diabetes, thyroid, anaemia, preeclampsia…" optional />
                <TextArea label="Family history of diabetes / thyroid / hypertension?" value={form.familyHistory} onChange={v => set("familyHistory", v)} placeholder="e.g. Mother has type 2 diabetes, father has hypertension…" optional />
                <TextArea label="Any palpitations or dizziness?" value={form.palpitationDizziness} onChange={v => set("palpitationDizziness", v)} placeholder="e.g. Occasional lightheadedness when standing up quickly…" optional />
                <TextArea label="Any surgical history?" value={form.surgicalHistory} onChange={v => set("surgicalHistory", v)} placeholder="e.g. C-section (2021), appendix removed…" optional />
                <TextArea label="Prescribed drugs or medicines" value={form.prescribedMeds} onChange={v => set("prescribedMeds", v)} placeholder="e.g. Folic acid, iron tablets, progesterone…" optional />
              </SectionCard>
              <SectionCard title="Digestive Health & Lifestyle">
                <TextArea label="Constipation frequency / bowel movement details" value={form.constipationFrequency} onChange={v => set("constipationFrequency", v)} placeholder="e.g. Constipated every 2–3 days, common during 2nd trimester…" optional rows={2} />
                <TextArea label="Alcohol / smoking / substance use" value={form.alcoholSmokeDrugs} onChange={v => set("alcoholSmokeDrugs", v)} placeholder="Be honest. Previous use before pregnancy is also relevant." optional rows={2} />
                <TextInput label="Average urine colour" value={form.urineColor} onChange={v => set("urineColor", v)} placeholder="e.g. Light yellow, dark yellow" optional />
                <TextArea label="Sleep hours and quality" value={form.sleepDetails} onChange={v => set("sleepDetails", v)} placeholder="e.g. 8 hours but wake up 3× to use the bathroom, feel unrested…" optional rows={2} />
              </SectionCard>
              <SectionCard title="Menstrual Health (Before Conception)">
                <TextInput label="Duration (how many days did you bleed?)" value={form.menstrualDuration} onChange={v => set("menstrualDuration", v)} placeholder="e.g. 5 days" optional />
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
                  optional
                />
                <TextInput label="How did you feel in days 1–4?" value={form.menstrualDays14} onChange={v => set("menstrualDays14", v)} placeholder="e.g. Cramps, fatigue, mood swings" optional />
              </SectionCard>
            </>
          )}

          {/* STEP 4 — Nutrition */}
          {step === 3 && (
            <>
              <SectionCard title="Diet Type & Intolerances">
                <CardRadio
                  label="Diet type"
                  value={form.dietType}
                  onChange={v => set("dietType", v)}
                  options={[
                    { value: "non_veg", label: "Non-Vegetarian", emoji: "🍗" },
                    { value: "vegetarian", label: "Vegetarian", emoji: "🥦" },
                    { value: "vegan", label: "Vegan", emoji: "🌱" },
                    { value: "lacto_ovo", label: "Lacto-Ovo Veg", emoji: "🥚" },
                  ]}
                />
                <CardRadio
                  label="Lactose intolerant?"
                  value={form.lactoseIntolerant}
                  onChange={v => set("lactoseIntolerant", v)}
                  options={[
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                    { value: "partial", label: "Partially" },
                  ]}
                />
                <CardRadio
                  label="Okay with whey protein?"
                  value={form.wheyProtein}
                  onChange={v => set("wheyProtein", v)}
                  options={[
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                    { value: "not_sure", label: "Not Sure" },
                  ]}
                />
                <TextArea label="Any food allergies or intolerances?" value={form.foodAllergies} onChange={v => set("foodAllergies", v)} placeholder="e.g. Peanut allergy, gluten sensitivity…" optional />
                <TextArea label="Foods that cause nausea or discomfort during pregnancy" value={form.nauseasFoods} onChange={v => set("nauseasFoods", v)} placeholder="e.g. Eggs in first trimester, strong smells…" optional />
              </SectionCard>
              <SectionCard title="Meal Timings">
                <TimeInput label="Breakfast time" value={form.breakfastTime} onChange={v => set("breakfastTime", v)} optional />
                <TimeInput label="Mid-day snack" value={form.midDaySnackTime} onChange={v => set("midDaySnackTime", v)} optional />
                <TimeInput label="Lunch time" value={form.lunchTime} onChange={v => set("lunchTime", v)} optional />
                <TimeInput label="Evening snack" value={form.eveningSnackTime} onChange={v => set("eveningSnackTime", v)} optional />
                <TimeInput label="Dinner time" value={form.dinnerTime} onChange={v => set("dinnerTime", v)} optional />
              </SectionCard>
              <SectionCard title="Current Diet">
                <TextArea label="Supplements you take" value={form.currentSupplements} onChange={v => set("currentSupplements", v)} placeholder="e.g. Folic acid, iron, calcium, prenatal multivitamin…" optional rows={2} />
                <TextArea label="Morning (before breakfast)" value={form.currentDietMorning} onChange={v => set("currentDietMorning", v)} placeholder="e.g. Warm water with lemon, soaked almonds…" optional rows={2} />
                <TextArea label="Breakfast" value={form.currentDietBreakfast} onChange={v => set("currentDietBreakfast", v)} placeholder="e.g. 2 eggs + toast + banana…" optional rows={2} />
                <TextArea label="Mid-day snack" value={form.currentDietMidDay} onChange={v => set("currentDietMidDay", v)} optional rows={2} />
                <TextArea label="Lunch" value={form.currentDietLunch} onChange={v => set("currentDietLunch", v)} optional rows={2} />
                <TextArea label="Evening snack" value={form.currentDietEvening} onChange={v => set("currentDietEvening", v)} optional rows={2} />
                <TextArea label="Dinner" value={form.currentDietDinner} onChange={v => set("currentDietDinner", v)} optional rows={2} />
              </SectionCard>
              <SectionCard title="Food Preferences">
                <TextInput label="Daily water intake" value={form.waterIntake} onChange={v => set("waterIntake", v)} placeholder="e.g. 2.5 litres" optional />
                <TextArea label="Foods you love" value={form.favoriteFoods} onChange={v => set("favoriteFoods", v)} optional rows={2} />
                <TextArea label="Foods you hate or avoid" value={form.dislikedFoods} onChange={v => set("dislikedFoods", v)} optional rows={2} />
                <CardRadio
                  label="Savoury or sweet preference?"
                  value={form.savourySweet}
                  onChange={v => set("savourySweet", v)}
                  options={[
                    { value: "savoury", label: "Savoury" },
                    { value: "sweet", label: "Sweet" },
                    { value: "both", label: "Both" },
                  ]}
                  optional
                />
                <TextInput label="Favourite cheat meal" value={form.favoriteCheatMeal} onChange={v => set("favoriteCheatMeal", v)} optional />
              </SectionCard>
            </>
          )}

          {/* STEP 5 — Health Tests */}
          {step === 4 && (
            <>
              <SectionCard title="Blood Pressure">
                <p className="text-xs text-zinc-500 mb-1">All optional. Sit calmly for 5 min before measuring.</p>
                <BpRow label="Morning (empty stomach)" systolic={form.morningBpSystolic} diastolic={form.morningBpDiastolic} onSys={v => set("morningBpSystolic", v)} onDia={v => set("morningBpDiastolic", v)} />
                <BpRow label="Afternoon / Early evening" systolic={form.afternoonBpSystolic} diastolic={form.afternoonBpDiastolic} onSys={v => set("afternoonBpSystolic", v)} onDia={v => set("afternoonBpDiastolic", v)} />
                <BpRow label="Late evening / Night" systolic={form.eveningBpSystolic} diastolic={form.eveningBpDiastolic} onSys={v => set("eveningBpSystolic", v)} onDia={v => set("eveningBpDiastolic", v)} />
              </SectionCard>
              <SectionCard title="Blood Glucose Monitoring">
                <p className="text-xs text-zinc-500 mb-1">Check if your doctor has advised glucose monitoring.</p>
                <NumberInput label="Fasting blood glucose (morning, empty stomach)" value={form.fastingGlucose} onChange={v => set("fastingGlucose", v)} placeholder="mg/dL" suffix="mg/dL" optional />
                <NumberInput label="90–120 min after breakfast" value={form.postBreakfastGlucose} onChange={v => set("postBreakfastGlucose", v)} placeholder="mg/dL" suffix="mg/dL" optional />
                <NumberInput label="90–120 min after lunch" value={form.postLunchGlucose} onChange={v => set("postLunchGlucose", v)} placeholder="mg/dL" suffix="mg/dL" optional />
                <NumberInput label="90–120 min after dinner" value={form.postDinnerGlucose} onChange={v => set("postDinnerGlucose", v)} placeholder="mg/dL" suffix="mg/dL" optional />
              </SectionCard>
              <SectionCard title="Heart Rate">
                <NumberInput label="Resting heart rate (BPM)" value={form.restingBpm} onChange={v => set("restingBpm", v)} placeholder="e.g. 72" suffix="bpm" optional />
              </SectionCard>
              <div className="rounded-xl border border-dashed border-zinc-700 p-4 flex items-center gap-3">
                <Upload className="size-5 text-zinc-500 shrink-0" />
                <div>
                  <p className="text-sm text-zinc-300">Scan & test reports</p>
                  <p className="text-xs text-zinc-600 mt-0.5">WhatsApp these to Aman directly: +91 98156 90656</p>
                </div>
              </div>
            </>
          )}

          {/* STEP 6 — Photos */}
          {step === 5 && (
            <div className="space-y-4">
              <SectionCard title="Current Progress Photos">
                <p className="text-xs text-zinc-500">Wear comfortable fitted clothing. Good lighting. All optional.</p>
                <div className="grid grid-cols-2 gap-3">
                  <PhotoCard label="Front" value={form.photoFront} onChange={v => set("photoFront", v)} />
                  <PhotoCard label="Back" value={form.photoBack} onChange={v => set("photoBack", v)} />
                  <PhotoCard label="Left Side" value={form.photoLeft} onChange={v => set("photoLeft", v)} />
                  <PhotoCard label="Right Side" value={form.photoRight} onChange={v => set("photoRight", v)} />
                </div>
              </SectionCard>
              <SectionCard title="Pre-Conception Photo">
                <p className="text-xs text-zinc-500 mb-2">A photo from before your pregnancy, if available.</p>
                <div className="grid grid-cols-2 gap-3">
                  <PhotoCard label="Pre-Conception" value={form.photoPreConception} onChange={v => set("photoPreConception", v)} />
                </div>
              </SectionCard>
            </div>
          )}

          {/* STEP 7 — Measurements */}
          {step === 6 && (
            <>
              <SectionCard title="Current Measurements">
                <NumberInput label="Present Weight" value={form.presentWeight} onChange={v => set("presentWeight", v)} placeholder="kg" suffix="kg" optional />
                <NumberInput label="Abdomen (at navel)" value={form.abdomen} onChange={v => set("abdomen", v)} placeholder="cm" suffix="cm" optional />
                <NumberInput label="Waist (around pelvic bone)" value={form.waist} onChange={v => set("waist", v)} placeholder="cm" suffix="cm" optional />
                <NumberInput label="Hips (widest point)" value={form.hips} onChange={v => set("hips", v)} placeholder="cm" suffix="cm" optional />
              </SectionCard>
              <SectionCard title="Weight History">
                <NumberInput label="Average weight before conceiving" value={form.weightBeforeConceiving} onChange={v => set("weightBeforeConceiving", v)} placeholder="kg" suffix="kg" optional />
                <NumberInput label="Weight at start of 1st trimester" value={form.weightStart1stTrimester} onChange={v => set("weightStart1stTrimester", v)} placeholder="kg" suffix="kg" optional />
                <NumberInput label="Weight by end of 1st trimester" value={form.weightEnd1stTrimester} onChange={v => set("weightEnd1stTrimester", v)} placeholder="kg" suffix="kg" optional />
                <NumberInput label="Heaviest weight you&apos;ve ever been" value={form.heaviestWeight} onChange={v => set("heaviestWeight", v)} placeholder="kg" suffix="kg" optional />
              </SectionCard>
              <SectionCard title="Additional Notes">
                <TextArea label="Anything else Aman should know?" value={form.additionalInfo} onChange={v => set("additionalInfo", v)} placeholder="Any context about your pregnancy, health, concerns, or goals…" optional rows={3} />
              </SectionCard>
            </>
          )}

        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex gap-3 mt-6 pb-8">
        {step > 0 && (
          <button type="button" onClick={handlePrev}
            className="flex-1 rounded-full border border-zinc-700 py-3.5 text-sm font-medium text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors flex items-center justify-center gap-2">
            <ChevronLeft className="size-4" /> Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button type="button" onClick={handleNext} disabled={saving}
            className="flex-1 rounded-full py-3.5 text-sm font-bold uppercase tracking-wider text-black flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #FFB800, #B28000)" }}>
            Save & Continue <ChevronRight className="size-4" />
          </button>
        ) : (
          <button type="button" onClick={handleSubmit} disabled={submitting}
            className="flex-1 rounded-full py-3.5 text-sm font-bold uppercase tracking-wider text-black flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #FFD200, #FFB800)" }}>
            {submitting ? "Submitting…" : "Submit to Aman 🤱"}
          </button>
        )}
      </div>
    </ClientLayout>
  )
}
