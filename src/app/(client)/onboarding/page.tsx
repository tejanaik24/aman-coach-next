"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { ClientLayout } from "@/components/layout/ClientLayout"
import { useAuth } from "@/hooks/useAuth"
import { getClientProfile } from "@/lib/store"
import toast from "react-hot-toast"
import { Sparkles, Check } from "lucide-react"

import {
  FormHeader,
  ResumeDraftBanner,
  QuestionWrapper,
  ChipSingleSelect,
  NumberStepper,
  TextInputDark,
  TextAreaDark,
  PhotoUploadScreen,
  FormFooter,
} from "@/components/forms/ConversationalFormComponents"

export default function StandardOnboardingPage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<Record<string, any>>({
    q1_name: profile?.name || "",
    q2_email: user?.email || "",
    q3_address: "",
    q4_phone: "",
    q5_alt_phone: "",
    q6_dob: "1996-08-15",
    q6_age: "28",
    q7_height: "175",
    q8_goal: "",
    q9_wake_time: "06:30",
    q10_sleep_time: "22:30",
    q11_hired_coach: "",
    q12_home_equipment: "",
    q13_work_schedule: "",
    q14_exercise_history: "",
    q15_workout_routine: "",
    q16_steps_daily: "8000",
    q17_cardio_regular: "",
    q18_workout_timings: "",
    q19_injuries_pain: "",
    q20_health_issues: "",
    q21_prescribed_drugs: "",
    q22_constipation_history: "",
    q23_addictions: "",
    q24_urine_color: "",
    q25_menstrual_duration: "",
    q25_menstrual_frequency: "",
    q25_menstrual_blood_loss: "",
    q25_menstrual_days_1_4: "",
    q26_steroids_history: "",
    q27_diet_preference: "",
    q28_nonveg_fast_days: "",
    q29_lactose_intolerant: "",
    q30_meal_bf: "08:00",
    q30_meal_midday: "11:30",
    q30_meal_lunch: "14:00",
    q30_meal_eve: "17:30",
    q30_meal_dinner: "21:00",
    q31_max_meals: "4",
    q32_preworkout_meal: "",
    q33_supplements: "",
    q33_supplements_pics: [],
    q34_whey_protein: "",
    q35_food_allergies: "",
    q35_allergy_reports: [],
    q36_diet_morning: "",
    q36_diet_bf: "",
    q36_diet_midday: "",
    q36_diet_lunch: "",
    q36_diet_eve: "",
    q36_diet_dinner: "",
    q37_water_intake: "3.5",
    q38_food_love: "",
    q39_food_hate: "",
    q40_food_want: "",
    q41_seasonal_fruits: "",
    q42_palate: "",
    q43_chocolates: "",
    q44_cheat_meal: "",
    q45_overseas_links: "",
    q46_bp_morning: "120/80",
    q47_blood_tests: [],
    q48_anything_else: "",
    q49_front_pic: [],
    q50_back_pic: [],
    q51_left_pic: [],
    q52_right_pic: [],
    q53_fav_pose: [],
    q54_mandatory_pose: [],
    q55_weight: "74.5",
    q56_neck: "38",
    q57_abdomen: "85",
    q58_hips: "95",
    q59_arm: "35",
    q60_thigh: "58",
    q61_calf: "38",
    q62_lowest_weight: "",
    q62_lowest_when: "",
    q63_heaviest_weight: "",
    q63_heaviest_when: "",
    q64_gym_photos: [],
    q64_gym_link: ""
  })

  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [showResumeBanner, setShowResumeBanner] = useState(false)
  const [clientObj, setClientObj] = useState<{ id: string } | null>(null)

  const TOTAL_STEPS = 64

  const set = useCallback((key: string, val: any) => {
    setForm(prev => {
      const updated = { ...prev, [key]: val }
      try {
        if (user?.id) localStorage.setItem(`draft_standard_joining_${user.id}`, JSON.stringify(updated))
      } catch {}
      return updated
    })
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    getClientProfile(user.id).then(c => {
      if (c) {
        setClientObj({ id: c.id })
        if (c.client_type === "antenatal") {
          router.replace("/onboarding/antenatal")
        }
      }
    }).catch(() => {})
  }, [user?.id, router])

  useEffect(() => {
    if (!user?.id) return
    try {
      const saved = localStorage.getItem(`draft_standard_joining_${user.id}`)
      if (saved) setShowResumeBanner(true)
    } catch {}
  }, [user?.id])

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

  const handleSubmit = async () => {
    if (!user?.id) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/forms/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          clientId: clientObj?.id,
          formType: "standard_joining",
          formData: form
        })
      })
      if (!res.ok) throw new Error("Failed to submit")
      try { localStorage.removeItem(`draft_standard_joining_${user.id}`) } catch {}
      setDone(true)
      toast.success("Standard joining questionnaire submitted!")
    } catch {
      toast.error("Submission failed")
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <ClientLayout>
        <div className="flex flex-col items-center justify-center min-h-[85vh] text-center px-4 space-y-6">
          <div className="size-20 rounded-full bg-[#FFB800]/20 flex items-center justify-center border border-[#FFB800]/40 animate-bounce">
            <Sparkles className="size-10 text-[#FFB800]" />
          </div>
          <div>
            <span className="text-[#FFB800] font-heading font-extrabold text-2xl uppercase tracking-widest block mb-2">#TeamAKF</span>
            <h2 className="font-heading text-3xl font-extrabold text-white">WELCOME TO #TEAMAKF! 🎉</h2>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto mt-3">Coach Aman will review your details personally and build your custom plan within 24 hours.</p>
          </div>
          <button onClick={() => router.push("/home")} className="w-full max-w-xs py-4 rounded-2xl bg-[#FFB800] text-xs font-bold uppercase tracking-wider text-black">Go to Home</button>
        </div>
      </ClientLayout>
    )
  }

  return (
    <ClientLayout>
      {showResumeBanner && (
        <ResumeDraftBanner
          onResume={() => {
            try {
              const saved = localStorage.getItem(`draft_standard_joining_${user?.id}`)
              if (saved) setForm(prev => ({ ...prev, ...JSON.parse(saved) }))
            } catch {}
            setShowResumeBanner(false)
          }}
          onReset={() => {
            try { localStorage.removeItem(`draft_standard_joining_${user?.id}`) } catch {}
            setShowResumeBanner(false)
          }}
        />
      )}

      {step > 0 && <FormHeader currentStep={step - 1} totalSteps={TOTAL_STEPS} onBack={handlePrev} />}

      <div className="min-h-[85vh] pt-16 pb-24 flex flex-col justify-center px-4 max-w-xl mx-auto w-full">
        {step === 0 && (
          <div className="w-full rounded-3xl bg-[#111111]/95 border border-[#FFB800]/25 p-6 sm:p-8 space-y-6 text-center shadow-2xl backdrop-blur-xl">
            <div><span className="inline-block text-xs font-heading font-extrabold text-[#FFB800] uppercase tracking-widest bg-[#FFB800]/10 px-3 py-1 rounded-full border border-[#FFB800]/30">#TeamAKF</span></div>
            <div className="text-6xl sm:text-7xl animate-bounce pt-2">👊</div>
            <div>
              <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-white leading-tight">Welcome to #TeamAKF 👊</h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-sm mx-auto">Coach Aman reviews every answer personally to build your custom training & nutrition plan.</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#141414] border border-zinc-800 rounded-xl p-2.5 text-center"><span className="text-xs font-bold text-zinc-300 block">⏱ ~10 mins</span></div>
              <div className="bg-[#141414] border border-zinc-800 rounded-xl p-2.5 text-center"><span className="text-xs font-bold text-zinc-300 block">💾 Auto-saves</span></div>
              <div className="bg-[#141414] border border-zinc-800 rounded-xl p-2.5 text-center"><span className="text-xs font-bold text-zinc-300 block">🔄 Resume</span></div>
            </div>
            <div className="bg-[#141414] border-l-4 border-[#FFB800] border-y border-r border-zinc-800 rounded-2xl p-4 text-left">
              <p className="text-xs sm:text-sm text-zinc-300 italic">"Fill every section honestly — the more detail you give, the better your plan. No judgment here."</p>
              <p className="text-xs font-bold text-[#FFB800] text-right mt-1">— Coach Aman Khurana</p>
            </div>
            <button onClick={handleNext} className="w-full py-4 rounded-2xl bg-[#FFB800] text-sm font-extrabold uppercase tracking-wider text-black shadow-[0_0_20px_rgba(255,184,0,0.4)]">Let's Begin 💪</button>
            <p className="text-xs text-zinc-500 font-mono">64 questions • Saves automatically</p>
          </div>
        )}

        {/* Q1-Q64 Exact Questions */}
        {step === 1 && <QuestionWrapper title="Your Full Name" subtitle="As you'd like Coach Aman to address you."><TextInputDark value={form.q1_name} onChange={v => set("q1_name", v)} placeholder="e.g. Aman Khurana" /></QuestionWrapper>}
        {step === 2 && <QuestionWrapper title="Your Email ID" subtitle="For WhatsApp updates & client portal login."><TextInputDark type="email" value={form.q2_email} onChange={v => set("q2_email", v)} placeholder="email@example.com" /></QuestionWrapper>}
        {step === 3 && <QuestionWrapper title="Your Complete Residence Address" subtitle="Required for client records & GST tax invoice."><TextAreaDark value={form.q3_address} onChange={v => set("q3_address", v)} placeholder="Full address..." /></QuestionWrapper>}
        {step === 4 && <QuestionWrapper title="Your Primary Contact Number" subtitle="WhatsApp phone number for direct coach access."><TextInputDark type="tel" value={form.q4_phone} onChange={v => set("q4_phone", v)} placeholder="+91 98156 90656" /></QuestionWrapper>}
        {step === 5 && <QuestionWrapper title="Alternate Contact Number (optional)" subtitle="Secondary or family phone number."><TextInputDark type="tel" value={form.q5_alt_phone} onChange={v => set("q5_alt_phone", v)} placeholder="+91 98765 43210" /></QuestionWrapper>}
        
        {step === 6 && (
          <QuestionWrapper title="Your Age & Date of Birth" subtitle="Used to calculate metabolic rate & macro targets.">
            <div className="space-y-4">
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">DATE OF BIRTH</label><TextInputDark type="date" value={form.q6_dob} onChange={v => set("q6_dob", v)} /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">AGE (YEARS)</label><NumberStepper value={form.q6_age} onChange={v => set("q6_age", v)} min={12} max={100} unit="years" /></div>
            </div>
          </QuestionWrapper>
        )}

        {step === 7 && <QuestionWrapper title="Your Height (cm or ft-in)" subtitle="Baseline body composition metric."><TextInputDark value={form.q7_height} onChange={v => set("q7_height", v)} placeholder="e.g. 175 cm or 5'9" /></QuestionWrapper>}
        {step === 8 && <QuestionWrapper title="What is your goal?" subtitle="Aman wants a detailed answer on your ideal outcome."><TextAreaDark value={form.q8_goal} onChange={v => set("q8_goal", v)} placeholder="Describe your exact goal (fat loss, muscle gain, strength, health)..." /></QuestionWrapper>}
        {step === 9 && <QuestionWrapper title="What time do you wake up?" subtitle="Circadian timing dictates breakfast & meal scheduling."><TextInputDark type="time" value={form.q9_wake_time} onChange={v => set("q9_wake_time", v)} /></QuestionWrapper>}
        {step === 10 && <QuestionWrapper title="What time do you sleep?" subtitle="Dictates evening meal & sleep quality guidance."><TextInputDark type="time" value={form.q10_sleep_time} onChange={v => set("q10_sleep_time", v)} /></QuestionWrapper>}
        {step === 11 && <QuestionWrapper title="Have you ever hired any coach/Nutritionist before? Who & why did you leave?" subtitle="Helps Coach Aman understand what worked or failed."><TextAreaDark value={form.q11_hired_coach} onChange={v => set("q11_hired_coach", v)} placeholder="Share past coaching experience..." /></QuestionWrapper>}
        {step === 12 && <QuestionWrapper title="Do you have any equipment at home? (cycle, dumbbells etc.)" subtitle="Helps design home workout options if needed."><TextAreaDark value={form.q12_home_equipment} onChange={v => set("q12_home_equipment", v)} placeholder="List dumbbells, bands, bench, bike..." /></QuestionWrapper>}

        {step === 13 && <QuestionWrapper title="Are you working? Sitting or standing job? How many hours & timings?" subtitle="Determines non-exercise activity thermogenesis (NEAT)."><TextAreaDark value={form.q13_work_schedule} onChange={v => set("q13_work_schedule", v)} placeholder="e.g. Desk job, 9am-6pm sitting..." /></QuestionWrapper>}
        {step === 14 && <QuestionWrapper title="Do you exercise currently? What type & since how long?" subtitle="Current physical conditioning level."><TextAreaDark value={form.q14_exercise_history} onChange={v => set("q14_exercise_history", v)} placeholder="Weight training, gym, yoga, walking..." /></QuestionWrapper>}
        {step === 15 && <QuestionWrapper title="Share your exact workout routine (exercises/sets/reps/split/days/duration)" subtitle="Detailed exercise log."><TextAreaDark value={form.q15_workout_routine} onChange={v => set("q15_workout_routine", v)} rows={6} placeholder="Chest/Triceps on Mon: Bench press 4x10, Incline 3x12..." /></QuestionWrapper>}
        {step === 16 && <QuestionWrapper title="How many steps do you walk daily on average?" subtitle="Tracked on phone pedometer or smartwatch."><NumberStepper value={form.q16_steps_daily} onChange={v => set("q16_steps_daily", v)} min={0} max={30000} step={500} unit="steps" /></QuestionWrapper>}
        {step === 17 && <QuestionWrapper title="Do you do cardio regularly? How many mins/day or week & what type?" subtitle="Treadmill, outdoor walk, cycling, HIIT."><TextAreaDark value={form.q17_cardio_regular} onChange={v => set("q17_cardio_regular", v)} placeholder="30 mins treadmill walk 4x/week..." /></QuestionWrapper>}
        {step === 18 && <QuestionWrapper title="Morning or evening workouts? Tentative time? How many days per week?" subtitle="Workout scheduling."><TextAreaDark value={form.q18_workout_timings} onChange={v => set("q18_workout_timings", v)} placeholder="Evening 6-7:30 PM, 5 days per week..." /></QuestionWrapper>}

        {step === 19 && <QuestionWrapper title="Any injury, pain, stiffness, joint mobility problem or surgery history?" subtitle="Joint & tissue safety boundaries."><TextAreaDark value={form.q19_injuries_pain} onChange={v => set("q19_injuries_pain", v)} placeholder="Left knee pain on deep squats, past shoulder injury..." /></QuestionWrapper>}
        {step === 20 && <QuestionWrapper title="Any health issues or genetic disorders?" subtitle="PCOS, Thyroid, Diabetes, High BP, Cholesterol."><TextAreaDark value={form.q20_health_issues} onChange={v => set("q20_health_issues", v)} placeholder="Thyroid hypo, Prediabetes..." /></QuestionWrapper>}
        {step === 21 && <QuestionWrapper title="Are you taking any prescribed drugs/medicines? If yes, mention names." subtitle="Prescriptions & dosages."><TextAreaDark value={form.q21_prescribed_drugs} onChange={v => set("q21_prescribed_drugs", v)} placeholder="Thyronorm 50mcg morning..." /></QuestionWrapper>}
        {step === 22 && <QuestionWrapper title="Are you prone to constipation? Stool frequency per day/week?" subtitle="Gut motility assessment."><TextAreaDark value={form.q22_constipation_history} onChange={v => set("q22_constipation_history", v)} placeholder="Regular 1x daily or mild constipation..." /></QuestionWrapper>}
        {step === 23 && <QuestionWrapper title="Any addiction — drugs, alcohol, smoking? Mention frequency & amount." subtitle="Social habits & frequency."><TextAreaDark value={form.q23_addictions} onChange={v => set("q23_addictions", v)} placeholder="Social alcohol 1-2 drinks on weekends..." /></QuestionWrapper>}
        {step === 24 && <QuestionWrapper title="Your average urine colour throughout the day (except early morning)?" subtitle="Hydration baseline."><ChipSingleSelect options={["Clear", "Light Yellow", "Yellow", "Dark Yellow", "Orange"]} selectedValue={form.q24_urine_color} onChange={v => set("q24_urine_color", v)} /></QuestionWrapper>}
        
        {step === 25 && (
          <QuestionWrapper title="Menstrual Health (For Women)" subtitle="Hormonal cycle impacts fluid retention & strength.">
            <div className="space-y-4">
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">BLEEDING DURATION (DAYS)</label><TextInputDark value={form.q25_menstrual_duration} onChange={v => set("q25_menstrual_duration", v)} placeholder="e.g. 4-5 days" /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">CYCLE FREQUENCY (DAYS)</label><TextInputDark value={form.q25_menstrual_frequency} onChange={v => set("q25_menstrual_frequency", v)} placeholder="e.g. 28-30 days" /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">BLOOD LOSS AMOUNT</label><TextInputDark value={form.q25_menstrual_blood_loss} onChange={v => set("q25_menstrual_blood_loss", v)} placeholder="Light / Moderate / Heavy" /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">INITIAL 1-4 DAYS SYMPTOMS</label><TextInputDark value={form.q25_menstrual_days_1_4} onChange={v => set("q25_menstrual_days_1_4", v)} placeholder="Cramps, fatigue, bloating..." /></div>
            </div>
          </QuestionWrapper>
        )}

        {step === 26 && <QuestionWrapper title="Have you used Anabolic Steroids/SARMS/PEPTIDES? Full history." subtitle="For competitive athletes."><TextAreaDark value={form.q26_steroids_history} onChange={v => set("q26_steroids_history", v)} placeholder="Full cycle history or N/A..." /></QuestionWrapper>}

        {step === 27 && <QuestionWrapper title="Are you Vegetarian / Vegan / Non-Vegetarian / Eggetarian?" subtitle="Primary dietary pattern."><ChipSingleSelect options={["Vegetarian", "Vegan", "Non-Vegetarian", "Eggetarian"]} selectedValue={form.q27_diet_preference} onChange={v => set("q27_diet_preference", v)} /></QuestionWrapper>}
        {step === 28 && <QuestionWrapper title="Any specific days you avoid non-veg for religious reasons?" subtitle="Religious fast days."><TextInputDark value={form.q28_nonveg_fast_days} onChange={v => set("q28_nonveg_fast_days", v)} placeholder="Tuesdays, Thursdays, Navratri..." /></QuestionWrapper>}
        {step === 29 && <QuestionWrapper title="Are you lactose intolerant?" subtitle="Dairy tolerance."><ChipSingleSelect options={["Yes", "No", "Partially"]} selectedValue={form.q29_lactose_intolerant} onChange={v => set("q29_lactose_intolerant", v)} /></QuestionWrapper>}
        
        {step === 30 && (
          <QuestionWrapper title="Your present meal timings" subtitle="Structure your typical daily meal schedule.">
            <div className="space-y-3">
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">BREAKFAST</label><TextInputDark type="time" value={form.q30_meal_bf} onChange={v => set("q30_meal_bf", v)} /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">MID-DAY SNACK</label><TextInputDark type="time" value={form.q30_meal_midday} onChange={v => set("q30_meal_midday", v)} /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">LUNCH</label><TextInputDark type="time" value={form.q30_meal_lunch} onChange={v => set("q30_meal_lunch", v)} /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">EVENING SNACK</label><TextInputDark type="time" value={form.q30_meal_eve} onChange={v => set("q30_meal_eve", v)} /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">DINNER</label><TextInputDark type="time" value={form.q30_meal_dinner} onChange={v => set("q30_meal_dinner", v)} /></div>
            </div>
          </QuestionWrapper>
        )}

        {step === 31 && <QuestionWrapper title="Maximum number of meals manageable for you? (3–5)" subtitle="Meal frequency preference."><NumberStepper value={form.q31_max_meals} onChange={v => set("q31_max_meals", v)} min={3} max={5} unit="meals" /></QuestionWrapper>}
        {step === 32 && <QuestionWrapper title="Can you prepare & eat a pre-workout meal 60–90 min before workout?" subtitle="Fueling protocol."><ChipSingleSelect options={["Yes", "No", "Sometimes"]} selectedValue={form.q32_preworkout_meal} onChange={v => set("q32_preworkout_meal", v)} /></QuestionWrapper>}
        {step === 33 && (
          <QuestionWrapper title="Do you take any supplements? Mention which ones + upload photos." subtitle="Supplements stack.">
            <TextAreaDark value={form.q33_supplements} onChange={v => set("q33_supplements", v)} placeholder="Whey, Creatine, Multivitamin, Omega 3..." />
            <div className="pt-3"><PhotoUploadScreen label="UPLOAD SUPPLEMENT PHOTOS" multiple files={form.q33_supplements_pics} onFilesChange={files => set("q33_supplements_pics", files)} /></div>
          </QuestionWrapper>
        )}

        {step === 34 && <QuestionWrapper title="Would you take Whey Protein supplement?" subtitle="Protein supplementation."><ChipSingleSelect options={["Yes", "No", "Already taking"]} selectedValue={form.q34_whey_protein} onChange={v => set("q34_whey_protein", v)} /></QuestionWrapper>}
        {step === 35 && (
          <QuestionWrapper title="Any food allergies? (attach Food Intolerance Test if done)" subtitle="Allergies & intolerances.">
            <TextAreaDark value={form.q35_food_allergies} onChange={v => set("q35_food_allergies", v)} placeholder="Peanuts, Gluten, Dairy..." />
            <div className="pt-3"><PhotoUploadScreen label="UPLOAD INTOLERANCE REPORT" files={form.q35_allergy_reports} onFilesChange={files => set("q35_allergy_reports", files)} /></div>
          </QuestionWrapper>
        )}

        {step === 36 && (
          <QuestionWrapper title="Share your current daily diet from morning to night" subtitle="Describe your typical food & drink items.">
            <div className="space-y-3">
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">EARLY MORNING</label><TextAreaDark rows={2} value={form.q36_diet_morning} onChange={v => set("q36_diet_morning", v)} placeholder="Warm water, almonds..." /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">BREAKFAST</label><TextAreaDark rows={2} value={form.q36_diet_bf} onChange={v => set("q36_diet_bf", v)} placeholder="4 eggs, toast, tea..." /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">MID-DAY</label><TextAreaDark rows={2} value={form.q36_diet_midday} onChange={v => set("q36_diet_midday", v)} placeholder="Fruit, whey..." /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">LUNCH</label><TextAreaDark rows={2} value={form.q36_diet_lunch} onChange={v => set("q36_diet_lunch", v)} placeholder="Rice, chicken/paneer, dal..." /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">EVENING</label><TextAreaDark rows={2} value={form.q36_diet_eve} onChange={v => set("q36_diet_eve", v)} placeholder="Coffee, makhana..." /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">DINNER</label><TextAreaDark rows={2} value={form.q36_diet_dinner} onChange={v => set("q36_diet_dinner", v)} placeholder="Roti, sabzi, salad..." /></div>
            </div>
          </QuestionWrapper>
        )}

        {step === 37 && <QuestionWrapper title="Your present water intake?" subtitle="Daily hydration level."><NumberStepper value={form.q37_water_intake} onChange={v => set("q37_water_intake", v)} min={0.5} max={6.0} step={0.5} unit="L" /></QuestionWrapper>}
        {step === 38 && <QuestionWrapper title="Food items you LOVE to eat?" subtitle="Coach Aman will try to include these in your plan."><TextAreaDark value={form.q38_food_love} onChange={v => set("q38_food_love", v)} placeholder="Paneer, Chicken biryani, Eggs, Oats..." /></QuestionWrapper>}
        {step === 39 && <QuestionWrapper title="Food items you HATE eating?" subtitle="Foods to exclude."><TextAreaDark value={form.q39_food_hate} onChange={v => set("q39_food_hate", v)} placeholder="Broccoli, Bitter gourd..." /></QuestionWrapper>}
        {step === 40 && <QuestionWrapper title="Food items you specifically want in your plan?" subtitle="Must-have ingredients."><TextAreaDark value={form.q40_food_want} onChange={v => set("q40_food_want", v)} placeholder="Peanut butter, eggs, rice..." /></QuestionWrapper>}
        {step === 41 && <QuestionWrapper title="Seasonal fruits available in your area? Likes/dislikes?" subtitle="Fruit preferences."><TextAreaDark value={form.q41_seasonal_fruits} onChange={v => set("q41_seasonal_fruits", v)} placeholder="Apples, Bananas, Papaya, Oranges..." /></QuestionWrapper>}
        {step === 42 && <QuestionWrapper title="Savoury palate or sweet tooth?" subtitle="Flavor profile."><ChipSingleSelect options={["Savoury", "Sweet", "Both"]} selectedValue={form.q42_palate} onChange={v => set("q42_palate", v)} /></QuestionWrapper>}
        {step === 43 && <QuestionWrapper title="Do you like chocolates? Which ones specifically?" subtitle="Chocolate treats."><TextAreaDark value={form.q43_chocolates} onChange={v => set("q43_chocolates", v)} placeholder="Dark chocolate 70%..." /></QuestionWrapper>}
        {step === 44 && <QuestionWrapper title="Your favourite cheat/treat meal?" subtitle="For reward meal scheduling."><TextInputDark value={form.q44_cheat_meal} onChange={v => set("q44_cheat_meal", v)} placeholder="Pizza, Burger, Biryani..." /></QuestionWrapper>}
        {step === 45 && <QuestionWrapper title="Grocery store links, supplement store links (Overseas Clients)" subtitle="Store links for custom international grocery planning."><TextAreaDark value={form.q45_overseas_links} onChange={v => set("q45_overseas_links", v)} placeholder="MyProtein link, local supermarket link..." /></QuestionWrapper>}

        {step === 46 && (
          <QuestionWrapper title="Resting Blood Pressure" subtitle="Sit relaxed for 2 mins before checking.">
            <div className="space-y-4">
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">MORNING BP</label><TextInputDark value={form.q46_bp_morning} onChange={v => set("q46_bp_morning", v)} placeholder="120/80 mmHg" /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">AFTERNOON BP</label><TextInputDark value={form.q46_bp_afternoon || ""} onChange={v => set("q46_bp_afternoon", v)} placeholder="122/82 mmHg" /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">NIGHT BP</label><TextInputDark value={form.q46_bp_night || ""} onChange={v => set("q46_bp_night", v)} placeholder="118/78 mmHg" /></div>
            </div>
          </QuestionWrapper>
        )}

        {step === 47 && <QuestionWrapper title="Attach Blood tests, Urine Analysis, Dexa/BCA reports" subtitle="If done within 3 months."><PhotoUploadScreen label="UPLOAD MEDICAL REPORTS" multiple files={form.q47_blood_tests} onFilesChange={files => set("q47_blood_tests", files)} /></QuestionWrapper>}
        {step === 48 && <QuestionWrapper title="Anything else you want to mention?" subtitle="Additional note for Coach Aman."><TextAreaDark value={form.q48_anything_else} onChange={v => set("q48_anything_else", v)} placeholder="Write any extra notes here..." /></QuestionWrapper>}

        {step === 49 && <QuestionWrapper title="Front View Progress Photo" subtitle="Women: sports bra/shorts. Men: shirtless in shorts."><PhotoUploadScreen label="FRONT PHOTO" files={form.q49_front_pic} onFilesChange={files => set("q49_front_pic", files)} /></QuestionWrapper>}
        {step === 50 && <QuestionWrapper title="Back View Progress Photo" subtitle="Morning empty stomach."><PhotoUploadScreen label="BACK PHOTO" files={form.q50_back_pic} onFilesChange={files => set("q50_back_pic", files)} /></QuestionWrapper>}
        {step === 51 && <QuestionWrapper title="Left Side View Progress Photo" subtitle="Morning empty stomach."><PhotoUploadScreen label="LEFT SIDE PHOTO" files={form.q51_left_pic} onFilesChange={files => set("q51_left_pic", files)} /></QuestionWrapper>}
        {step === 52 && <QuestionWrapper title="Right Side View Progress Photo" subtitle="Morning empty stomach."><PhotoUploadScreen label="RIGHT SIDE PHOTO" files={form.q52_right_pic} onFilesChange={files => set("q52_right_pic", files)} /></QuestionWrapper>}
        {step === 53 && <QuestionWrapper title="Favourite Pose Photo" subtitle="Optional flex pose."><PhotoUploadScreen label="FAVOURITE POSE" files={form.q53_fav_pose} onFilesChange={files => set("q53_fav_pose", files)} /></QuestionWrapper>}
        {step === 54 && <QuestionWrapper title="Mandatory Poses (Competitive Athletes only)" subtitle="Optional athlete poses."><PhotoUploadScreen label="MANDATORY POSES" multiple files={form.q54_mandatory_pose} onFilesChange={files => set("q54_mandatory_pose", files)} /></QuestionWrapper>}

        {step === 55 && <QuestionWrapper title="Current Weight (kg)" subtitle="Empty stomach morning weight."><NumberStepper value={form.q55_weight} onChange={v => set("q55_weight", v)} min={30} max={250} step={0.1} unit="kg" /></QuestionWrapper>}
        {step === 56 && <QuestionWrapper title="Neck (cm/inches)" subtitle="Neck circumference."><NumberStepper value={form.q56_neck} onChange={v => set("q56_neck", v)} min={20} max={70} step={0.5} unit="cm" /></QuestionWrapper>}
        {step === 57 && <QuestionWrapper title="Abdomen at navel (cm/inches)" subtitle="Navel circumference."><NumberStepper value={form.q57_abdomen} onChange={v => set("q57_abdomen", v)} min={30} max={200} step={0.5} unit="cm" /></QuestionWrapper>}
        {step === 58 && <QuestionWrapper title="Hips (cm/inches)" subtitle="Widest glute circumference."><NumberStepper value={form.q58_hips} onChange={v => set("q58_hips", v)} min={30} max={200} step={0.5} unit="cm" /></QuestionWrapper>}
        {step === 59 && <QuestionWrapper title="Right Arm (cm/inches)" subtitle="Biceps circumference."><NumberStepper value={form.q59_arm} onChange={v => set("q59_arm", v)} min={15} max={70} step={0.5} unit="cm" /></QuestionWrapper>}
        {step === 60 && <QuestionWrapper title="Right Thigh (cm/inches)" subtitle="Thigh circumference."><NumberStepper value={form.q60_thigh} onChange={v => set("q60_thigh", v)} min={20} max={120} step={0.5} unit="cm" /></QuestionWrapper>}
        {step === 61 && <QuestionWrapper title="Right Calf (cm/inches)" subtitle="Calf circumference."><NumberStepper value={form.q61_calf} onChange={v => set("q61_calf", v)} min={15} max={70} step={0.5} unit="cm" /></QuestionWrapper>}

        {step === 62 && (
          <QuestionWrapper title="Lowest body weight in last 3–5 years + when?" subtitle="Historical weight low.">
            <div className="space-y-4">
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">LOWEST WEIGHT (KG)</label><TextInputDark value={form.q62_lowest_weight} onChange={v => set("q62_lowest_weight", v)} placeholder="e.g. 68 kg" /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">WHEN (MONTH/YEAR)</label><TextInputDark value={form.q62_lowest_when} onChange={v => set("q62_lowest_when", v)} placeholder="e.g. June 2023" /></div>
            </div>
          </QuestionWrapper>
        )}

        {step === 63 && (
          <QuestionWrapper title="Heaviest body weight in last 3–5 years + when?" subtitle="Historical weight high.">
            <div className="space-y-4">
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">HEAVIEST WEIGHT (KG)</label><TextInputDark value={form.q63_heaviest_weight} onChange={v => set("q63_heaviest_weight", v)} placeholder="e.g. 84 kg" /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">WHEN (MONTH/YEAR)</label><TextInputDark value={form.q63_heaviest_when} onChange={v => set("q63_heaviest_when", v)} placeholder="e.g. December 2022" /></div>
            </div>
          </QuestionWrapper>
        )}

        {step === 64 && (
          <QuestionWrapper title="Share gym video/photos or gym website link" subtitle="Helps Coach see available gym machinery.">
            <PhotoUploadScreen label="UPLOAD GYM PHOTOS" multiple files={form.q64_gym_photos} onFilesChange={files => set("q64_gym_photos", files)} />
            <div className="pt-3"><TextInputDark value={form.q64_gym_link} onChange={v => set("q64_gym_link", v)} placeholder="Or paste Gym website / Instagram link..." /></div>
          </QuestionWrapper>
        )}
      </div>

      {step > 0 && (
        <FormFooter
          onNext={handleNext}
          isLastStep={step === TOTAL_STEPS}
          submitting={submitting}
          showSkip={[5, 11, 12, 17, 21, 23, 26, 28, 35, 43, 45, 47, 48, 53, 54, 64].includes(step)}
          onSkip={handleNext}
        />
      )}
    </ClientLayout>
  )
}
