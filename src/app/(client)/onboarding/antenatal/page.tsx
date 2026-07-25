"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { ClientLayout } from "@/components/layout/ClientLayout"
import { useAuth } from "@/hooks/useAuth"
import { getClientProfile } from "@/lib/store"
import toast from "react-hot-toast"
import { Sparkles, Heart } from "lucide-react"

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

export default function AntenatalOnboardingPage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<Record<string, any>>({
    q1_name: profile?.name || "",
    q2_email: user?.email || "",
    q3_phone: "",
    q4_address: "",
    q5_alt_phone: "",
    q6_dob: "1996-08-15",
    q6_age: "28",
    q7_height: "165",
    q8_gestational_weeks: "18",
    q9_lmp: "2026-03-10",
    q10_edd: "2026-12-15",
    q11_gravidity: "1",
    q12_pregnancy_type: "Singleton",
    q13_injuries_pain: "",
    q14_health_issues: "",
    q15_family_history: "",
    q16_palpitation_dizziness: "",
    q17_surgical_history: "",
    q18_prescribed_drugs: "",
    q19_constipation_history: "",
    q20_addictions: "",
    q21_urine_color: "",
    q22_sleep_quality: "",
    q23_menstrual_duration: "",
    q23_menstrual_frequency: "",
    q23_menstrual_blood_loss: "",
    q23_menstrual_days_1_4: "",
    q24_work_schedule: "",
    q25_exercise_history: "",
    q26_preconception_routine: "",
    q27_steps_daily: "6000",
    q28_cardio_regular: "",
    q29_workout_timings: "",
    q30_wake_time: "07:00",
    q30_sleep_time: "22:00",
    q31_had_coach: "",
    q32_supplements: "",
    q32_supplements_pics: [],
    q33_whey_protein: "",
    q34_food_allergies: "",
    q34_allergy_reports: [],
    q35_diet_morning: "",
    q35_diet_bf: "",
    q35_diet_midday: "",
    q35_diet_lunch: "",
    q35_diet_eve: "",
    q35_diet_dinner: "",
    q36_water_intake: "3.0",
    q37_food_love: "",
    q38_food_hate: "",
    q39_nausea_foods: "",
    q40_food_want: "",
    q41_seasonal_fruits: "",
    q42_palate: "",
    q43_chocolates: "",
    q44_cheat_meal: "",
    q45_diet_preference: "Vegetarian",
    q46_nonveg_fast_days: "",
    q47_lactose_intolerant: "",
    q48_meal_bf: "08:30",
    q48_meal_midday: "11:30",
    q48_meal_lunch: "14:00",
    q48_meal_eve: "17:30",
    q48_meal_dinner: "20:30",
    q49_overseas_links: "",
    q50_bp_morning: "115/75",
    q50_bp_afternoon: "118/76",
    q50_bp_night: "112/72",
    q51_glucose_fasting: "85 mg/dL",
    q51_glucose_bf: "",
    q51_glucose_lunch: "",
    q51_glucose_eve: "",
    q51_glucose_dinner: "",
    q52_medical_reports: [],
    q53_resting_bpm: "72",
    q54_front_pic: [],
    q55_back_pic: [],
    q56_left_pic: [],
    q57_right_pic: [],
    q58_preconception_pics: [],
    q59_weight: "65.0",
    q60_abdomen: "84",
    q61_waist_pelvic: "88",
    q62_hips: "96",
    q63_preconception_weight: "58.0",
    q64_preconception_weight_duration: "",
    q65_heaviest_weight: "68.0",
    q66_weight_start_trimester1: "59.0",
    q67_weight_end_trimester1: "62.0",
    q68_equipment_photos: [],
    q69_additional_notes: ""
  })

  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [showResumeBanner, setShowResumeBanner] = useState(false)
  const [clientObj, setClientObj] = useState<{ id: string } | null>(null)

  const TOTAL_STEPS = 69

  const set = useCallback((key: string, val: any) => {
    setForm(prev => {
      const updated = { ...prev, [key]: val }
      try {
        if (user?.id) localStorage.setItem(`draft_antenatal_joining_${user.id}`, JSON.stringify(updated))
      } catch {}
      return updated
    })
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    getClientProfile(user.id).then(c => {
      if (c) setClientObj({ id: c.id })
    }).catch(() => {})
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    try {
      const saved = localStorage.getItem(`draft_antenatal_joining_${user.id}`)
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
          formType: "antenatal_joining",
          formData: form
        })
      })
      if (!res.ok) throw new Error("Failed to submit")
      try { localStorage.removeItem(`draft_antenatal_joining_${user.id}`) } catch {}
      setDone(true)
      toast.success("Antenatal questionnaire submitted!")
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
            <Heart className="size-10 text-[#FFB800]" />
          </div>
          <div>
            <span className="text-[#FFB800] font-heading font-extrabold text-2xl uppercase tracking-widest block mb-2">AN-PN #TeamAKF</span>
            <h2 className="font-heading text-3xl font-extrabold text-white">QUESTIONNAIRE SUBMITTED! 🌸</h2>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto mt-3">Pleased to have you in #teamAKF 😊 Coach Aman will review your pregnancy details personally within 24 hours.</p>
          </div>
          <button onClick={() => router.push("/home")} className="w-full max-w-xs py-4 rounded-2xl bg-[#FFB800] text-xs font-bold uppercase tracking-wider text-black font-bold">Go to Home</button>
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
              const saved = localStorage.getItem(`draft_antenatal_joining_${user?.id}`)
              if (saved) setForm(prev => ({ ...prev, ...JSON.parse(saved) }))
            } catch {}
            setShowResumeBanner(false)
          }}
          onReset={() => {
            try { localStorage.removeItem(`draft_antenatal_joining_${user?.id}`) } catch {}
            setShowResumeBanner(false)
          }}
        />
      )}

      {step > 0 && <FormHeader currentStep={step - 1} totalSteps={TOTAL_STEPS} onBack={handlePrev} />}

      <div className="min-h-[85vh] pt-16 pb-24 flex flex-col justify-center px-4 max-w-xl mx-auto w-full">
        {step === 0 && (
          <div className="w-full rounded-3xl bg-[#111111]/95 border border-[#FFB800]/25 p-6 sm:p-8 space-y-6 text-center shadow-2xl backdrop-blur-xl">
            <div><span className="inline-block text-xs font-heading font-extrabold text-[#FFB800] uppercase tracking-widest bg-[#FFB800]/10 px-3 py-1 rounded-full border border-[#FFB800]/30">AN-PN #TeamAKF</span></div>
            <div className="text-6xl sm:text-7xl animate-bounce pt-2">🤱</div>
            <div>
              <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-white leading-tight">Welcome, Mama 🌸</h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-sm mx-auto">Your safety and your baby's health come first. Coach Aman personally reviews every answer.</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#141414] border border-zinc-800 rounded-xl p-2.5 text-center"><span className="text-xs font-bold text-zinc-300 block">⏱ ~10 mins</span></div>
              <div className="bg-[#141414] border border-zinc-800 rounded-xl p-2.5 text-center"><span className="text-xs font-bold text-zinc-300 block">🔒 Confidential</span></div>
              <div className="bg-[#141414] border border-zinc-800 rounded-xl p-2.5 text-center"><span className="text-xs font-bold text-zinc-300 block">💛 No judgment</span></div>
            </div>
            <div className="bg-[#141414] border-l-4 border-[#FFB800] border-y border-r border-zinc-800 rounded-2xl p-4 text-left">
              <p className="text-xs sm:text-sm text-zinc-300 italic">"Every pregnancy is unique. Be as detailed as possible — this helps me build the safest plan for you and your baby."</p>
              <p className="text-xs font-bold text-[#FFB800] text-right mt-1">— Coach Aman Khurana</p>
            </div>
            <button onClick={handleNext} className="w-full py-4 rounded-2xl bg-[#FFB800] text-sm font-extrabold uppercase tracking-wider text-black shadow-[0_0_20px_rgba(255,184,0,0.4)]">Start My Journey 🌸</button>
            <p className="text-xs text-zinc-500 font-mono">69 questions • Saves automatically</p>
          </div>
        )}

        {/* Q1-Q69 Exact AN-PN Questions */}
        {step === 1 && <QuestionWrapper title="Full Name" subtitle="Antenatal & Postnatal Specialized Coaching."><TextInputDark value={form.q1_name} onChange={v => set("q1_name", v)} placeholder="e.g. Ananya Sharma" /></QuestionWrapper>}
        {step === 2 && <QuestionWrapper title="Email ID" subtitle="For WhatsApp updates & client portal login."><TextInputDark type="email" value={form.q2_email} onChange={v => set("q2_email", v)} placeholder="email@example.com" /></QuestionWrapper>}
        {step === 3 && <QuestionWrapper title="Contact Number" subtitle="Primary WhatsApp phone number."><TextInputDark type="tel" value={form.q3_phone} onChange={v => set("q3_phone", v)} placeholder="+91 98765 43210" /></QuestionWrapper>}
        {step === 4 && <QuestionWrapper title="Address" subtitle="Residence address for client record."><TextAreaDark value={form.q4_address} onChange={v => set("q4_address", v)} placeholder="Residence address..." /></QuestionWrapper>}
        {step === 5 && <QuestionWrapper title="Alternate Contact Number" subtitle="Secondary contact number."><TextInputDark type="tel" value={form.q5_alt_phone} onChange={v => set("q5_alt_phone", v)} placeholder="+91 98156 90656" /></QuestionWrapper>}

        {step === 6 && (
          <QuestionWrapper title="Age & Date of Birth" subtitle="Age and DOB baseline metrics.">
            <div className="space-y-4">
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">DATE OF BIRTH</label><TextInputDark type="date" value={form.q6_dob} onChange={v => set("q6_dob", v)} /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">AGE (YEARS)</label><NumberStepper value={form.q6_age} onChange={v => set("q6_age", v)} min={16} max={60} unit="years" /></div>
            </div>
          </QuestionWrapper>
        )}

        {step === 7 && <QuestionWrapper title="Height" subtitle="Baseline height metric."><TextInputDark value={form.q7_height} onChange={v => set("q7_height", v)} placeholder="e.g. 165 cm or 5'5" /></QuestionWrapper>}
        {step === 8 && <QuestionWrapper title="Gestational Age (how many weeks pregnant?)" subtitle="Current gestational age for trimester exercise alignment."><NumberStepper value={form.q8_gestational_weeks} onChange={v => set("q8_gestational_weeks", v)} min={1} max={42} unit="weeks" /></QuestionWrapper>}
        {step === 9 && <QuestionWrapper title="LMP (Last Menstrual Period)" subtitle="Date of last menstrual period."><TextInputDark type="date" value={form.q9_lmp} onChange={v => set("q9_lmp", v)} /></QuestionWrapper>}
        {step === 10 && <QuestionWrapper title="EDD (Expected Date of Delivery)" subtitle="Expected date of delivery."><TextInputDark type="date" value={form.q10_edd} onChange={v => set("q10_edd", v)} /></QuestionWrapper>}
        {step === 11 && <QuestionWrapper title="Number of Pregnancies (Gravidity)" subtitle="Total number of pregnancies including present."><NumberStepper value={form.q11_gravidity} onChange={v => set("q11_gravidity", v)} min={1} max={10} /></QuestionWrapper>}
        {step === 12 && <QuestionWrapper title="Type of Pregnancy" subtitle="Single vs twin pregnancy."><ChipSingleSelect options={["Singleton", "Twin", "Other/Not sure"]} selectedValue={form.q12_pregnancy_type} onChange={v => set("q12_pregnancy_type", v)} /></QuestionWrapper>}

        {step === 13 && <QuestionWrapper title="Any injury, pain, stiffness, tightness or joint mobility problem? Surgery history?" subtitle="Helps tailor pelvic floor stability & gentle mobility."><TextAreaDark value={form.q13_injuries_pain} onChange={v => set("q13_injuries_pain", v)} placeholder="Pelvic girdle pain, lower back tightness..." /></QuestionWrapper>}
        {step === 14 && <QuestionWrapper title="Any health issues or genetic disorders? Present or past?" subtitle="Gestational diabetes, thyroid, high/low BP."><TextAreaDark value={form.q14_health_issues} onChange={v => set("q14_health_issues", v)} placeholder="Thyroid hypo, gestational diabetes..." /></QuestionWrapper>}
        {step === 15 && <QuestionWrapper title="Family history of diabetes, thyroid, hypertension or hypotension?" subtitle="Hereditary medical history."><TextAreaDark value={form.q15_family_history} onChange={v => set("q15_family_history", v)} placeholder="Maternal diabetes or BP history..." /></QuestionWrapper>}
        {step === 16 && <QuestionWrapper title="Any signs of sudden palpitation, dizziness, heaviness in head or shortness of breath?" subtitle="Cardiovascular symptoms."><ChipSingleSelect options={["Yes", "No", "Sometimes"]} selectedValue={form.q16_palpitation_dizziness} onChange={v => set("q16_palpitation_dizziness", v)} /></QuestionWrapper>}
        {step === 17 && <QuestionWrapper title="Any surgical history?" subtitle="Past surgeries or C-section history."><TextAreaDark value={form.q17_surgical_history} onChange={v => set("q17_surgical_history", v)} placeholder="Past C-section or abdominal surgery..." /></QuestionWrapper>}
        {step === 18 && <QuestionWrapper title="Are you taking any prescribed drugs/medicines? Names/salts?" subtitle="Prenatal vitamins, folic acid, iron, calcium, progesterone."><TextAreaDark value={form.q18_prescribed_drugs} onChange={v => set("q18_prescribed_drugs", v)} placeholder="Folic acid 5mg, Iron, Calcium..." /></QuestionWrapper>}
        {step === 19 && <QuestionWrapper title="Prone to constipation? Pooping frequency per day/week?" subtitle="Hormonal shifts slow gut motility."><TextAreaDark value={form.q19_constipation_history} onChange={v => set("q19_constipation_history", v)} placeholder="Mild constipation or regular 1x daily..." /></QuestionWrapper>}
        {step === 20 && <QuestionWrapper title="Addicted to alcohol, smoking, drugs before or during pregnancy? Frequency & amount." subtitle="Lifestyle risk assessment."><TextAreaDark value={form.q20_addictions} onChange={v => set("q20_addictions", v)} placeholder="None..." /></QuestionWrapper>}
        {step === 21 && <QuestionWrapper title="Average urine colour throughout the day (except early morning)?" subtitle="Hydration status."><ChipSingleSelect options={["Clear", "Light Yellow", "Yellow", "Dark Yellow", "Orange"]} selectedValue={form.q21_urine_color} onChange={v => set("q21_urine_color", v)} /></QuestionWrapper>}
        {step === 22 && <QuestionWrapper title="Sleep hours at night & day naps? Sleep quality?" subtitle="Restful sleep supports fetal growth."><TextAreaDark value={form.q22_sleep_quality} onChange={v => set("q22_sleep_quality", v)} placeholder="8 hours night sleep + 1 hour afternoon nap..." /></QuestionWrapper>}

        {step === 23 && (
          <QuestionWrapper title="Menstrual Health (Before Conception)" subtitle="Pre-conception hormonal baseline.">
            <div className="space-y-4">
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">BLEEDING DURATION (DAYS)</label><TextInputDark value={form.q23_menstrual_duration} onChange={v => set("q23_menstrual_duration", v)} placeholder="e.g. 4-5 days" /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">CYCLE FREQUENCY (DAYS)</label><TextInputDark value={form.q23_menstrual_frequency} onChange={v => set("q23_menstrual_frequency", v)} placeholder="e.g. 28-30 days" /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">BLOOD LOSS AMOUNT</label><TextInputDark value={form.q23_menstrual_blood_loss} onChange={v => set("q23_menstrual_blood_loss", v)} placeholder="Light / Moderate / Heavy" /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">INITIAL 1-4 DAYS SYMPTOMS</label><TextInputDark value={form.q23_menstrual_days_1_4} onChange={v => set("q23_menstrual_days_1_4", v)} placeholder="Cramps, fatigue..." /></div>
            </div>
          </QuestionWrapper>
        )}

        {step === 24 && <QuestionWrapper title="Working? Sitting or standing job? Hours & timings?" subtitle="NEAT during pregnancy."><TextAreaDark value={form.q24_work_schedule} onChange={v => set("q24_work_schedule", v)} placeholder="Desk job 6 hours daily..." /></QuestionWrapper>}
        {step === 25 && <QuestionWrapper title="Do you exercise currently? What type & since when?" subtitle="Physical activity since conceiving."><TextAreaDark value={form.q25_exercise_history} onChange={v => set("q25_exercise_history", v)} placeholder="Prenatal walking, gentle stretching..." /></QuestionWrapper>}
        {step === 26 && <QuestionWrapper title="Workout routine from last 3 months BEFORE conceiving" subtitle="Pre-conception fitness conditioning."><TextAreaDark value={form.q26_preconception_routine} onChange={v => set("q26_preconception_routine", v)} placeholder="Gym lifting 4x/week..." /></QuestionWrapper>}
        {step === 27 && <QuestionWrapper title="How many steps do you walk daily (average)?" subtitle="Daily step count."><NumberStepper value={form.q27_steps_daily} onChange={v => set("q27_steps_daily", v)} min={0} max={20000} step={500} unit="steps" /></QuestionWrapper>}
        {step === 28 && <QuestionWrapper title="Cardio regularly? Mins/day or week & type?" subtitle="Safe cardio formats."><TextAreaDark value={form.q28_cardio_regular} onChange={v => set("q28_cardio_regular", v)} placeholder="Slow treadmill walk 20 mins daily..." /></QuestionWrapper>}
        {step === 29 && <QuestionWrapper title="Morning or evening workouts? Tentative time?" subtitle="Workout scheduling."><TextAreaDark value={form.q29_workout_timings} onChange={v => set("q29_workout_timings", v)} placeholder="Morning 8-9 AM..." /></QuestionWrapper>}
        
        {step === 30 && (
          <QuestionWrapper title="Wake up time / Sleep time" subtitle="Circadian rhythm.">
            <div className="space-y-4">
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">WAKE UP TIME</label><TextInputDark type="time" value={form.q30_wake_time} onChange={v => set("q30_wake_time", v)} /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">SLEEP TIME</label><TextInputDark type="time" value={form.q30_sleep_time} onChange={v => set("q30_sleep_time", v)} /></div>
            </div>
          </QuestionWrapper>
        )}

        {step === 31 && <QuestionWrapper title="Had a coach/nutritionist before?" subtitle="Past coaching."><ChipSingleSelect options={["Yes", "No"]} selectedValue={form.q31_had_coach} onChange={v => set("q31_had_coach", v)} /></QuestionWrapper>}

        {step === 32 && (
          <QuestionWrapper title="Supplements currently (or prescribed by gynecologist)? Mention + upload photos." subtitle="Prenatal supplement stack.">
            <TextAreaDark value={form.q32_supplements} onChange={v => set("q32_supplements", v)} placeholder="Folic acid, Iron, Calcium..." />
            <div className="pt-3"><PhotoUploadScreen label="UPLOAD SUPPLEMENT PHOTOS" multiple files={form.q32_supplements_pics} onFilesChange={files => set("q32_supplements_pics", files)} /></div>
          </QuestionWrapper>
        )}

        {step === 33 && <QuestionWrapper title="Would you take Whey Protein? (Natural, by-product of milk, safe during pregnancy)" subtitle="Clean protein supplementation."><ChipSingleSelect options={["Yes", "No", "Not sure/Need more info"]} selectedValue={form.q33_whey_protein} onChange={v => set("q33_whey_protein", v)} /></QuestionWrapper>}
        {step === 34 && (
          <QuestionWrapper title="Food allergies? Food Intolerance Test report?" subtitle="Allergies & intolerances.">
            <TextAreaDark value={form.q34_food_allergies} onChange={v => set("q34_food_allergies", v)} placeholder="Lactose, Gluten..." />
            <div className="pt-3"><PhotoUploadScreen label="UPLOAD ALLERGY TEST REPORT" files={form.q34_allergy_reports} onFilesChange={files => set("q34_allergy_reports", files)} /></div>
          </QuestionWrapper>
        )}

        {step === 35 && (
          <QuestionWrapper title="Current daily diet — Morning/Breakfast/Mid-day/Lunch/Evening/Dinner" subtitle="Describe your typical food items during pregnancy.">
            <div className="space-y-3">
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">EARLY MORNING</label><TextAreaDark rows={2} value={form.q35_diet_morning} onChange={v => set("q35_diet_morning", v)} placeholder="Warm water, soaked almonds..." /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">BREAKFAST</label><TextAreaDark rows={2} value={form.q35_diet_bf} onChange={v => set("q35_diet_bf", v)} placeholder="Paneer paratha / eggs..." /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">MID-DAY</label><TextAreaDark rows={2} value={form.q35_diet_midday} onChange={v => set("q35_diet_midday", v)} placeholder="Coconut water, fruit..." /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">LUNCH</label><TextAreaDark rows={2} value={form.q35_diet_lunch} onChange={v => set("q35_diet_lunch", v)} placeholder="Rice, dal, sabzi, curd..." /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">EVENING</label><TextAreaDark rows={2} value={form.q35_diet_eve} onChange={v => set("q35_diet_eve", v)} placeholder="Milk, roasted chana..." /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">DINNER</label><TextAreaDark rows={2} value={form.q35_diet_dinner} onChange={v => set("q35_diet_dinner", v)} placeholder="Roti, paneer/chicken..." /></div>
            </div>
          </QuestionWrapper>
        )}

        {step === 36 && <QuestionWrapper title="Water intake (approx. glasses/litres per day)?" subtitle="Hydration supports amniotic fluid & digestion."><NumberStepper value={form.q36_water_intake} onChange={v => set("q36_water_intake", v)} min={0.5} max={6.0} step={0.5} unit="L" /></QuestionWrapper>}
        {step === 37 && <QuestionWrapper title="Food items you LOVE?" subtitle="Favorite foods."><TextAreaDark value={form.q37_food_love} onChange={v => set("q37_food_love", v)} placeholder="Paneer, fruits, milk, khichdi..." /></QuestionWrapper>}
        {step === 38 && <QuestionWrapper title="Food items you HATE?" subtitle="Disliked foods."><TextAreaDark value={form.q38_food_hate} onChange={v => set("q38_food_hate", v)} placeholder="Broccoli, raw papaya..." /></QuestionWrapper>}
        {step === 39 && <QuestionWrapper title="Foods that make you feel more nauseated?" subtitle="Nausea triggers & aversions."><TextAreaDark value={form.q39_nausea_foods} onChange={v => set("q39_nausea_foods", v)} placeholder="Strong fried garlic smell..." /></QuestionWrapper>}
        {step === 40 && <QuestionWrapper title="Food items you specifically want in your plan?" subtitle="Must-have foods."><TextAreaDark value={form.q40_food_want} onChange={v => set("q40_food_want", v)} placeholder="Dry fruits, paneer, curd..." /></QuestionWrapper>}
        {step === 41 && <QuestionWrapper title="Seasonal fruits available? Likes/dislikes?" subtitle="Fruit preferences."><TextAreaDark value={form.q41_seasonal_fruits} onChange={v => set("q41_seasonal_fruits", v)} placeholder="Apples, pomegranate, banana..." /></QuestionWrapper>}
        {step === 42 && <QuestionWrapper title="Savoury or sweet tooth?" subtitle="Flavor profile."><ChipSingleSelect options={["Savoury", "Sweet", "Both"]} selectedValue={form.q42_palate} onChange={v => set("q42_palate", v)} /></QuestionWrapper>}
        {step === 43 && <QuestionWrapper title="Do you like chocolates?" subtitle="Chocolate cravings."><ChipSingleSelect options={["Yes", "No", "Sometimes"]} selectedValue={form.q43_chocolates} onChange={v => set("q43_chocolates", v)} /></QuestionWrapper>}
        {step === 44 && <QuestionWrapper title="Favourite cheat/treat meal?" subtitle="Reward meal during pregnancy."><TextInputDark value={form.q44_cheat_meal} onChange={v => set("q44_cheat_meal", v)} placeholder="Ice cream, pasta..." /></QuestionWrapper>}
        {step === 45 && <QuestionWrapper title="Vegetarian / Vegan / Non-Vegetarian / Eggetarian?" subtitle="Dietary pattern."><ChipSingleSelect options={["Vegetarian", "Vegan", "Non-Vegetarian", "Eggetarian"]} selectedValue={form.q45_diet_preference} onChange={v => set("q45_diet_preference", v)} /></QuestionWrapper>}
        {step === 46 && <QuestionWrapper title="Specific days you avoid non-veg for religious reasons?" subtitle="Religious fast days."><TextInputDark value={form.q46_nonveg_fast_days} onChange={v => set("q46_nonveg_fast_days", v)} placeholder="Tuesdays, Thursdays..." /></QuestionWrapper>}
        {step === 47 && <QuestionWrapper title="Lactose intolerant?" subtitle="Dairy tolerance."><ChipSingleSelect options={["Yes", "No", "Partially"]} selectedValue={form.q47_lactose_intolerant} onChange={v => set("q47_lactose_intolerant", v)} /></QuestionWrapper>}
        
        {step === 48 && (
          <QuestionWrapper title="Meal timings (Breakfast/Mid-day/Lunch/Evening/Dinner)" subtitle="Daily meal timing structure.">
            <div className="space-y-3">
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">BREAKFAST</label><TextInputDark type="time" value={form.q48_meal_bf} onChange={v => set("q48_meal_bf", v)} /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">MID-DAY SNACK</label><TextInputDark type="time" value={form.q48_meal_midday} onChange={v => set("q48_meal_midday", v)} /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">LUNCH</label><TextInputDark type="time" value={form.q48_meal_lunch} onChange={v => set("q48_meal_lunch", v)} /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">EVENING SNACK</label><TextInputDark type="time" value={form.q48_meal_eve} onChange={v => set("q48_meal_eve", v)} /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">DINNER</label><TextInputDark type="time" value={form.q48_meal_dinner} onChange={v => set("q48_meal_dinner", v)} /></div>
            </div>
          </QuestionWrapper>
        )}

        {step === 49 && <QuestionWrapper title="Grocery store links / Supplement store / Any other links" subtitle="Overseas client grocery store links."><TextAreaDark value={form.q49_overseas_links} onChange={v => set("q49_overseas_links", v)} placeholder="Store links..." /></QuestionWrapper>}

        {step === 50 && (
          <QuestionWrapper title="Resting BP — Morning / Afternoon / Night" subtitle="Sit relaxed for 2 mins before checking.">
            <div className="space-y-4">
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">MORNING BP</label><TextInputDark value={form.q50_bp_morning} onChange={v => set("q50_bp_morning", v)} placeholder="115/75 mmHg" /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">AFTERNOON BP</label><TextInputDark value={form.q50_bp_afternoon} onChange={v => set("q50_bp_afternoon", v)} placeholder="118/76 mmHg" /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">NIGHT BP</label><TextInputDark value={form.q50_bp_night} onChange={v => set("q50_bp_night", v)} placeholder="112/72 mmHg" /></div>
            </div>
          </QuestionWrapper>
        )}

        {step === 51 && (
          <QuestionWrapper title="Blood Glucose — Fasting / Post Prandial" subtitle="Glucose tracking for GDM management.">
            <div className="space-y-3">
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">FASTING GLUCOSE</label><TextInputDark value={form.q51_glucose_fasting} onChange={v => set("q51_glucose_fasting", v)} placeholder="85 mg/dL" /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">POST BREAKFAST (90-120 MINS)</label><TextInputDark value={form.q51_glucose_bf} onChange={v => set("q51_glucose_bf", v)} placeholder="110 mg/dL" /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">POST LUNCH (90-120 MINS)</label><TextInputDark value={form.q51_glucose_lunch} onChange={v => set("q51_glucose_lunch", v)} placeholder="115 mg/dL" /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">POST EVENING (90-120 MINS)</label><TextInputDark value={form.q51_glucose_eve} onChange={v => set("q51_glucose_eve", v)} placeholder="105 mg/dL" /></div>
              <div><label className="text-xs font-bold text-zinc-400 block mb-1">POST DINNER (90-120 MINS)</label><TextInputDark value={form.q51_glucose_dinner} onChange={v => set("q51_glucose_dinner", v)} placeholder="108 mg/dL" /></div>
            </div>
          </QuestionWrapper>
        )}

        {step === 52 && <QuestionWrapper title="Upload blood tests, urine analysis, scan reports" subtitle="Attach recent ultrasound scans & blood panel reports."><PhotoUploadScreen label="UPLOAD MEDICAL & ULTRASOUND REPORTS" multiple files={form.q52_medical_reports} onFilesChange={files => set("q52_medical_reports", files)} /></QuestionWrapper>}
        {step === 53 && <QuestionWrapper title="Resting Heart Rate (BPM)" subtitle="Resting BPM monitoring."><NumberStepper value={form.q53_resting_bpm} onChange={v => set("q53_resting_bpm", v)} min={40} max={120} unit="BPM" /></QuestionWrapper>}

        {step === 54 && <QuestionWrapper title="Present Front photo" subtitle="Maternity or sportswear photo."><PhotoUploadScreen label="PRESENT FRONT PHOTO" files={form.q54_front_pic} onFilesChange={files => set("q54_front_pic", files)} /></QuestionWrapper>}
        {step === 55 && <QuestionWrapper title="Present Back photo" subtitle="Back progress photo."><PhotoUploadScreen label="PRESENT BACK PHOTO" files={form.q55_back_pic} onFilesChange={files => set("q55_back_pic", files)} /></QuestionWrapper>}
        {step === 56 && <QuestionWrapper title="Present Left Side photo" subtitle="Left side photo."><PhotoUploadScreen label="PRESENT LEFT SIDE PHOTO" files={form.q56_left_pic} onFilesChange={files => set("q56_left_pic", files)} /></QuestionWrapper>}
        {step === 57 && <QuestionWrapper title="Present Right Side photo" subtitle="Right side photo."><PhotoUploadScreen label="PRESENT RIGHT SIDE PHOTO" files={form.q57_right_pic} onFilesChange={files => set("q57_right_pic", files)} /></QuestionWrapper>}
        {step === 58 && <QuestionWrapper title="Pre-conception photos (2–3 months before conceiving)" subtitle="Baseline comparison photos."><PhotoUploadScreen label="PRE-CONCEPTION PHOTOS" multiple files={form.q58_preconception_pics} onFilesChange={files => set("q58_preconception_pics", files)} /></QuestionWrapper>}

        {step === 59 && <QuestionWrapper title="Present Weight (kg)" subtitle="Empty stomach morning weight."><NumberStepper value={form.q59_weight} onChange={v => set("q59_weight", v)} min={30} max={200} step={0.1} unit="kg" /></QuestionWrapper>}
        {step === 60 && <QuestionWrapper title="Abdomen at navel (cm/inches)" subtitle="Navel level circumference."><NumberStepper value={form.q60_abdomen} onChange={v => set("q60_abdomen", v)} min={30} max={200} step={0.5} unit="cm" /></QuestionWrapper>}
        {step === 61 && <QuestionWrapper title="Waist around pelvic bone (cm/inches)" subtitle="Pelvic bone level."><NumberStepper value={form.q61_waist_pelvic} onChange={v => set("q61_waist_pelvic", v)} min={30} max={200} step={0.5} unit="cm" /></QuestionWrapper>}
        {step === 62 && <QuestionWrapper title="Hips (cm/inches)" subtitle="Widest glute circumference."><NumberStepper value={form.q62_hips} onChange={v => set("q62_hips", v)} min={30} max={200} step={0.5} unit="cm" /></QuestionWrapper>}

        {step === 63 && <QuestionWrapper title="Average weight before conceiving (kg)" subtitle="Pre-pregnancy weight baseline."><NumberStepper value={form.q63_preconception_weight} onChange={v => set("q63_preconception_weight", v)} min={30} max={200} step={0.1} unit="kg" /></QuestionWrapper>}
        {step === 64 && <QuestionWrapper title="Since how long have you maintained that weight?" subtitle="Weight stability period."><TextInputDark value={form.q64_preconception_weight_duration} onChange={v => set("q64_preconception_weight_duration", v)} placeholder="e.g. 2 years" /></QuestionWrapper>}
        {step === 65 && <QuestionWrapper title="Heaviest weight till date (kg)" subtitle="Historical weight peak."><NumberStepper value={form.q65_heaviest_weight} onChange={v => set("q65_heaviest_weight", v)} min={30} max={200} step={0.1} unit="kg" /></QuestionWrapper>}
        {step === 66 && <QuestionWrapper title="Weight at start of 1st trimester (kg)" subtitle="Trimester 1 baseline weight."><NumberStepper value={form.q66_weight_start_trimester1} onChange={v => set("q66_weight_start_trimester1", v)} min={30} max={200} step={0.1} unit="kg" /></QuestionWrapper>}
        {step === 67 && <QuestionWrapper title="Weight by end of 1st trimester (kg)" subtitle="Trimester 1 ending weight."><NumberStepper value={form.q67_weight_end_trimester1} onChange={v => set("q67_weight_end_trimester1", v)} min={30} max={200} step={0.1} unit="kg" /></QuestionWrapper>}
        
        {step === 68 && <QuestionWrapper title="Share home equipment photos/videos" subtitle="Helps Coach see home setup."><PhotoUploadScreen label="UPLOAD EQUIPMENT PHOTOS" multiple files={form.q68_equipment_photos} onFilesChange={files => set("q68_equipment_photos", files)} /></QuestionWrapper>}
        {step === 69 && <QuestionWrapper title="Anything else you want to mention?" subtitle="Special requests for Coach Aman."><TextAreaDark value={form.q69_additional_notes} onChange={v => set("q69_additional_notes", v)} placeholder="Write any extra notes here..." /></QuestionWrapper>}
      </div>

      {step > 0 && (
        <FormFooter
          onNext={handleNext}
          isLastStep={step === TOTAL_STEPS}
          submitting={submitting}
          showSkip={[4, 5, 17, 18, 20, 24, 28, 34, 46, 49, 52, 58, 68, 69].includes(step)}
          onSkip={handleNext}
        />
      )}
    </ClientLayout>
  )
}
