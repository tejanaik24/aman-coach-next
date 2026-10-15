"use client"

import { useEffect, useRef, useState } from "react"
import { CheckCircle2 } from "lucide-react"
import toast from "react-hot-toast"
import { PublicPageShell } from "@/components/shared/PublicPageShell"
import PublicUploadField from "@/components/forms/PublicUploadField"
import { createClient } from "@/lib/supabase/client"

const DIET_OPTIONS = ["Vegetarian", "Vegan", "Non-Vegetarian", "Eggetarian"]
const URINE_OPTIONS = ["Clear", "Light Yellow", "Yellow", "Dark Yellow", "Orange"]
const YES_NO_SOMETIMES = ["Yes", "No", "Sometimes"]

// Required list copied from Aman's old form (app.amankhuranafitness.com/questionaire.php),
// where a question was mandatory if its label had a * or its input had the HTML "required" attribute.
const REQUIRED_TEXT = [
  "q1_name", "q2_email", "q3_address", "q4_phone", "q6_dob", "q7_height", "q8_goal",
  "q9_wake_time", "q10_sleep_time", "q12_home_equipment", "q13_work_schedule", "q14_exercise_history", "q18_workout_timings",
  "q19_injuries_pain", "q20_health_issues", "q22_constipation_history", "q23_addictions",
  "q27_diet_preference", "q29_lactose_intolerant", "q31_max_meals", "q32_preworkout_meal", "q33_supplements", "q34_whey_protein",
  "q36_diet_bf", "q36_diet_lunch", "q36_diet_dinner", "q37_water_intake",
  "q38_food_love", "q39_food_hate", "q40_food_want", "q41_seasonal_fruits",
  "q55_weight", "q57_abdomen", "q58_hips",
]

// Aman: basic front, back & sides pictures mandatory. Coach mode (filling for a client) may skip them.
const PHOTO_FIELDS = [
  { key: "q49_front_pics", label: "Front photo", min: 1, error: "Front photo is required" },
  { key: "q49_back_pics", label: "Back photo", min: 1, error: "Back photo is required" },
  { key: "q49_side_pics", label: "Side photos", min: 2, error: "Add both left and right side photos" },
]

const DRAFT_PREFIX = "ak-questionnaire-draft:"

// Helpers live outside the page component so typing never remounts the inputs.
const inputClass = "w-full bg-bg-elevated border border-border-subtle focus:border-accent-orange rounded-lg py-2.5 px-3 text-sm text-text-primary outline-none"
const labelClass = "text-text-muted text-[11px] font-medium uppercase tracking-wide"
const sectionTitleClass = "font-heading italic text-lg text-accent-orange"

function Field({ id, label, sub, error, children }: { id?: string; label: string; sub?: string; error?: string; children: React.ReactNode }) {
  return (
    <div id={id} className="space-y-1">
      <label className={labelClass}>{label}</label>
      {sub && <p className="text-text-muted/70 text-[10px]">{sub}</p>}
      {children}
      {error && <p className="text-red-500 text-[11px] font-medium">{error}</p>}
    </div>
  )
}

function ChipSelect({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-4 py-1.5 rounded-full text-xs font-medium border ${value === opt ? "bg-accent-orange text-bg-primary border-accent-orange" : "border-border-subtle text-text-muted"}`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

export default function PublicQuestionnairePage() {
  const [form, setForm] = useState<Record<string, string>>({
    q1_name: "",
    q2_email: "",
    q3_address: "",
    q4_phone: "",
    q5_alt_phone: "",
    q6_dob: "",
    q6_age: "",
    q7_height: "",
    q8_goal: "",
    q9_wake_time: "",
    q10_sleep_time: "",
    q11_hired_coach: "",
    q12_home_equipment: "",
    q13_work_schedule: "",
    q14_exercise_history: "",
    q15_workout_routine: "",
    q16_steps_daily: "",
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
    q30_meal_bf: "",
    q30_meal_midday: "",
    q30_meal_lunch: "",
    q30_meal_eve: "",
    q30_meal_dinner: "",
    q31_max_meals: "",
    q32_preworkout_meal: "",
    q33_supplements: "",
    q33_supplements_link: "",
    q34_whey_protein: "",
    q35_food_allergies: "",
    q35_allergy_reports_link: "",
    q36_diet_morning: "",
    q36_diet_bf: "",
    q36_diet_midday: "",
    q36_diet_lunch: "",
    q36_diet_eve: "",
    q36_diet_dinner: "",
    q37_water_intake: "",
    q38_food_love: "",
    q39_food_hate: "",
    q40_food_want: "",
    q41_seasonal_fruits: "",
    q42_palate: "",
    q43_chocolates: "",
    q44_cheat_meal: "",
    q45_overseas_links: "",
    q46_bp_morning: "",
    q46_bp_afternoon: "",
    q46_bp_night: "",
    q47_blood_tests_link: "",
    q48_anything_else: "",
    q49_54_progress_photos_link: "",
    q55_weight: "",
    q56_neck: "",
    q57_abdomen: "",
    q58_hips: "",
    q59_arm: "",
    q60_thigh: "",
    q61_calf: "",
    q62_lowest_weight: "",
    q62_lowest_when: "",
    q63_heaviest_weight: "",
    q63_heaviest_when: "",
    q64_gym_link: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploads, setUploads] = useState<Record<string, string[]>>({})
  const [isDone, setIsDone] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const setUpload = (key: string, paths: string[]) => {
    setUploads((u) => ({ ...u, [key]: paths }))
    setErrors((prev) => (prev[key] ? { ...prev, [key]: "" } : prev))
  }
  const [restored, setRestored] = useState(false)
  const [droppedPhotos, setDroppedPhotos] = useState(false)
  const [uploadReset, setUploadReset] = useState(0)
  const pristineForm = useRef(form)
  const draftKey = useRef(`${DRAFT_PREFIX}public`)
  const hydrated = useRef(false)
  // Coach mode: /questionnaire?client=<id> fills the form on a client's behalf and saves it on their profile.
  const [forClient, setForClient] = useState<{ id: string; name: string } | null>(null)

  // Auto-save: bring back the half-filled draft on open. Photos cannot be stored, so they are dropped.
  useEffect(() => {
    draftKey.current = DRAFT_PREFIX + (new URLSearchParams(window.location.search).get("client") || "public")
    try {
      const raw = localStorage.getItem(draftKey.current)
      const draft = raw ? JSON.parse(raw) : null
      if (draft?.form && Object.values(draft.form).some((v) => String(v ?? "").trim())) {
        setForm((f) => ({ ...f, ...draft.form }))
        setRestored(true)
        setDroppedPhotos(Boolean(draft.hadPhotos))
        // A browser reopens the page at the old scroll position, hiding the notice.
        if ("scrollRestoration" in history) history.scrollRestoration = "manual"
        requestAnimationFrame(() => window.scrollTo(0, 0))
      }
    } catch {
      // unreadable draft — start clean
    }
    hydrated.current = true
  }, [])

  // Save on every change so a closed tab or a mistaken Back button never loses answers.
  useEffect(() => {
    if (!hydrated.current || isDone) return
    try {
      localStorage.setItem(draftKey.current, JSON.stringify({ form, hadPhotos: Object.keys(uploads).length > 0 }))
    } catch {
      // storage full or blocked — the form still works, it just will not resume
    }
  }, [form, uploads, isDone])

  useEffect(() => {
    const cid = new URLSearchParams(window.location.search).get("client")
    if (!cid) return
    ;(async () => {
      const supabase = createClient()
      const { data: c } = await supabase.from("clients").select("id, user_id").eq("id", cid).maybeSingle()
      if (!c) return
      const { data: p } = await supabase.from("profiles").select("name, phone").eq("id", c.user_id).maybeSingle()
      const phone = (p?.phone ?? "").replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "")
      setForClient({ id: c.id, name: p?.name || "this client" })
      setForm((f) => ({ ...f, q1_name: f.q1_name || p?.name || "", q4_phone: f.q4_phone || phone }))
    })()
  }, [])

  function set(key: string, val: string) {
    setForm((prev) => ({ ...prev, [key]: val }))
    setErrors((prev) => (prev[key] ? { ...prev, [key]: "" } : prev))
  }

  function startFresh() {
    try {
      localStorage.removeItem(draftKey.current)
    } catch {
      // nothing to clear
    }
    setForm({ ...pristineForm.current })
    setUploads({})
    setErrors({})
    setRestored(false)
    setDroppedPhotos(false)
    setUploadReset((n) => n + 1)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const found: Record<string, string> = {}
    for (const key of REQUIRED_TEXT) if (!form[key]?.trim()) found[key] = "Required"
    // Photos need a camera and a gallery: the coach filling in for a client may skip them.
    if (!forClient) {
      for (const p of PHOTO_FIELDS) if ((uploads[p.key]?.length ?? 0) < p.min) found[p.key] = p.error
    }
    setErrors(found)
    const firstMissing = [...REQUIRED_TEXT, ...PHOTO_FIELDS.map((p) => p.key)].find((k) => found[k])
    if (firstMissing) {
      requestAnimationFrame(() => document.getElementById(`f-${firstMissing}`)?.scrollIntoView({ behavior: "smooth", block: "center" }))
      toast.error("Some required answers are missing — they are marked in red below")
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch(forClient ? `/api/coach/clients/${forClient.id}/questionnaire` : "/api/public/questionnaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.q1_name, tel: form.q4_phone, ...form, ...uploads }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Something went wrong, please try again")
        return
      }
      try {
        localStorage.removeItem(draftKey.current)
      } catch {
        // nothing to clear
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
        <CheckCircle2 className="size-14 text-accent-orange" />
        <p className="font-heading text-2xl text-text-primary">Questionnaire Submitted</p>
        <p className="text-text-muted text-sm max-w-xs">
          {forClient ? `Saved on ${forClient.name}'s profile.` : "Coach Aman will review your details and get back to you."}
        </p>
        {forClient && (
          <a href={`/clients/${forClient.id}`} className="mt-2 inline-block rounded-full bg-accent-orange px-6 py-3 text-sm font-bold text-bg-primary">Back to client</a>
        )}
      </div>
    )
  }

  return (
    <PublicPageShell eyebrow="Aman Khurana Fitness" title="Lifestyle & Health Questionnaire">
      {forClient && (
        <div className="ledger p-5 border border-accent-orange/40">
          <p className="text-text-primary text-sm">
            You are filling this form for <strong>{forClient.name}</strong>. It will be saved on their profile.
          </p>
        </div>
      )}
      {restored && (
        <div className="ledger p-4 border border-accent-orange/40 space-y-2">
          <p className="text-text-primary text-sm font-semibold">We saved your answers — continue where you left off.</p>
          {droppedPhotos && (
            <p className="text-text-muted text-xs">Photos are not saved on your phone, so please pick your front, back and side photos again before submitting.</p>
          )}
          <button type="button" onClick={startFresh} className="text-accent-orange text-xs font-semibold underline underline-offset-2">
            Start fresh
          </button>
        </div>
      )}
      <div className="ledger p-5">
        <p className="text-text-primary text-sm leading-relaxed mb-3">
          Hi, I warmly welcome you to #teamAKF. Pleased to have you in the team 😊 Please fill out the details below. After getting all the details, I shall take roughly 7 – 15 days to get back to you with your customised plans.
        </p>
        <p className="text-text-muted text-xs leading-relaxed">
          This is the same detailed questionnaire Coach Aman uses to build every client&rsquo;s custom plan &mdash;
          fill it in before your consultation so he has your full picture ready. Takes about 10&ndash;15 minutes.
          Your answers are saved on this phone as you type, so you can close this page and come back to it later.
          Questions marked with <span className="text-accent-orange font-semibold">*</span> are required.
          Answer honestly, no judgment. Where a question asks for a photo or report, just tap the
          upload button and pick it from your phone gallery, camera or files (PDF works too).
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div className="ledger p-5 space-y-4">
          <h2 className={sectionTitleClass}>About You</h2>
          <Field id="f-q1_name" label="Your Full Name*" error={errors.q1_name}><input value={form.q1_name} onChange={(e) => set("q1_name", e.target.value)} className={inputClass} /></Field>
          <Field id="f-q2_email" label="Your Email ID*" error={errors.q2_email}><input type="email" value={form.q2_email} onChange={(e) => set("q2_email", e.target.value)} className={inputClass} /></Field>
          <Field id="f-q3_address" label="Your Complete Residence Address*" error={errors.q3_address}><textarea value={form.q3_address} onChange={(e) => set("q3_address", e.target.value)} rows={2} className={`${inputClass} resize-none`} /></Field>
          <Field id="f-q4_phone" label="Your Primary Contact Number (WhatsApp)*" error={errors.q4_phone}><input value={form.q4_phone} inputMode="tel" onChange={(e) => set("q4_phone", e.target.value.replace(/[^\d+ ]/g, ""))} className={inputClass} /></Field>
          <Field label="Alternate Contact Number"><input value={form.q5_alt_phone} onChange={(e) => set("q5_alt_phone", e.target.value)} className={inputClass} /></Field>
          <Field id="f-q6_dob" label="Date of Birth*" error={errors.q6_dob}><input type="date" value={form.q6_dob} onChange={(e) => set("q6_dob", e.target.value)} className={inputClass} /></Field>
          <Field label="Age (years)"><input type="number" value={form.q6_age} onChange={(e) => set("q6_age", e.target.value)} className={inputClass} /></Field>
          <Field id="f-q7_height" label="Height (cm or ft-in)*" error={errors.q7_height}><input value={form.q7_height} onChange={(e) => set("q7_height", e.target.value)} className={inputClass} placeholder="e.g. 175 cm or 5'9" /></Field>
          <Field id="f-q8_goal" label="What is your goal?*" sub="Be detailed on your ideal outcome" error={errors.q8_goal}><textarea value={form.q8_goal} onChange={(e) => set("q8_goal", e.target.value)} rows={3} className={`${inputClass} resize-none`} /></Field>
        </div>

        <div className="ledger p-5 space-y-4">
          <h2 className={sectionTitleClass}>Daily Routine</h2>
          <Field id="f-q9_wake_time" label="What time do you wake up?*" error={errors.q9_wake_time}><input type="time" value={form.q9_wake_time} onChange={(e) => set("q9_wake_time", e.target.value)} className={inputClass} /></Field>
          <Field id="f-q10_sleep_time" label="What time do you sleep?*" error={errors.q10_sleep_time}><input type="time" value={form.q10_sleep_time} onChange={(e) => set("q10_sleep_time", e.target.value)} className={inputClass} /></Field>
          <Field label="Have you ever hired any coach/Nutritionist before? Who & why did you leave?"><textarea value={form.q11_hired_coach} onChange={(e) => set("q11_hired_coach", e.target.value)} rows={2} className={`${inputClass} resize-none`} /></Field>
          <Field id="f-q12_home_equipment" label="Do you have any equipment at home? (cycle, dumbbells etc.)*" error={errors.q12_home_equipment}><textarea value={form.q12_home_equipment} onChange={(e) => set("q12_home_equipment", e.target.value)} rows={2} className={`${inputClass} resize-none`} placeholder="Write 'None' if you have nothing" /></Field>
          <Field id="f-q13_work_schedule" label="Are you working? Sitting or standing job? How many hours & timings?*" error={errors.q13_work_schedule}><textarea value={form.q13_work_schedule} onChange={(e) => set("q13_work_schedule", e.target.value)} rows={2} className={`${inputClass} resize-none`} /></Field>
          <Field id="f-q14_exercise_history" label="Do you exercise currently? What type & since how long?*" error={errors.q14_exercise_history}><textarea value={form.q14_exercise_history} onChange={(e) => set("q14_exercise_history", e.target.value)} rows={2} className={`${inputClass} resize-none`} /></Field>
          <Field label="Share your exact workout routine (exercises/sets/reps/split/days/duration)"><textarea value={form.q15_workout_routine} onChange={(e) => set("q15_workout_routine", e.target.value)} rows={4} className={`${inputClass} resize-none`} /></Field>
          <Field label="How many steps do you walk daily on average?"><input type="number" value={form.q16_steps_daily} onChange={(e) => set("q16_steps_daily", e.target.value)} className={inputClass} /></Field>
          <Field label="Do you do cardio regularly? How many mins/day or week & what type?"><textarea value={form.q17_cardio_regular} onChange={(e) => set("q17_cardio_regular", e.target.value)} rows={2} className={`${inputClass} resize-none`} /></Field>
          <Field id="f-q18_workout_timings" label="Morning or evening workouts? Tentative time? How many days per week?*" error={errors.q18_workout_timings}><textarea value={form.q18_workout_timings} onChange={(e) => set("q18_workout_timings", e.target.value)} rows={2} className={`${inputClass} resize-none`} /></Field>
        </div>

        <div className="ledger p-5 space-y-4">
          <h2 className={sectionTitleClass}>Health History</h2>
          <Field id="f-q19_injuries_pain" label="Any injury, pain, stiffness, joint mobility problem or surgery history?*" error={errors.q19_injuries_pain}><textarea value={form.q19_injuries_pain} onChange={(e) => set("q19_injuries_pain", e.target.value)} rows={2} className={`${inputClass} resize-none`} placeholder="Write 'None' if nothing" /></Field>
          <Field id="f-q20_health_issues" label="Any health issues or genetic disorders?*" sub="PCOS, Thyroid, Diabetes, High BP, Cholesterol" error={errors.q20_health_issues}><textarea value={form.q20_health_issues} onChange={(e) => set("q20_health_issues", e.target.value)} rows={2} className={`${inputClass} resize-none`} placeholder="Write 'None' if nothing" /></Field>
          <Field label="Are you taking any prescribed drugs/medicines? If yes, mention names."><textarea value={form.q21_prescribed_drugs} onChange={(e) => set("q21_prescribed_drugs", e.target.value)} rows={2} className={`${inputClass} resize-none`} /></Field>
          <Field id="f-q22_constipation_history" label="Are you prone to constipation? Stool frequency per day/week?*" error={errors.q22_constipation_history}><textarea value={form.q22_constipation_history} onChange={(e) => set("q22_constipation_history", e.target.value)} rows={2} className={`${inputClass} resize-none`} /></Field>
          <Field id="f-q23_addictions" label="Any addiction — drugs, alcohol, smoking? Mention frequency & amount.*" error={errors.q23_addictions}><textarea value={form.q23_addictions} onChange={(e) => set("q23_addictions", e.target.value)} rows={2} className={`${inputClass} resize-none`} placeholder="Write 'None' if nothing" /></Field>
          <Field label="Your average urine colour throughout the day (except early morning)?"><ChipSelect options={URINE_OPTIONS} value={form.q24_urine_color} onChange={(v) => set("q24_urine_color", v)} /></Field>
          <Field label="Menstrual Health (For Women) — Bleeding duration (days)"><input value={form.q25_menstrual_duration} onChange={(e) => set("q25_menstrual_duration", e.target.value)} className={inputClass} placeholder="e.g. 4-5 days" /></Field>
          <Field label="Cycle frequency (days)"><input value={form.q25_menstrual_frequency} onChange={(e) => set("q25_menstrual_frequency", e.target.value)} className={inputClass} placeholder="e.g. 28-30 days" /></Field>
          <Field label="Blood loss amount"><input value={form.q25_menstrual_blood_loss} onChange={(e) => set("q25_menstrual_blood_loss", e.target.value)} className={inputClass} placeholder="Light / Moderate / Heavy" /></Field>
          <Field label="Initial 1-4 days symptoms"><input value={form.q25_menstrual_days_1_4} onChange={(e) => set("q25_menstrual_days_1_4", e.target.value)} className={inputClass} placeholder="Cramps, fatigue, bloating..." /></Field>
          <Field label="Have you used Anabolic Steroids/SARMS/PEPTIDES? Full history."><textarea value={form.q26_steroids_history} onChange={(e) => set("q26_steroids_history", e.target.value)} rows={2} className={`${inputClass} resize-none`} /></Field>
        </div>

        <div className="ledger p-5 space-y-4">
          <h2 className={sectionTitleClass}>Diet Preferences</h2>
          <Field id="f-q27_diet_preference" label="Are you Vegetarian / Vegan / Non-Vegetarian / Eggetarian?*" error={errors.q27_diet_preference}><ChipSelect options={DIET_OPTIONS} value={form.q27_diet_preference} onChange={(v) => set("q27_diet_preference", v)} /></Field>
          <Field label="Any specific days you avoid non-veg for religious reasons?"><input value={form.q28_nonveg_fast_days} onChange={(e) => set("q28_nonveg_fast_days", e.target.value)} className={inputClass} /></Field>
          <Field id="f-q29_lactose_intolerant" label="Are you lactose intolerant?*" error={errors.q29_lactose_intolerant}><ChipSelect options={["Yes", "No", "Partially"]} value={form.q29_lactose_intolerant} onChange={(v) => set("q29_lactose_intolerant", v)} /></Field>
          <Field label="Breakfast time"><input type="time" value={form.q30_meal_bf} onChange={(e) => set("q30_meal_bf", e.target.value)} className={inputClass} /></Field>
          <Field label="Mid-day snack time"><input type="time" value={form.q30_meal_midday} onChange={(e) => set("q30_meal_midday", e.target.value)} className={inputClass} /></Field>
          <Field label="Lunch time"><input type="time" value={form.q30_meal_lunch} onChange={(e) => set("q30_meal_lunch", e.target.value)} className={inputClass} /></Field>
          <Field label="Evening snack time"><input type="time" value={form.q30_meal_eve} onChange={(e) => set("q30_meal_eve", e.target.value)} className={inputClass} /></Field>
          <Field label="Dinner time"><input type="time" value={form.q30_meal_dinner} onChange={(e) => set("q30_meal_dinner", e.target.value)} className={inputClass} /></Field>
          <Field id="f-q31_max_meals" label="Maximum number of meals manageable for you? (3–5)*" error={errors.q31_max_meals}><input type="number" min={3} max={5} value={form.q31_max_meals} onChange={(e) => set("q31_max_meals", e.target.value)} className={inputClass} /></Field>
          <Field id="f-q32_preworkout_meal" label="Can you prepare & eat a pre-workout meal 60–90 min before workout?*" error={errors.q32_preworkout_meal}><ChipSelect options={YES_NO_SOMETIMES} value={form.q32_preworkout_meal} onChange={(v) => set("q32_preworkout_meal", v)} /></Field>
          <Field id="f-q33_supplements" label="Do you take any supplements? Mention which ones.*" error={errors.q33_supplements}><textarea value={form.q33_supplements} onChange={(e) => set("q33_supplements", e.target.value)} rows={2} className={`${inputClass} resize-none`} placeholder="Whey, Creatine, Multivitamin, Omega 3... Write 'None' if none" /></Field>
          <Field label="Supplement photos (optional)"><PublicUploadField multiple buttonText="Add supplement photos" onChange={(p) => setUpload("q33_supplements_pics", p)} /></Field>
          <Field id="f-q34_whey_protein" label="Would you take Whey Protein supplement?*" error={errors.q34_whey_protein}><ChipSelect options={["Yes", "No", "Already taking"]} value={form.q34_whey_protein} onChange={(v) => set("q34_whey_protein", v)} /></Field>
          <Field label="Any food allergies?"><textarea value={form.q35_food_allergies} onChange={(e) => set("q35_food_allergies", e.target.value)} rows={2} className={`${inputClass} resize-none`} placeholder="Peanuts, Gluten, Dairy..." /></Field>
          <Field label="Food intolerance test report (optional)" sub="Photo or PDF"><PublicUploadField multiple buttonText="Add report" onChange={(p) => setUpload("q35_allergy_reports", p)} /></Field>
        </div>

        <div className="ledger p-5 space-y-4">
          <h2 className={sectionTitleClass}>Current Diet</h2>
          <Field label="Early Morning"><textarea value={form.q36_diet_morning} onChange={(e) => set("q36_diet_morning", e.target.value)} rows={1} className={`${inputClass} resize-none`} placeholder="Warm water, almonds..." /></Field>
          <Field id="f-q36_diet_bf" label="Breakfast*" error={errors.q36_diet_bf}><textarea value={form.q36_diet_bf} onChange={(e) => set("q36_diet_bf", e.target.value)} rows={1} className={`${inputClass} resize-none`} placeholder="4 eggs, toast, tea..." /></Field>
          <Field label="Mid-day"><textarea value={form.q36_diet_midday} onChange={(e) => set("q36_diet_midday", e.target.value)} rows={1} className={`${inputClass} resize-none`} /></Field>
          <Field id="f-q36_diet_lunch" label="Lunch*" error={errors.q36_diet_lunch}><textarea value={form.q36_diet_lunch} onChange={(e) => set("q36_diet_lunch", e.target.value)} rows={1} className={`${inputClass} resize-none`} placeholder="Rice, chicken/paneer, dal..." /></Field>
          <Field label="Evening"><textarea value={form.q36_diet_eve} onChange={(e) => set("q36_diet_eve", e.target.value)} rows={1} className={`${inputClass} resize-none`} /></Field>
          <Field id="f-q36_diet_dinner" label="Dinner*" error={errors.q36_diet_dinner}><textarea value={form.q36_diet_dinner} onChange={(e) => set("q36_diet_dinner", e.target.value)} rows={1} className={`${inputClass} resize-none`} placeholder="Roti, sabzi, salad..." /></Field>
          <Field id="f-q37_water_intake" label="Your present water intake? (litres)*" error={errors.q37_water_intake}><input type="number" step={0.5} value={form.q37_water_intake} onChange={(e) => set("q37_water_intake", e.target.value)} className={inputClass} /></Field>
          <Field id="f-q38_food_love" label="Food items you LOVE to eat?*" error={errors.q38_food_love}><textarea value={form.q38_food_love} onChange={(e) => set("q38_food_love", e.target.value)} rows={2} className={`${inputClass} resize-none`} /></Field>
          <Field id="f-q39_food_hate" label="Food items you HATE eating?*" error={errors.q39_food_hate}><textarea value={form.q39_food_hate} onChange={(e) => set("q39_food_hate", e.target.value)} rows={2} className={`${inputClass} resize-none`} /></Field>
          <Field id="f-q40_food_want" label="Food items you specifically want in your plan?*" error={errors.q40_food_want}><textarea value={form.q40_food_want} onChange={(e) => set("q40_food_want", e.target.value)} rows={2} className={`${inputClass} resize-none`} /></Field>
          <Field id="f-q41_seasonal_fruits" label="Seasonal fruits available in your area? Likes/dislikes?*" error={errors.q41_seasonal_fruits}><textarea value={form.q41_seasonal_fruits} onChange={(e) => set("q41_seasonal_fruits", e.target.value)} rows={2} className={`${inputClass} resize-none`} /></Field>
          <Field label="Savoury palate or sweet tooth?"><ChipSelect options={["Savoury", "Sweet", "Both"]} value={form.q42_palate} onChange={(v) => set("q42_palate", v)} /></Field>
          <Field label="Do you like chocolates? Which ones specifically?"><textarea value={form.q43_chocolates} onChange={(e) => set("q43_chocolates", e.target.value)} rows={2} className={`${inputClass} resize-none`} /></Field>
          <Field label="Your favourite cheat/treat meal?"><input value={form.q44_cheat_meal} onChange={(e) => set("q44_cheat_meal", e.target.value)} className={inputClass} /></Field>
          <Field label="Grocery / supplement store links (Overseas Clients)"><textarea value={form.q45_overseas_links} onChange={(e) => set("q45_overseas_links", e.target.value)} rows={2} className={`${inputClass} resize-none`} /></Field>
        </div>

        <div className="ledger p-5 space-y-4">
          <h2 className={sectionTitleClass}>Vitals &amp; Body Metrics</h2>
          <Field label="Morning Blood Pressure"><input value={form.q46_bp_morning} onChange={(e) => set("q46_bp_morning", e.target.value)} className={inputClass} placeholder="120/80 mmHg" /></Field>
          <Field label="Afternoon Blood Pressure"><input value={form.q46_bp_afternoon} onChange={(e) => set("q46_bp_afternoon", e.target.value)} className={inputClass} /></Field>
          <Field label="Night Blood Pressure"><input value={form.q46_bp_night} onChange={(e) => set("q46_bp_night", e.target.value)} className={inputClass} /></Field>
          <Field label="Blood test / Urine Analysis / Dexa report (if done within 3 months)" sub="Photo or PDF"><PublicUploadField multiple buttonText="Add report" onChange={(p) => setUpload("q47_blood_tests", p)} /></Field>
          <Field label="Anything else you want to mention?"><textarea value={form.q48_anything_else} onChange={(e) => set("q48_anything_else", e.target.value)} rows={2} className={`${inputClass} resize-none`} /></Field>
          {PHOTO_FIELDS.map((p) => (
            <Field
              key={p.key}
              id={`f-${p.key}`}
              label={forClient ? p.label : `${p.label}*`}
              sub="Empty stomach morning, after getting fresh. Front, back and both sides."
              error={errors[p.key]}
            >
              <PublicUploadField
                key={uploadReset}
                multiple
                buttonText={`Add ${p.label.toLowerCase()}`}
                onChange={(paths) => setUpload(p.key, paths)}
              />
            </Field>
          ))}
          <Field label="Favourite pose (optional)"><PublicUploadField multiple buttonText="Add favourite pose" onChange={(p) => setUpload("q49_fav_pose", p)} /></Field>
          <Field id="f-q55_weight" label="Current Weight (kg)*" error={errors.q55_weight}><input type="number" step={0.1} value={form.q55_weight} onChange={(e) => set("q55_weight", e.target.value)} className={inputClass} /></Field>
          <Field label="Neck (cm)"><input type="number" step={0.5} value={form.q56_neck} onChange={(e) => set("q56_neck", e.target.value)} className={inputClass} /></Field>
          <Field id="f-q57_abdomen" label="Abdomen at navel (cm)*" error={errors.q57_abdomen}><input type="number" step={0.5} value={form.q57_abdomen} onChange={(e) => set("q57_abdomen", e.target.value)} className={inputClass} /></Field>
          <Field id="f-q58_hips" label="Hips (cm)*" error={errors.q58_hips}><input type="number" step={0.5} value={form.q58_hips} onChange={(e) => set("q58_hips", e.target.value)} className={inputClass} /></Field>
          <Field label="Right Arm (cm)"><input type="number" step={0.5} value={form.q59_arm} onChange={(e) => set("q59_arm", e.target.value)} className={inputClass} /></Field>
          <Field label="Right Thigh (cm)"><input type="number" step={0.5} value={form.q60_thigh} onChange={(e) => set("q60_thigh", e.target.value)} className={inputClass} /></Field>
          <Field label="Right Calf (cm)"><input type="number" step={0.5} value={form.q61_calf} onChange={(e) => set("q61_calf", e.target.value)} className={inputClass} /></Field>
          <Field label="Lowest body weight in last 3–5 years (kg)"><input value={form.q62_lowest_weight} onChange={(e) => set("q62_lowest_weight", e.target.value)} className={inputClass} /></Field>
          <Field label="When?"><input value={form.q62_lowest_when} onChange={(e) => set("q62_lowest_when", e.target.value)} className={inputClass} placeholder="e.g. June 2023" /></Field>
          <Field label="Heaviest body weight in last 3–5 years (kg)"><input value={form.q63_heaviest_weight} onChange={(e) => set("q63_heaviest_weight", e.target.value)} className={inputClass} /></Field>
          <Field label="When?"><input value={form.q63_heaviest_when} onChange={(e) => set("q63_heaviest_when", e.target.value)} className={inputClass} placeholder="e.g. December 2022" /></Field>
          <Field label="Gym photos (optional)" sub="Helps Coach see available gym machinery"><PublicUploadField multiple buttonText="Add gym photos" onChange={(p) => setUpload("q64_gym_pics", p)} /></Field>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-accent-orange text-bg-primary font-heading text-sm py-3 rounded-full disabled:opacity-60"
        >
          {isSubmitting ? "Submitting…" : "Submit Questionnaire"}
        </button>
      </form>
    </PublicPageShell>
  )
}
