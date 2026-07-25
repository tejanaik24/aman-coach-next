"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { ClientLayout } from "@/components/layout/ClientLayout"
import { useAuth } from "@/hooks/useAuth"
import { getClientProfile } from "@/lib/store"
import toast from "react-hot-toast"
import {
  User, Dumbbell, Utensils, Activity, Camera, Ruler, Flame, Sparkles, Check,
  Briefcase, Heart, ShieldAlert, Clock, Moon, Sun, Apple
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

type FormData = {
  // Section 1: Contact Information
  full_name: string
  email: string
  address: string
  contact_number: string
  alt_contact_number: string

  // Section 2: General Information
  dob: string
  height: string
  goal: string
  wake_up_time: string
  sleep_time: string
  previous_coach: string
  home_equipment: string

  // Section 3: Lifestyle & Training Information
  work_details: string
  current_exercise: string
  workout_routine: string
  daily_steps: string
  cardio_details: string
  preferred_workout_time: string

  // Section 4: Health History Information
  injuries: string
  health_issues: string
  medications: string
  constipation_history: string
  addictions: string
  urine_color: string
  menstrual_duration: string
  menstrual_cycle_frequency: string
  menstrual_blood_loss: string
  menstrual_initial_days: string
  steroid_use: string

  // Section 5: Nutritional Information
  dietary_preference: string
  no_non_veg_days: string
  lactose_intolerant: string
  breakfast_time: string
  mid_day_snack_time: string
  lunch_time: string
  evening_snack_time: string
  dinner_time: string
  max_meals: string
  pre_workout_meal: string
  supplements: string
  supplements_doc: string[]
  whey_protein_preference: string
  food_allergies: string
  food_allergies_doc: string[]
  current_diet_summary: string
  current_diet_morning: string
  current_diet_breakfast: string
  current_diet_mid_day: string
  current_diet_lunch: string
  current_diet_evening: string
  current_diet_dinner: string
  water_intake: string
  loved_foods: string
  hated_foods: string
  preferred_foods: string
  seasonal_fruits: string
  palate_preference: string
  chocolate_preference: string
  cheat_meal: string
  grocery_stores: string
  supplement_stores: string
  other_client_info: string

  // Section 6: Physiological Health Assessment
  bp_morning: string
  bp_afternoon: string
  bp_night: string
  medical_reports: string[]
  additional_notes: string

  // Section 7: Pictures Upload
  pic_front: string
  pic_back: string
  pic_left: string
  pic_right: string
  men_pic_front: string
  men_pic_back: string
  men_pic_left: string
  men_pic_right: string
  fav_pose: string
  mandatory_pose: string[]

  // Section 8: Anthropometrics (Weight & Measurements)
  weight: string
  neck: string
  abdomen: string
  hips: string
  right_arm: string
  right_thigh: string
  right_calf: string
  lowest_weight: string
  lowest_period: string
  heaviest_weight: string
  heaviest_period: string
  form_docs: string[]
}

const defaultForm: FormData = {
  full_name: "", email: "", address: "", contact_number: "", alt_contact_number: "",
  dob: "", height: "170", goal: "Weight Loss", wake_up_time: "06:30", sleep_time: "22:30", previous_coach: "", home_equipment: "",
  work_details: "Desk Job", current_exercise: "Intermediate", workout_routine: "", daily_steps: "8000", cardio_details: "", preferred_workout_time: "Evening",
  injuries: "", health_issues: "", medications: "", constipation_history: "", addictions: "", urine_color: "",
  menstrual_duration: "", menstrual_cycle_frequency: "", menstrual_blood_loss: "", menstrual_initial_days: "", steroid_use: "",
  dietary_preference: "Non-Veg", no_non_veg_days: "", lactose_intolerant: "No", breakfast_time: "08:30", mid_day_snack_time: "11:30",
  lunch_time: "14:00", evening_snack_time: "18:00", dinner_time: "21:00", max_meals: "4", pre_workout_meal: "Yes", supplements: "", supplements_doc: [],
  whey_protein_preference: "Yes", food_allergies: "", food_allergies_doc: [], current_diet_summary: "", current_diet_morning: "",
  current_diet_breakfast: "", current_diet_mid_day: "", current_diet_lunch: "", current_diet_evening: "", current_diet_dinner: "",
  water_intake: "3.5", loved_foods: "", hated_foods: "", preferred_foods: "", seasonal_fruits: "", palate_preference: "Both",
  chocolate_preference: "", cheat_meal: "", grocery_stores: "", supplement_stores: "", other_client_info: "",
  bp_morning: "", bp_afternoon: "", bp_night: "", medical_reports: [], additional_notes: "",
  pic_front: "", pic_back: "", pic_left: "", pic_right: "", men_pic_front: "", men_pic_back: "", men_pic_left: "", men_pic_right: "",
  fav_pose: "", mandatory_pose: [],
  weight: "70", neck: "15", abdomen: "32", hips: "36", right_arm: "14", right_thigh: "22", right_calf: "14", lowest_weight: "65",
  lowest_period: "", heaviest_weight: "85", heaviest_period: "", form_docs: [],
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StandardOnboardingPage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>(defaultForm)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [checkingRedirect, setCheckingRedirect] = useState(true)
  const [showResumeBanner, setShowResumeBanner] = useState(false)

  // Touch Swipe Gesture State
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)

  const TOTAL_STEPS = 40

  const set = useCallback(<K extends keyof FormData>(key: K, val: FormData[K]) => {
    setForm(prev => {
      const updated = { ...prev, [key]: val }
      try {
        if (user?.id) localStorage.setItem(`draft_standard_joining_${user.id}`, JSON.stringify(updated))
      } catch {}
      return updated
    })
  }, [user?.id])

  // Check client_type redirect requirement
  useEffect(() => {
    if (!user?.id) return
    getClientProfile(user.id).then(clientData => {
      if (clientData?.client_type === "antenatal") {
        router.replace("/onboarding/antenatal")
      } else {
        setCheckingRedirect(false)
      }
    }).catch(() => setCheckingRedirect(false))
  }, [user?.id, router])

  // Pre-fill user profile info
  useEffect(() => {
    if (profile?.name && !form.full_name) set("full_name", profile.name)
    if (user?.email && !form.email) set("email", user.email)
    if (profile?.phone && !form.contact_number) set("contact_number", profile.phone)
  }, [profile, user, form.full_name, form.email, form.contact_number, set])

  // Check draft existence
  useEffect(() => {
    if (!user?.id) return
    try {
      const saved = localStorage.getItem(`draft_standard_joining_${user.id}`)
      if (saved) {
        setShowResumeBanner(true)
      }
    } catch {}
  }, [user?.id])

  const handleResumeDraft = () => {
    if (!user?.id) return
    try {
      const saved = localStorage.getItem(`draft_standard_joining_${user.id}`)
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
      localStorage.removeItem(`draft_standard_joining_${user.id}`)
    } catch {}
    setForm(defaultForm)
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
          formType: "standard_joining",
          formData: form
        })
      })

      if (!res.ok) throw new Error("Submission failed")

      try {
        localStorage.removeItem(`draft_standard_joining_${user.id}`)
      } catch {}

      setDone(true)
      toast.success("Questionnaire submitted successfully!")
    } catch (err: unknown) {
      console.error(err)
      toast.error("Error submitting form. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (checkingRedirect) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="size-8 rounded-full border-2 border-[#FFB800] border-t-transparent animate-spin" />
        </div>
      </ClientLayout>
    )
  }

  if (done) {
    return (
      <ClientLayout>
        <div className="flex flex-col items-center justify-center min-h-[85vh] text-center px-4 space-y-6">
          <div className="size-20 rounded-full bg-[#FFB800]/20 flex items-center justify-center border border-[#FFB800]/40 animate-bounce">
            <Sparkles className="size-10 text-[#FFB800]" />
          </div>
          <div>
            <span className="text-[#FFB800] font-heading font-extrabold text-2xl uppercase tracking-widest block mb-2">
              #TeamAKF
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl text-white font-extrabold tracking-wide">
              WELCOME TO #TEAMAKF! 🎉
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xs mx-auto mt-3 leading-relaxed">
              Your lifestyle questionnaire has been received! Coach Aman will review your details and prepare your customized plan within 24 hours.
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
              placeholder="e.g. Aman Khurana"
              required
            />
          </QuestionWrapper>
        )}

        {/* STEP 2: Email & Phone */}
        {step === 1 && (
          <QuestionWrapper
            title="What are your primary contact details?"
            subtitle="Email & Phone for client updates and WhatsApp communication."
          >
            <div className="space-y-4">
              <TextInputDark
                type="email"
                value={form.email}
                onChange={(val) => set("email", val)}
                placeholder="Email Address (e.g. client@example.com)"
                required
              />
              <TextInputDark
                type="tel"
                value={form.contact_number}
                onChange={(val) => set("contact_number", val)}
                placeholder="Primary WhatsApp / Phone Number"
                required
              />
              <TextInputDark
                type="tel"
                value={form.alt_contact_number}
                onChange={(val) => set("alt_contact_number", val)}
                placeholder="Alternate Contact Number (Optional)"
              />
            </div>
          </QuestionWrapper>
        )}

        {/* STEP 3: Address */}
        {step === 2 && (
          <QuestionWrapper
            title="What is your residence address?"
            subtitle="Required for GST invoicing and location-based plan optimization."
          >
            <TextAreaDark
              value={form.address}
              onChange={(val) => set("address", val)}
              placeholder="Full Street Address, City, State, Country..."
            />
          </QuestionWrapper>
        )}

        {/* STEP 4: Date of Birth */}
        {step === 3 && (
          <QuestionWrapper
            title="What is your Date of Birth?"
            subtitle="Used to compute age and metabolic rate."
          >
            <TextInputDark
              type="date"
              value={form.dob}
              onChange={(val) => set("dob", val)}
              required
            />
          </QuestionWrapper>
        )}

        {/* STEP 5: Height */}
        {step === 4 && (
          <QuestionWrapper
            title="What is your height in centimeters?"
            subtitle="Tap + or - to select exact height."
          >
            <NumberStepper
              value={form.height}
              onChange={(val) => set("height", val)}
              min={120}
              max={230}
              unit="cm"
            />
          </QuestionWrapper>
        )}

        {/* STEP 6: Primary Fitness Goal */}
        {step === 5 && (
          <QuestionWrapper
            title="What is your primary fitness goal?"
            subtitle="Select the goal that matters most right now."
          >
            <ImageCardPicker
              selectedValue={form.goal}
              onChange={(val) => set("goal", val)}
              options={[
                { value: "Weight Loss", label: "Fat / Weight Loss", subtitle: "Drop body fat & get lean", icon: <Flame /> },
                { value: "Muscle Gain", label: "Muscle Building", subtitle: "Add lean muscle mass & size", icon: <Dumbbell /> },
                { value: "Body Recomposition", label: "Body Recomp", subtitle: "Burn fat & build muscle simultaneously", icon: <Sparkles /> },
                { value: "Endurance / Health", label: "Endurance & Vitality", subtitle: "Improve stamina, BP & blood work", icon: <Heart /> },
                { value: "Contest Prep", label: "Contest Prep", subtitle: "Competitive physique transformation", icon: <User /> },
              ]}
            />
          </QuestionWrapper>
        )}

        {/* STEP 7: Daily Sleep & Wake Schedule */}
        {step === 6 && (
          <QuestionWrapper
            title="What is your sleep & wake up schedule?"
            subtitle="Circadian rhythm dictates your meal & workout timing."
          >
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">Wake Up Time</label>
                <TextInputDark
                  type="time"
                  value={form.wake_up_time}
                  onChange={(val) => set("wake_up_time", val)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">Bed Time</label>
                <TextInputDark
                  type="time"
                  value={form.sleep_time}
                  onChange={(val) => set("sleep_time", val)}
                />
              </div>
            </div>
          </QuestionWrapper>
        )}

        {/* STEP 8: Previous Coach History */}
        {step === 7 && (
          <QuestionWrapper
            title="Have you hired a coach or nutritionist before?"
            subtitle="If yes, share who & the reason for leaving if comfortable."
          >
            <TextAreaDark
              value={form.previous_coach}
              onChange={(val) => set("previous_coach", val)}
              placeholder="e.g. Yes, hired a online trainer 6 months ago, left due to rigid non-customized diet..."
            />
          </QuestionWrapper>
        )}

        {/* STEP 9: Home Equipment */}
        {step === 8 && (
          <QuestionWrapper
            title="What workout equipment do you have at home?"
            subtitle="Tap all equipment available to you."
          >
            <ChipMultiSelect
              options={["Dumbbells", "Resistance Bands", "Pull-up Bar", "Treadmill / Spin Bike", "Adjustable Bench", "Barbell & Plates", "None"]}
              selectedValues={form.home_equipment ? form.home_equipment.split(", ") : []}
              onChange={(vals) => set("home_equipment", vals.join(", "))}
            />
          </QuestionWrapper>
        )}

        {/* STEP 10: Work Details */}
        {step === 9 && (
          <QuestionWrapper
            title="What is your daily work schedule & activity level?"
            subtitle="Helps calculate total daily energy expenditure (TDEE)."
          >
            <ImageCardPicker
              selectedValue={form.work_details}
              onChange={(val) => set("work_details", val)}
              options={[
                { value: "Desk Job", label: "Desk / Sitting Job", subtitle: "9-5 sedentary office or WFH", icon: <Briefcase /> },
                { value: "Active Job", label: "Active Job", subtitle: "On your feet for most of the day", icon: <Activity /> },
                { value: "Field Work", label: "Field Work / Physical", subtitle: "High mobility, outdoors, heavy movement", icon: <Flame /> },
                { value: "Home / Student", label: "Homemaker / Student", subtitle: "Flexible daily schedule", icon: <User /> },
              ]}
            />
          </QuestionWrapper>
        )}

        {/* STEP 11: Current Exercise Experience */}
        {step === 10 && (
          <QuestionWrapper
            title="What is your training experience level?"
            subtitle="Select your experience level with weight training."
          >
            <ImageCardPicker
              selectedValue={form.current_exercise}
              onChange={(val) => set("current_exercise", val)}
              options={[
                { value: "Beginner", label: "Beginner", subtitle: "0 - 6 months of weight training", icon: <User /> },
                { value: "Intermediate", label: "Intermediate", subtitle: "6 months - 2 years consistent training", icon: <Dumbbell /> },
                { value: "Advanced", label: "Advanced", subtitle: "2+ years lifting experience", icon: <Flame /> },
                { value: "Athlete", label: "Competitive Athlete", subtitle: "Powerlifting / Bodybuilding / Sports", icon: <Sparkles /> },
              ]}
            />
          </QuestionWrapper>
        )}

        {/* STEP 12: Workout Routine Detail */}
        {step === 11 && (
          <QuestionWrapper
            title="Describe your present or past workout routine."
            subtitle="Exercises, sets, reps, split, and total duration."
          >
            <TextAreaDark
              value={form.workout_routine}
              onChange={(val) => set("workout_routine", val)}
              placeholder="e.g. Push Pull Legs split, 4-5 days a week, 60 minutes per session..."
            />
          </QuestionWrapper>
        )}

        {/* STEP 13: Daily Steps Target */}
        {step === 12 && (
          <QuestionWrapper
            title="What is your average daily step count?"
            subtitle="Tracked on smart watch or phone pedometer."
          >
            <GoldSlider
              value={parseFloat(form.daily_steps) || 8000}
              onChange={(val) => set("daily_steps", val.toString())}
              min={2000}
              max={20000}
              step={500}
              unit="steps"
              labels={{ min: "2,000 steps", max: "20,000 steps" }}
            />
          </QuestionWrapper>
        )}

        {/* STEP 14: Cardio Preferences */}
        {step === 13 && (
          <QuestionWrapper
            title="What type of cardio do you prefer or do regularly?"
            subtitle="Tap all cardio formats you enjoy."
          >
            <ChipMultiSelect
              options={["Incline Treadmill Walk", "Outdoors Walking", "Running / Jogging", "Spin Cycling", "HIIT / Circuit", "None"]}
              selectedValues={form.cardio_details ? form.cardio_details.split(", ") : []}
              onChange={(vals) => set("cardio_details", vals.join(", "))}
            />
          </QuestionWrapper>
        )}

        {/* STEP 15: Preferred Workout Timing */}
        {step === 14 && (
          <QuestionWrapper
            title="When do you prefer to workout?"
            subtitle="Select your preferred time slot for training."
          >
            <ImageCardPicker
              selectedValue={form.preferred_workout_time}
              onChange={(val) => set("preferred_workout_time", val)}
              options={[
                { value: "Morning", label: "Morning (6 AM - 10 AM)", icon: <Sun /> },
                { value: "Afternoon", label: "Afternoon (12 PM - 3 PM)", icon: <Sun /> },
                { value: "Evening", label: "Evening (5 PM - 8 PM)", icon: <Moon /> },
                { value: "Night", label: "Night (8 PM - 11 PM)", icon: <Moon /> },
              ]}
            />
          </QuestionWrapper>
        )}

        {/* STEP 16: Injuries & Joint Health */}
        {step === 15 && (
          <QuestionWrapper
            title="Any past injuries, surgeries, or joint issues?"
            subtitle="Critical for tailoring exercise selection and avoiding pain."
          >
            <ChipMultiSelect
              options={["Knee Pain", "Shoulder Discomfort", "Lower Back", "Hip Stiffness", "Past Surgery", "None"]}
              selectedValues={form.injuries ? form.injuries.split(", ") : []}
              onChange={(vals) => set("injuries", vals.join(", "))}
            />
          </QuestionWrapper>
        )}

        {/* STEP 17: Health Issues */}
        {step === 16 && (
          <QuestionWrapper
            title="Any medical conditions or hormonal issues?"
            subtitle="Tap all that apply."
          >
            <ChipMultiSelect
              options={["PCOS / PCOD", "Thyroid (Hypo/Hyper)", "Diabetes / Prediabetes", "High Blood Pressure", "High Cholesterol", "None"]}
              selectedValues={form.health_issues ? form.health_issues.split(", ") : []}
              onChange={(vals) => set("health_issues", vals.join(", "))}
            />
          </QuestionWrapper>
        )}

        {/* STEP 18: Prescribed Medications */}
        {step === 17 && (
          <QuestionWrapper
            title="Are you taking any prescribed medications?"
            subtitle="Mention medicine names, salts, and dosages if any."
          >
            <TextAreaDark
              value={form.medications}
              onChange={(val) => set("medications", val)}
              placeholder="e.g. Metformin 500mg, Thyronorm 50mcg, None..."
            />
          </QuestionWrapper>
        )}

        {/* STEP 19: Constipation & Digestion */}
        {step === 18 && (
          <QuestionWrapper
            title="Stool frequency & constipation history?"
            subtitle="Select option best reflecting your digestive rhythm."
          >
            <ChipSingleSelect
              options={["Regular (1-2x daily)", "Mild Constipation", "Severe Constipation", "Irregular"]}
              selectedValue={form.constipation_history}
              onChange={(val) => set("constipation_history", val)}
            />
          </QuestionWrapper>
        )}

        {/* STEP 20: Habits & Addictions */}
        {step === 19 && (
          <QuestionWrapper
            title="Alcohol, Smoking, or other regular habits?"
            subtitle="Honesty ensures proper caloric & recovery planning."
          >
            <TextAreaDark
              value={form.addictions}
              onChange={(val) => set("addictions", val)}
              placeholder="e.g. Alcohol 1-2 drinks on weekends, Non-smoker..."
            />
          </QuestionWrapper>
        )}

        {/* STEP 21: Menstrual Health (For Women) */}
        {step === 20 && (
          <QuestionWrapper
            title="Menstrual Health & Cycle Details (For Women)"
            subtitle="Duration, frequency, and symptom details. Leave blank if N/A."
          >
            <div className="space-y-4">
              <TextInputDark
                value={form.menstrual_duration}
                onChange={(val) => set("menstrual_duration", val)}
                placeholder="Bleeding Duration (e.g. 4-5 days)"
              />
              <TextInputDark
                value={form.menstrual_cycle_frequency}
                onChange={(val) => set("menstrual_cycle_frequency", val)}
                placeholder="Cycle Frequency (e.g. Every 28 days)"
              />
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">Blood Loss Amount</label>
                <ChipSingleSelect
                  options={["Light", "Moderate", "Heavy", "N/A"]}
                  selectedValue={form.menstrual_blood_loss}
                  onChange={(val) => set("menstrual_blood_loss", val)}
                />
              </div>
            </div>
          </QuestionWrapper>
        )}

        {/* STEP 22: Dietary Preference */}
        {step === 21 && (
          <QuestionWrapper
            title="What is your dietary preference?"
            subtitle="Your diet plan will strictly follow this preference."
          >
            <ImageCardPicker
              selectedValue={form.dietary_preference}
              onChange={(val) => set("dietary_preference", val)}
              options={[
                { value: "Non-Veg", label: "Non-Vegetarian", subtitle: "Chicken, Mutton, Fish, Eggs", icon: <Utensils /> },
                { value: "Vegetarian", label: "Vegetarian", subtitle: "Paneer, Dal, Tofu, Milk", icon: <Apple /> },
                { value: "Eggetarian", label: "Eggetarian", subtitle: "Vegetarian + Eggs", icon: <Utensils /> },
                { value: "Vegan", label: "Vegan", subtitle: "Plant-based only", icon: <Apple /> },
              ]}
            />
          </QuestionWrapper>
        )}

        {/* STEP 23: Non-Veg Excluded Days */}
        {step === 22 && (
          <QuestionWrapper
            title="Any specific days you refrain from Non-Veg?"
            subtitle="Select religious or fast days if applicable."
          >
            <ChipMultiSelect
              options={["Monday", "Tuesday", "Thursday", "Saturday", "Navratri", "None"]}
              selectedValues={form.no_non_veg_days ? form.no_non_veg_days.split(", ") : []}
              onChange={(vals) => set("no_non_veg_days", vals.join(", "))}
            />
          </QuestionWrapper>
        )}

        {/* STEP 24: Lactose Intolerance */}
        {step === 23 && (
          <QuestionWrapper
            title="Are you lactose intolerant?"
            subtitle="Can you digest milk, curd, paneer, and whey protein easily?"
          >
            <ChipSingleSelect
              options={["No - Digest Dairy Fine", "Yes - Lactose Intolerant", "Partial Intolerance"]}
              selectedValue={form.lactose_intolerant}
              onChange={(val) => set("lactose_intolerant", val)}
            />
          </QuestionWrapper>
        )}

        {/* STEP 25: Present Meal Timings */}
        {step === 24 && (
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

        {/* STEP 26: Max Meals Manageable */}
        {step === 25 && (
          <QuestionWrapper
            title="Maximum number of meals manageable per day?"
            subtitle="Choose meal frequency fitting your daily schedule."
          >
            <ChipSingleSelect
              options={["3 Meals", "4 Meals", "5 Meals"]}
              selectedValue={form.max_meals}
              onChange={(val) => set("max_meals", val)}
            />
          </QuestionWrapper>
        )}

        {/* STEP 27: Supplements Currently Taken */}
        {step === 26 && (
          <QuestionWrapper
            title="What supplements do you currently take?"
            subtitle="Tap all supplements in your stack."
          >
            <ChipMultiSelect
              options={["Whey Protein", "Creatine Monohydrate", "Multivitamin", "Fish Oil / Omega 3", "Pre-workout", "Vitamin D3", "None"]}
              selectedValues={form.supplements ? form.supplements.split(", ") : []}
              onChange={(vals) => set("supplements", vals.join(", "))}
            />
          </QuestionWrapper>
        )}

        {/* STEP 28: Whey Protein Preference */}
        {step === 27 && (
          <QuestionWrapper
            title="Would you mind taking Whey Protein in your plan?"
            subtitle="Used as a clean protein source to hit daily targets."
          >
            <ChipSingleSelect
              options={["Yes - Happy to take Whey", "Prefer Whole Foods Only", "Need Guidance"]}
              selectedValue={form.whey_protein_preference}
              onChange={(val) => set("whey_protein_preference", val)}
            />
          </QuestionWrapper>
        )}

        {/* STEP 29: Food Allergies */}
        {step === 28 && (
          <QuestionWrapper
            title="Any food allergies or intolerances?"
            subtitle="Tap any allergies or type specific items."
          >
            <div className="space-y-4">
              <ChipMultiSelect
                options={["Dairy", "Gluten", "Eggs", "Peanuts / Tree Nuts", "Shellfish", "Soy", "None"]}
                selectedValues={form.food_allergies ? form.food_allergies.split(", ") : []}
                onChange={(vals) => set("food_allergies", vals.join(", "))}
              />
              <TextInputDark
                value={form.food_allergies}
                onChange={(val) => set("food_allergies", val)}
                placeholder="Other specific food allergies..."
              />
            </div>
          </QuestionWrapper>
        )}

        {/* STEP 30: Current Diet Log */}
        {step === 29 && (
          <QuestionWrapper
            title="Log your current diet from morning to night."
            subtitle="Describe what you typically eat in a day."
          >
            <div className="space-y-3">
              <TextAreaDark
                value={form.current_diet_breakfast}
                onChange={(val) => set("current_diet_breakfast", val)}
                placeholder="Breakfast details (e.g. 3 eggs, 2 toasts, tea)..."
                rows={2}
              />
              <TextAreaDark
                value={form.current_diet_lunch}
                onChange={(val) => set("current_diet_lunch", val)}
                placeholder="Lunch details (e.g. 2 rotis, chicken curry, salad)..."
                rows={2}
              />
              <TextAreaDark
                value={form.current_diet_dinner}
                onChange={(val) => set("current_diet_dinner", val)}
                placeholder="Dinner details (e.g. Rice, dal, paneer)..."
                rows={2}
              />
            </div>
          </QuestionWrapper>
        )}

        {/* STEP 31: Water Intake */}
        {step === 30 && (
          <QuestionWrapper
            title="What is your present daily water intake?"
            subtitle="Drag slider to select liters per day."
          >
            <GoldSlider
              value={parseFloat(form.water_intake) || 3.5}
              onChange={(val) => set("water_intake", val.toString())}
              min={1.0}
              max={6.0}
              step={0.5}
              unit="L"
              labels={{ min: "1.0 L", max: "6.0 L" }}
            />
          </QuestionWrapper>
        )}

        {/* STEP 32: Food Likes & Dislikes */}
        {step === 31 && (
          <QuestionWrapper
            title="Which foods do you LOVE & HATE eating?"
            subtitle="Coach Aman will include your favorite foods in your plan."
          >
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#FFB800] uppercase tracking-wider block mb-1">Loved Foods</label>
                <TextAreaDark
                  value={form.loved_foods}
                  onChange={(val) => set("loved_foods", val)}
                  placeholder="e.g. Chicken biryani, dark chocolate, peanut butter, eggs..."
                />
              </div>
              <div>
                <label className="text-xs font-bold text-red-400 uppercase tracking-wider block mb-1">Hated Foods</label>
                <TextAreaDark
                  value={form.hated_foods}
                  onChange={(val) => set("hated_foods", val)}
                  placeholder="e.g. Karela, lauki, broccoli..."
                />
              </div>
            </div>
          </QuestionWrapper>
        )}

        {/* STEP 33: Palate & Cheat Meal */}
        {step === 32 && (
          <QuestionWrapper
            title="Palate preference & favorite treat meal?"
            subtitle="Savory, sweet tooth, or favorite cheat meal."
          >
            <div className="space-y-4">
              <ChipSingleSelect
                options={["Savory Palate", "Sweet Tooth", "Both"]}
                selectedValue={form.palate_preference}
                onChange={(val) => set("palate_preference", val)}
              />
              <TextInputDark
                value={form.cheat_meal}
                onChange={(val) => set("cheat_meal", val)}
                placeholder="Favorite cheat meal (e.g. Pizza, Burger, Dosa)"
              />
            </div>
          </QuestionWrapper>
        )}

        {/* STEP 34: Blood Pressure Monitoring */}
        {step === 33 && (
          <QuestionWrapper
            title="Resting Blood Pressure Readings (if available)"
            subtitle="Recommended for overall health tracking."
          >
            <div className="space-y-3">
              <TextInputDark
                value={form.bp_morning}
                onChange={(val) => set("bp_morning", val)}
                placeholder="Morning BP (e.g. 120/80 mmHg)"
              />
              <TextInputDark
                value={form.bp_afternoon}
                onChange={(val) => set("bp_afternoon", val)}
                placeholder="Afternoon BP"
              />
              <TextInputDark
                value={form.bp_night}
                onChange={(val) => set("bp_night", val)}
                placeholder="Night Time BP"
              />
            </div>
          </QuestionWrapper>
        )}

        {/* STEP 35: Medical Reports Upload */}
        {step === 34 && (
          <QuestionWrapper
            title="Upload Blood Test or Medical Reports"
            subtitle="Done within the last 3 months (Optional)."
          >
            <PhotoUploadScreen
              label="UPLOAD MEDICAL REPORTS / BLOOD TESTS"
              files={form.medical_reports}
              onFilesChange={(f) => set("medical_reports", f)}
              multiple
            />
          </QuestionWrapper>
        )}

        {/* STEP 36: Weight & Measurements - Body Weight */}
        {step === 35 && (
          <QuestionWrapper
            title="Current Morning Weight (kg)"
            subtitle="Measured empty stomach after getting fresh."
          >
            <NumberStepper
              value={form.weight}
              onChange={(val) => set("weight", val)}
              min={30}
              max={250}
              step={0.1}
              unit="kg"
            />
          </QuestionWrapper>
        )}

        {/* STEP 37: Body Measurements */}
        {step === 36 && (
          <QuestionWrapper
            title="Body Circumference Measurements (inches)"
            subtitle="Measure abdomen at navel level and hips at widest point."
          >
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#FFB800] uppercase tracking-wider block mb-1">Abdomen (at navel)</label>
                <NumberStepper
                  value={form.abdomen}
                  onChange={(val) => set("abdomen", val)}
                  min={20}
                  max={70}
                  step={0.25}
                  unit="in"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#FFB800] uppercase tracking-wider block mb-1">Hips</label>
                <NumberStepper
                  value={form.hips}
                  onChange={(val) => set("hips", val)}
                  min={20}
                  max={70}
                  step={0.25}
                  unit="in"
                />
              </div>
            </div>
          </QuestionWrapper>
        )}

        {/* STEP 38: Front View Photo */}
        {step === 37 && (
          <QuestionWrapper
            title="Front View Progress Photo"
            subtitle="Empty stomach in morning. Standing straight."
          >
            <PhotoUploadScreen
              label="FRONT VIEW PHOTO"
              files={form.pic_front || form.men_pic_front ? [form.pic_front || form.men_pic_front] : []}
              onFilesChange={(f) => {
                set("pic_front", f[0] || "")
                set("men_pic_front", f[0] || "")
              }}
            />
          </QuestionWrapper>
        )}

        {/* STEP 39: Back View Photo */}
        {step === 38 && (
          <QuestionWrapper
            title="Back View Progress Photo"
            subtitle="Empty stomach in morning. Standing straight."
          >
            <PhotoUploadScreen
              label="BACK VIEW PHOTO"
              files={form.pic_back || form.men_pic_back ? [form.pic_back || form.men_pic_back] : []}
              onFilesChange={(f) => {
                set("pic_back", f[0] || "")
                set("men_pic_back", f[0] || "")
              }}
            />
          </QuestionWrapper>
        )}

        {/* STEP 40: Additional Notes & Gym Tour Upload */}
        {step === 39 && (
          <QuestionWrapper
            title="Additional notes & Gym equipment photos/videos"
            subtitle="Anything else you want Coach Aman to know!"
          >
            <div className="space-y-4">
              <TextAreaDark
                value={form.additional_notes}
                onChange={(val) => set("additional_notes", val)}
                placeholder="Write any final comments or questions for Coach Aman..."
              />
              <PhotoUploadScreen
                label="UPLOAD GYM / EQUIPMENT PHOTOS (OPTIONAL)"
                files={form.form_docs}
                onFilesChange={(f) => set("form_docs", f)}
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
        showSkip={step >= 34}
        onSkip={handleNext}
      />
    </ClientLayout>
  )
}
