"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { ClientLayout } from "@/components/layout/ClientLayout"
import { useAuth } from "@/hooks/useAuth"
import toast from "react-hot-toast"
import {
  User, Dumbbell, Utensils, Activity, Camera, Ruler, Sparkles, Check,
  Baby, Heart, ShieldAlert, Sun, Moon, Apple, Calendar
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

type AntenatalFormData = {
  // Section 1: Contact
  full_name: string
  email: string
  phone: string
  address: string
  alt_phone: string

  // Section 2: General Info
  dob: string
  height: string
  gestational_age: string
  lmp: string
  edd: string
  gravidity: string
  preg_type: string

  // Section 3: Lifestyle & Equipment
  wake_time: string
  sleep_time: string
  coach_before: string
  equipment_at_home: string
  equipment_details: string

  // Section 4: Health History
  injury_history: string
  health_issues: string
  family_history: string
  palpitation_signs: string
  surgical_history: string
  medications: string

  // Section 5: Detailed Health & Menstrual (Before Conception)
  constipation: string
  addictions: string
  urine_color: string
  sleep_hours: string
  bleeding_days: string
  cycle_frequency: string
  blood_loss: string
  first_days: string

  // Section 6: Training Before & Present
  working_status: string
  exercise_routine: string
  previous_workout: string
  daily_steps: string
  cardio_routine: string
  workout_preference: string

  // Section 7: Nutritional & Supplements
  supplements: string
  supplement_files: string[]
  whey_preference: string
  food_allergy: string
  allergy_files: string[]
  diet_morning: string
  diet_breakfast: string
  diet_mid_day: string
  diet_lunch: string
  diet_evening: string
  diet_dinner: string

  // Section 8: Food & Hydration Preferences
  water_intake: string
  food_love: string
  food_hate: string
  nausea_foods: string
  preferred_foods: string
  seasonal_fruits: string
  palate_type: string
  chocolates: string
  cheat_meal: string

  // Section 9: Diet Type & Timings
  diet_type: string
  non_veg_days: string
  lactose_intolerant: string
  breakfast_time: string
  mid_snack_time: string
  lunch_time: string
  evening_snack_time: string
  dinner_time: string

  // Section 10: Pictures Upload
  pic_front: string
  pic_back: string
  pic_left: string
  pic_right: string
  old_pictures: string[]

  // Section 11: Overseas Clients
  grocery_links: string
  supplement_links: string
  other_links: string

  // Section 12: Physiological & BP
  bp_morning: string
  bp_afternoon: string
  bp_night: string

  // Section 13: Blood Glucose
  fasting_glucose: string
  pp_breakfast: string
  pp_lunch: string
  pp_dinner: string

  // Section 14: Health Reports & Resting BPM
  reports: string[]
  resting_bpm: string
  final_notes: string

  // Section 15: Anthropometrics (Weight & Measurements)
  present_weight: string
  abdomen_navel: string
  waist_pelvic: string
  hips_measure: string
  avg_weight_before: string
  maintaining_since: string
  heaviest_weight: string
  weight_start_trimester: string
  weight_end_trimester: string
  equipment_media: string[]
}

const defaultAntenatalForm: AntenatalFormData = {
  full_name: "", email: "", phone: "", address: "", alt_phone: "",
  dob: "", height: "162", gestational_age: "16", lmp: "", edd: "", gravidity: "1", preg_type: "Singleton",
  wake_time: "07:00", sleep_time: "22:00", coach_before: "", equipment_at_home: "", equipment_details: "",
  injury_history: "", health_issues: "", family_history: "", palpitation_signs: "", surgical_history: "", medications: "Folic Acid, Iron, Calcium",
  constipation: "Regular", addictions: "None", urine_color: "Pale Yellow", sleep_hours: "8", bleeding_days: "4", cycle_frequency: "28", blood_loss: "Moderate", first_days: "",
  working_status: "Sitting Job", exercise_routine: "Light walking", previous_workout: "", daily_steps: "6000", cardio_routine: "Walking", workout_preference: "Morning",
  supplements: "Prenatal Multivitamin", supplement_files: [], whey_preference: "Yes", food_allergy: "", allergy_files: [],
  diet_morning: "", diet_breakfast: "", diet_mid_day: "", diet_lunch: "", diet_evening: "", diet_dinner: "",
  water_intake: "3.0", food_love: "", food_hate: "", nausea_foods: "", preferred_foods: "", seasonal_fruits: "", palate_type: "Both", chocolates: "", cheat_meal: "",
  diet_type: "Vegetarian", non_veg_days: "", lactose_intolerant: "No", breakfast_time: "08:30", mid_snack_time: "11:30", lunch_time: "14:00", evening_snack_time: "17:30", dinner_time: "20:30",
  pic_front: "", pic_back: "", pic_left: "", pic_right: "", old_pictures: [],
  grocery_links: "", supplement_links: "", other_links: "",
  bp_morning: "", bp_afternoon: "", bp_night: "",
  fasting_glucose: "", pp_breakfast: "", pp_lunch: "", pp_dinner: "",
  reports: [], resting_bpm: "72", final_notes: "",
  present_weight: "65", abdomen_navel: "33", waist_pelvic: "32", hips_measure: "38", avg_weight_before: "60", maintaining_since: "1 year", heaviest_weight: "68", weight_start_trimester: "60", weight_end_trimester: "63", equipment_media: []
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AntenatalOnboardingPage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<AntenatalFormData>(defaultAntenatalForm)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [showResumeBanner, setShowResumeBanner] = useState(false)

  // Touch Swipe Gesture State
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)

  const TOTAL_STEPS = 42

  const set = useCallback(<K extends keyof AntenatalFormData>(key: K, val: AntenatalFormData[K]) => {
    setForm(prev => {
      const updated = { ...prev, [key]: val }
      try {
        if (user?.id) localStorage.setItem(`draft_antenatal_joining_${user.id}`, JSON.stringify(updated))
      } catch {}
      return updated
    })
  }, [user?.id])

  // Pre-fill user profile info
  useEffect(() => {
    if (profile?.name && !form.full_name) set("full_name", profile.name)
    if (user?.email && !form.email) set("email", user.email)
    if (profile?.phone && !form.phone) set("phone", profile.phone)
  }, [profile, user, form.full_name, form.email, form.phone, set])

  // Check draft existence
  useEffect(() => {
    if (!user?.id) return
    try {
      const saved = localStorage.getItem(`draft_antenatal_joining_${user.id}`)
      if (saved) {
        setShowResumeBanner(true)
      }
    } catch {}
  }, [user?.id])

  const handleResumeDraft = () => {
    if (!user?.id) return
    try {
      const saved = localStorage.getItem(`draft_antenatal_joining_${user.id}`)
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
      localStorage.removeItem(`draft_antenatal_joining_${user.id}`)
    } catch {}
    setForm(defaultAntenatalForm)
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
          formType: "antenatal_joining",
          formData: form
        })
      })

      if (!res.ok) throw new Error("Submission failed")

      try {
        localStorage.removeItem(`draft_antenatal_joining_${user.id}`)
      } catch {}

      setDone(true)
      toast.success("AN-PN Questionnaire submitted successfully!")
    } catch (err: unknown) {
      console.error(err)
      toast.error("Error submitting form. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <ClientLayout>
        <div className="flex flex-col items-center justify-center min-h-[85vh] text-center px-4 space-y-6">
          <div className="size-20 rounded-full bg-[#FFB800]/20 flex items-center justify-center border border-[#FFB800]/40 animate-bounce">
            <Baby className="size-10 text-[#FFB800]" />
          </div>
          <div>
            <span className="text-[#FFB800] font-heading font-extrabold text-2xl uppercase tracking-widest block mb-2">
              AN – PN #TeamAKF
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl text-white font-extrabold tracking-wide">
              QUESTIONNAIRE SUBMITTED! 👶
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xs mx-auto mt-3 leading-relaxed">
              Pleased to have you in #teamAKF 😊 Coach Aman will review your pregnancy details and prepare your customized plans within 24 hours.
            </p>
          </div>
          <button
            onClick={() => router.push("/home")}
            className="px-8 py-4 rounded-2xl bg-[#FFB800] text-xs font-bold uppercase tracking-wider text-black hover:bg-[#FFC82C] transition-all shadow-xl shadow-[#FFB800]/20"
          >
            Go to Home
          </button>
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

      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="min-h-[85vh] pt-16 pb-24 flex flex-col justify-center px-4"
      >
        {/* STEP 1: Full Name */}
        {step === 0 && (
          <QuestionWrapper
            title="What is your full name?"
            subtitle="As you'd like Coach Aman to address you."
          >
            <TextInputDark
              value={form.full_name}
              onChange={(val) => set("full_name", val)}
              placeholder="e.g. Ananya Sharma"
              required
            />
          </QuestionWrapper>
        )}

        {/* STEP 2: Email & Phone */}
        {step === 1 && (
          <QuestionWrapper
            title="What are your primary contact details?"
            subtitle="Email & Phone for WhatsApp updates and consultation."
          >
            <div className="space-y-4">
              <TextInputDark
                type="email"
                value={form.email}
                onChange={(val) => set("email", val)}
                placeholder="Email Address"
                required
              />
              <TextInputDark
                type="tel"
                value={form.phone}
                onChange={(val) => set("phone", val)}
                placeholder="Primary WhatsApp Phone Number"
                required
              />
              <TextInputDark
                type="tel"
                value={form.alt_phone}
                onChange={(val) => set("alt_phone", val)}
                placeholder="Alternate Contact Number (Optional)"
              />
            </div>
          </QuestionWrapper>
        )}

        {/* STEP 3: Residence Address */}
        {step === 2 && (
          <QuestionWrapper
            title="What is your residence address?"
            subtitle="Required for client record and billing."
          >
            <TextAreaDark
              value={form.address}
              onChange={(val) => set("address", val)}
              placeholder="Full Street Address, City, State..."
            />
          </QuestionWrapper>
        )}

        {/* STEP 4: Date of Birth & Height */}
        {step === 3 && (
          <QuestionWrapper
            title="What is your Date of Birth & Height?"
            subtitle="Age and height to assess baseline metrics."
          >
            <div className="space-y-4">
              <TextInputDark
                type="date"
                value={form.dob}
                onChange={(val) => set("dob", val)}
              />
              <div>
                <label className="text-xs font-bold text-[#FFB800] uppercase tracking-wider block mb-1">Height (cm)</label>
                <NumberStepper
                  value={form.height}
                  onChange={(val) => set("height", val)}
                  min={120}
                  max={210}
                  unit="cm"
                />
              </div>
            </div>
          </QuestionWrapper>
        )}

        {/* STEP 5: Gestational Age */}
        {step === 4 && (
          <QuestionWrapper
            title="How many weeks pregnant are you?"
            subtitle="Current gestational age in weeks."
          >
            <NumberStepper
              value={form.gestational_age}
              onChange={(val) => set("gestational_age", val)}
              min={1}
              max={42}
              unit="weeks"
            />
          </QuestionWrapper>
        )}

        {/* STEP 6: LMP & EDD */}
        {step === 5 && (
          <QuestionWrapper
            title="What are your LMP & EDD dates?"
            subtitle="Last Menstrual Period (LMP) & Expected Date of Delivery (EDD)."
          >
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#FFB800] uppercase tracking-wider block mb-1">LMP (Last Menstrual Period)</label>
                <TextInputDark
                  type="date"
                  value={form.lmp}
                  onChange={(val) => set("lmp", val)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#FFB800] uppercase tracking-wider block mb-1">EDD (Expected Date of Delivery)</label>
                <TextInputDark
                  type="date"
                  value={form.edd}
                  onChange={(val) => set("edd", val)}
                />
              </div>
            </div>
          </QuestionWrapper>
        )}

        {/* STEP 7: Gravidity & Pregnancy Type */}
        {step === 6 && (
          <QuestionWrapper
            title="Gravidity & Type of Pregnancy"
            subtitle="Number of pregnancies & singleton vs twin."
          >
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">Gravidity (Number of Pregnancies)</label>
                <NumberStepper
                  value={form.gravidity}
                  onChange={(val) => set("gravidity", val)}
                  min={1}
                  max={10}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">Pregnancy Type</label>
                <ImageCardPicker
                  selectedValue={form.preg_type}
                  onChange={(val) => set("preg_type", val)}
                  options={[
                    { value: "Singleton", label: "Singleton", subtitle: "Single baby pregnancy", icon: <Baby /> },
                    { value: "Twin", label: "Twin", subtitle: "Twin pregnancy", icon: <Sparkles /> },
                    { value: "Other", label: "Other", subtitle: "Multiple / Special care", icon: <Heart /> },
                  ]}
                />
              </div>
            </div>
          </QuestionWrapper>
        )}

        {/* STEP 8: Daily Sleep & Wake Schedule */}
        {step === 7 && (
          <QuestionWrapper
            title="What is your sleep & wake up schedule?"
            subtitle="Sleep duration & timing during pregnancy."
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">Wake Up</label>
                  <TextInputDark type="time" value={form.wake_time} onChange={(val) => set("wake_time", val)} />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">Bed Time</label>
                  <TextInputDark type="time" value={form.sleep_time} onChange={(val) => set("sleep_time", val)} />
                </div>
              </div>
              <GoldSlider
                value={parseFloat(form.sleep_hours) || 8}
                onChange={(val) => set("sleep_hours", val.toString())}
                min={4}
                max={12}
                unit="hrs"
                labels={{ min: "4 hrs", max: "12 hrs" }}
              />
            </div>
          </QuestionWrapper>
        )}

        {/* STEP 9: Previous Coach */}
        {step === 8 && (
          <QuestionWrapper
            title="Have you hired a coach or nutritionist before?"
            subtitle="If yes, share your previous experience."
          >
            <TextAreaDark
              value={form.coach_before}
              onChange={(val) => set("coach_before", val)}
              placeholder="e.g. Yes / No (and details)..."
            />
          </QuestionWrapper>
        )}

        {/* STEP 10: Equipment at Home */}
        {step === 9 && (
          <QuestionWrapper
            title="What exercise equipment do you have at home?"
            subtitle="Tap all equipment available for safe antenatal exercise."
          >
            <ChipMultiSelect
              options={["Dumbbells (Light)", "Resistance Bands", "Stationary Bike", "Yoga Mat", "Pilates Ball", "None"]}
              selectedValues={form.equipment_at_home ? form.equipment_at_home.split(", ") : []}
              onChange={(vals) => set("equipment_at_home", vals.join(", "))}
            />
          </QuestionWrapper>
        )}

        {/* STEP 11: Work Schedule */}
        {step === 10 && (
          <QuestionWrapper
            title="What is your current work schedule?"
            subtitle="Sitting vs standing job during pregnancy."
          >
            <TextAreaDark
              value={form.working_status}
              onChange={(val) => set("working_status", val)}
              placeholder="e.g. Sitting IT job 8 hours/day WFH..."
            />
          </QuestionWrapper>
        )}

        {/* STEP 12: Current Exercise Routine */}
        {step === 11 && (
          <QuestionWrapper
            title="Current exercise routine during pregnancy"
            subtitle="Describe walking or physical activity since conceiving."
          >
            <TextAreaDark
              value={form.exercise_routine}
              onChange={(val) => set("exercise_routine", val)}
              placeholder="e.g. 30 minutes light morning walk daily..."
            />
          </QuestionWrapper>
        )}

        {/* STEP 13: Workout Routine Before Conceiving */}
        {step === 12 && (
          <QuestionWrapper
            title="Workout routine 3 months before conceiving"
            subtitle="Helps establish your baseline fitness conditioning."
          >
            <TextAreaDark
              value={form.previous_workout}
              onChange={(val) => set("previous_workout", val)}
              placeholder="e.g. Gym weight training 4x a week..."
            />
          </QuestionWrapper>
        )}

        {/* STEP 14: Daily Steps */}
        {step === 13 && (
          <QuestionWrapper
            title="Average daily steps during pregnancy"
            subtitle="Tracked on smartwatch or phone."
          >
            <GoldSlider
              value={parseFloat(form.daily_steps) || 6000}
              onChange={(val) => set("daily_steps", val.toString())}
              min={2000}
              max={15000}
              step={500}
              unit="steps"
              labels={{ min: "2,000 steps", max: "15,000 steps" }}
            />
          </QuestionWrapper>
        )}

        {/* STEP 15: Cardio Routine */}
        {step === 14 && (
          <QuestionWrapper
            title="Cardio routine & preferences"
            subtitle="Select safe cardio formats enjoyed."
          >
            <ChipMultiSelect
              options={["Outdoor Walking", "Treadmill Slow Walk", "Stationary Cycling", "Prenatal Swimming", "None"]}
              selectedValues={form.cardio_routine ? form.cardio_routine.split(", ") : []}
              onChange={(vals) => set("cardio_routine", vals.join(", "))}
            />
          </QuestionWrapper>
        )}

        {/* STEP 16: Preferred Workout Timing */}
        {step === 15 && (
          <QuestionWrapper
            title="Preferred workout timing during pregnancy"
            subtitle="Select preferred time slot."
          >
            <ImageCardPicker
              selectedValue={form.workout_preference}
              onChange={(val) => set("workout_preference", val)}
              options={[
                { value: "Morning", label: "Morning (7 AM - 10 AM)", icon: <Sun /> },
                { value: "Afternoon", label: "Afternoon (12 PM - 3 PM)", icon: <Sun /> },
                { value: "Evening", label: "Evening (5 PM - 8 PM)", icon: <Moon /> },
              ]}
            />
          </QuestionWrapper>
        )}

        {/* STEP 17: Injury & Joint Stiffness */}
        {step === 16 && (
          <QuestionWrapper
            title="Any past injuries, pelvic pain, or back tightness?"
            subtitle="Essential for customizing safe pelvic floor & strength movements."
          >
            <ChipMultiSelect
              options={["Pelvic Girdle Pain", "Lower Back Tightness", "Knee Discomfort", "Past Surgery", "None"]}
              selectedValues={form.injury_history ? form.injury_history.split(", ") : []}
              onChange={(vals) => set("injury_history", vals.join(", "))}
            />
          </QuestionWrapper>
        )}

        {/* STEP 18: Health Issues & Conditions */}
        {step === 17 && (
          <QuestionWrapper
            title="Any health issues or pregnancy conditions?"
            subtitle="Tap all that apply."
          >
            <ChipMultiSelect
              options={["Gestational Diabetes", "Thyroid Disorder", "PCOS / PCOD", "High Blood Pressure", "Low BP / Dizziness", "None"]}
              selectedValues={form.health_issues ? form.health_issues.split(", ") : []}
              onChange={(vals) => set("health_issues", vals.join(", "))}
            />
          </QuestionWrapper>
        )}

        {/* STEP 19: Family Health History */}
        {step === 18 && (
          <QuestionWrapper
            title="Family history of diabetes, thyroid, or BP?"
            subtitle="Family medical context for preventive care."
          >
            <TextAreaDark
              value={form.family_history}
              onChange={(val) => set("family_history", val)}
              placeholder="e.g. Mother diabetic, father high BP..."
            />
          </QuestionWrapper>
        )}

        {/* STEP 20: Palpitation & Dizziness Signs */}
        {step === 19 && (
          <QuestionWrapper
            title="Any sudden palpitations, dizziness, or shortness of breath?"
            subtitle="Describe symptoms if any."
          >
            <TextAreaDark
              value={form.palpitation_signs}
              onChange={(val) => set("palpitation_signs", val)}
              placeholder="e.g. Occasional dizziness when standing up quickly..."
            />
          </QuestionWrapper>
        )}

        {/* STEP 21: Prescribed Medications */}
        {step === 20 && (
          <QuestionWrapper
            title="Prescribed pregnancy drugs & supplements"
            subtitle="Mention Folic Acid, Iron, Calcium, or hormonal supplements."
          >
            <TextAreaDark
              value={form.medications}
              onChange={(val) => set("medications", val)}
              placeholder="e.g. Folic Acid 5mg, Iron, Calcium, Progesterone..."
            />
          </QuestionWrapper>
        )}

        {/* STEP 22: Constipation & Stool Frequency */}
        {step === 21 && (
          <QuestionWrapper
            title="Stool frequency & constipation history"
            subtitle="Constipation is common in pregnancy; Coach will adjust fiber & hydration."
          >
            <ChipSingleSelect
              options={["Regular (1-2x daily)", "Mild Constipation", "Severe Constipation", "Irregular"]}
              selectedValue={form.constipation}
              onChange={(val) => set("constipation", val)}
            />
          </QuestionWrapper>
        )}

        {/* STEP 23: Menstrual Health Before Conceiving */}
        {step === 22 && (
          <QuestionWrapper
            title="Menstrual cycle history before conceiving"
            subtitle="Duration & cycle regularity."
          >
            <div className="space-y-4">
              <TextInputDark
                value={form.bleeding_days}
                onChange={(val) => set("bleeding_days", val)}
                placeholder="Bleeding Duration (e.g. 4 days)"
              />
              <TextInputDark
                value={form.cycle_frequency}
                onChange={(val) => set("cycle_frequency", val)}
                placeholder="Cycle Frequency (e.g. 28 days)"
              />
              <ChipSingleSelect
                options={["Light", "Moderate", "Heavy"]}
                selectedValue={form.blood_loss}
                onChange={(val) => set("blood_loss", val)}
              />
            </div>
          </QuestionWrapper>
        )}

        {/* STEP 24: Dietary Preference */}
        {step === 23 && (
          <QuestionWrapper
            title="What is your dietary preference?"
            subtitle="Maternal nutrition plan will strictly follow this."
          >
            <ImageCardPicker
              selectedValue={form.diet_type}
              onChange={(val) => set("diet_type", val)}
              options={[
                { value: "Vegetarian", label: "Vegetarian", subtitle: "Paneer, Dal, Milk, Nuts", icon: <Apple /> },
                { value: "Non-Veg", label: "Non-Vegetarian", subtitle: "Chicken, Fish, Eggs", icon: <Utensils /> },
                { value: "Eggetarian", label: "Eggetarian", subtitle: "Vegetarian + Eggs", icon: <Utensils /> },
                { value: "Vegan", label: "Vegan", subtitle: "Plant-based only", icon: <Apple /> },
              ]}
            />
          </QuestionWrapper>
        )}

        {/* STEP 25: Non-Veg Fast Days */}
        {step === 24 && (
          <QuestionWrapper
            title="Any days you avoid Non-Veg foods?"
            subtitle="Select fast days or religious days."
          >
            <ChipMultiSelect
              options={["Monday", "Tuesday", "Thursday", "Saturday", "None"]}
              selectedValues={form.non_veg_days ? form.non_veg_days.split(", ") : []}
              onChange={(vals) => set("non_veg_days", vals.join(", "))}
            />
          </QuestionWrapper>
        )}

        {/* STEP 26: Lactose Intolerance */}
        {step === 25 && (
          <QuestionWrapper
            title="Are you lactose intolerant?"
            subtitle="Can you digest milk, curd, and paneer easily?"
          >
            <ChipSingleSelect
              options={["No - Digest Dairy Fine", "Yes - Lactose Intolerant", "Partial Intolerance"]}
              selectedValue={form.lactose_intolerant}
              onChange={(val) => set("lactose_intolerant", val)}
            />
          </QuestionWrapper>
        )}

        {/* STEP 27: Present Meal Timings */}
        {step === 26 && (
          <QuestionWrapper
            title="What are your present meal timings?"
            subtitle="Select typical times for your main meals."
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">Breakfast</label>
                <TextInputDark type="time" value={form.breakfast_time} onChange={(val) => set("breakfast_time", val)} />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">Lunch</label>
                <TextInputDark type="time" value={form.lunch_time} onChange={(val) => set("lunch_time", val)} />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">Eve Snack</label>
                <TextInputDark type="time" value={form.evening_snack_time} onChange={(val) => set("evening_snack_time", val)} />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">Dinner</label>
                <TextInputDark type="time" value={form.dinner_time} onChange={(val) => set("dinner_time", val)} />
              </div>
            </div>
          </QuestionWrapper>
        )}

        {/* STEP 28: Whey Protein Preference */}
        {step === 27 && (
          <QuestionWrapper
            title="Would you mind taking Whey Protein during pregnancy?"
            subtitle="Safely helps hit clean protein target."
          >
            <ChipSingleSelect
              options={["Yes - Happy to take Whey", "Prefer Whole Foods Only", "Need Guidance from Coach"]}
              selectedValue={form.whey_preference}
              onChange={(val) => set("whey_preference", val)}
            />
          </QuestionWrapper>
        )}

        {/* STEP 29: Food Allergies */}
        {step === 28 && (
          <QuestionWrapper
            title="Any food allergies or intolerances?"
            subtitle="Tap all that apply."
          >
            <ChipMultiSelect
              options={["Lactose / Dairy", "Gluten", "Nuts", "Eggs", "None"]}
              selectedValues={form.food_allergy ? form.food_allergy.split(", ") : []}
              onChange={(vals) => set("food_allergy", vals.join(", "))}
            />
          </QuestionWrapper>
        )}

        {/* STEP 30: Current Diet Log */}
        {step === 29 && (
          <QuestionWrapper
            title="Log your current diet from morning to night."
            subtitle="Describe typical food & drink items in a day."
          >
            <div className="space-y-3">
              <TextAreaDark
                value={form.diet_breakfast}
                onChange={(val) => set("diet_breakfast", val)}
                placeholder="Breakfast details (e.g. Oats + milk + banana)..."
                rows={2}
              />
              <TextAreaDark
                value={form.diet_lunch}
                onChange={(val) => set("diet_lunch", val)}
                placeholder="Lunch details (e.g. Roti, sabzi, curd, salad)..."
                rows={2}
              />
              <TextAreaDark
                value={form.diet_dinner}
                onChange={(val) => set("diet_dinner", val)}
                placeholder="Dinner details (e.g. Paneer / chicken, khichdi)..."
                rows={2}
              />
            </div>
          </QuestionWrapper>
        )}

        {/* STEP 31: Water Intake */}
        {step === 30 && (
          <QuestionWrapper
            title="Daily water intake during pregnancy"
            subtitle="Hydration supports amniotic fluid & digestion."
          >
            <GoldSlider
              value={parseFloat(form.water_intake) || 3.0}
              onChange={(val) => set("water_intake", val.toString())}
              min={1.0}
              max={5.0}
              step={0.5}
              unit="L"
              labels={{ min: "1.0 L", max: "5.0 L" }}
            />
          </QuestionWrapper>
        )}

        {/* STEP 32: Nausea & Pregnancy Cravings */}
        {step === 31 && (
          <QuestionWrapper
            title="Foods causing nausea & foods you LOVE"
            subtitle="Nausea triggers vs cravings."
          >
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-red-400 uppercase tracking-wider block mb-1">Foods Causing Nausea / Aversion</label>
                <TextAreaDark
                  value={form.nausea_foods}
                  onChange={(val) => set("nausea_foods", val)}
                  placeholder="e.g. Strong fried smells, raw papaya..."
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#FFB800] uppercase tracking-wider block mb-1">Foods Loved / Craved</label>
                <TextAreaDark
                  value={form.food_love}
                  onChange={(val) => set("food_love", val)}
                  placeholder="e.g. Home curd, kheer, fruits..."
                />
              </div>
            </div>
          </QuestionWrapper>
        )}

        {/* STEP 33: Palate & Treat Meal */}
        {step === 32 && (
          <QuestionWrapper
            title="Palate preference & favorite treat meal"
            subtitle="Savory vs sweet preferences."
          >
            <div className="space-y-4">
              <ChipSingleSelect
                options={["Savory", "Sweet", "Both"]}
                selectedValue={form.palate_type}
                onChange={(val) => set("palate_type", val)}
              />
              <TextInputDark
                value={form.cheat_meal}
                onChange={(val) => set("cheat_meal", val)}
                placeholder="Favorite treat meal (e.g. Dosa, Homemade Kheer)"
              />
            </div>
          </QuestionWrapper>
        )}

        {/* STEP 34: Resting Blood Pressure */}
        {step === 33 && (
          <QuestionWrapper
            title="Resting Blood Pressure Readings"
            subtitle="Essential for monitoring gestational hypertension risk."
          >
            <div className="space-y-3">
              <TextInputDark
                value={form.bp_morning}
                onChange={(val) => set("bp_morning", val)}
                placeholder="Morning BP (e.g. 115/75 mmHg)"
              />
              <TextInputDark
                value={form.bp_afternoon}
                onChange={(val) => set("bp_afternoon", val)}
                placeholder="Afternoon BP"
              />
              <TextInputDark
                value={form.bp_night}
                onChange={(val) => set("bp_night", val)}
                placeholder="Night BP"
              />
            </div>
          </QuestionWrapper>
        )}

        {/* STEP 35: Blood Glucose Monitoring */}
        {step === 34 && (
          <QuestionWrapper
            title="Blood Glucose Readings (if monitored)"
            subtitle="Check for Gestational Diabetes Mellitus (GDM)."
          >
            <div className="space-y-3">
              <TextInputDark
                value={form.fasting_glucose}
                onChange={(val) => set("fasting_glucose", val)}
                placeholder="Fasting Glucose (e.g. 85 mg/dL)"
              />
              <TextInputDark
                value={form.pp_breakfast}
                onChange={(val) => set("pp_breakfast", val)}
                placeholder="Post-Breakfast Glucose (e.g. 110 mg/dL)"
              />
            </div>
          </QuestionWrapper>
        )}

        {/* STEP 36: Resting BPM */}
        {step === 35 && (
          <QuestionWrapper
            title="What is your Resting Heart Rate (BPM)?"
            subtitle="Tracked on smartwatch or manual pulse reading."
          >
            <NumberStepper
              value={form.resting_bpm}
              onChange={(val) => set("resting_bpm", val)}
              min={50}
              max={120}
              unit="bpm"
            />
          </QuestionWrapper>
        )}

        {/* STEP 37: Medical Reports & Ultrasounds Upload */}
        {step === 36 && (
          <QuestionWrapper
            title="Upload Blood Tests, Urine Analysis & Ultrasound Scans"
            subtitle="Done within last 3 months."
          >
            <PhotoUploadScreen
              label="UPLOAD PREGNANCY / MEDICAL REPORTS"
              files={form.reports}
              onFilesChange={(f) => set("reports", f)}
              multiple
            />
          </QuestionWrapper>
        )}

        {/* STEP 38: Present Weight */}
        {step === 37 && (
          <QuestionWrapper
            title="Present Body Weight (kg)"
            subtitle="Measured empty stomach in morning."
          >
            <NumberStepper
              value={form.present_weight}
              onChange={(val) => set("present_weight", val)}
              min={30}
              max={200}
              step={0.1}
              unit="kg"
            />
          </QuestionWrapper>
        )}

        {/* STEP 39: Body Measurements */}
        {step === 38 && (
          <QuestionWrapper
            title="Abdomen, Waist & Hips Measurements (inches)"
            subtitle="Track safe pregnancy weight & body changes."
          >
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#FFB800] uppercase tracking-wider block mb-1">Abdomen (at navel)</label>
                <NumberStepper
                  value={form.abdomen_navel}
                  onChange={(val) => set("abdomen_navel", val)}
                  min={20}
                  max={70}
                  step={0.25}
                  unit="in"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#FFB800] uppercase tracking-wider block mb-1">Hips</label>
                <NumberStepper
                  value={form.hips_measure}
                  onChange={(val) => set("hips_measure", val)}
                  min={20}
                  max={70}
                  step={0.25}
                  unit="in"
                />
              </div>
            </div>
          </QuestionWrapper>
        )}

        {/* STEP 40: Present Photos */}
        {step === 39 && (
          <QuestionWrapper
            title="Present Progress Photo (Front View)"
            subtitle="Comfortable sportswear or maternity fit."
          >
            <PhotoUploadScreen
              label="PRESENT FRONT PHOTO"
              files={form.pic_front ? [form.pic_front] : []}
              onFilesChange={(f) => set("pic_front", f[0] || "")}
            />
          </QuestionWrapper>
        )}

        {/* STEP 41: Pre-Conception Photos */}
        {step === 40 && (
          <QuestionWrapper
            title="Photos from 2-3 months before conceiving"
            subtitle="Helps Coach see baseline body composition (Optional)."
          >
            <PhotoUploadScreen
              label="PRE-CONCEPTION PHOTOS"
              files={form.old_pictures}
              onFilesChange={(f) => set("old_pictures", f)}
              multiple
            />
          </QuestionWrapper>
        )}

        {/* STEP 42: Final Message & Equipment Photos */}
        {step === 41 && (
          <QuestionWrapper
            title="Additional notes & Equipment photos"
            subtitle="Any final comments or questions for Coach Aman!"
          >
            <div className="space-y-4">
              <TextAreaDark
                value={form.final_notes}
                onChange={(val) => set("final_notes", val)}
                placeholder="Write any extra details for Coach Aman..."
              />
              <PhotoUploadScreen
                label="UPLOAD EXERCISE EQUIPMENT PHOTOS (OPTIONAL)"
                files={form.equipment_media}
                onFilesChange={(f) => set("equipment_media", f)}
                multiple
              />
            </div>
          </QuestionWrapper>
        )}
      </div>

      <FormFooter
        onNext={handleNext}
        isLastStep={step === TOTAL_STEPS - 1}
        submitting={submitting}
        showSkip={step >= 36}
        onSkip={handleNext}
      />
    </ClientLayout>
  )
}
