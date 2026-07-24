"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { Camera, ChevronRight, ArrowLeft, CheckCircle2 } from "lucide-react"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"
import type { Client, CheckinFormData } from "@/types"

const PHOTO_SLOTS = [
  { id: "front_url", label: "Front Pose" },
  { id: "back_url", label: "Back Pose" },
  { id: "left_url", label: "Left Side" },
  { id: "right_url", label: "Right Side" },
  { id: "favourite_url", label: "Favourite Pose" },
  { id: "mandatory_url", label: "Mandatory" },
] as const

const DIET_OPTIONS = [
  "100% On Track (No deviations)",
  "90% On Track (1-2 cheat bites)",
  "70% On Track (1 full cheat meal)",
  "Below 50% (Major deviations)",
]

const URINE_OPTIONS = [
  "Pale Straw (Well Hydrated)",
  "Bright Yellow (Moderate)",
  "Dark Amber (Dehydrated)",
]

function dietDeviationToScore(v: string): number {
  if (v.startsWith("100%")) return 10
  if (v.startsWith("90%")) return 9
  if (v.startsWith("70%")) return 7
  return 4
}

export default function ClientCheckinPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [photosMarked, setPhotosMarked] = useState<Record<string, boolean>>({})

  const [energyWorkout, setEnergyWorkout] = useState(3)
  const [daysWorkedOut, setDaysWorkedOut] = useState<number | "">("")
  const [workoutDeviation, setWorkoutDeviation] = useState("")
  const [exerciseIssues, setExerciseIssues] = useState("")
  const [cardioAchieved, setCardioAchieved] = useState("")
  const [injuryPain, setInjuryPain] = useState("")

  const [dietDeviation, setDietDeviation] = useState(DIET_OPTIONS[1])
  const [appetite, setAppetite] = useState("")
  const [digestion, setDigestion] = useState("")
  const [constipation, setConstipation] = useState("")
  const [dietChangesWanted, setDietChangesWanted] = useState("")
  const [foodAddRemove, setFoodAddRemove] = useState("")

  const [energyDay, setEnergyDay] = useState(3)
  const [sleepQuality, setSleepQuality] = useState("")
  const [waterIntake, setWaterIntake] = useState<number | "">("")
  const [urineColour, setUrineColour] = useState(URINE_OPTIONS[0])
  const [coachingFeedback, setCoachingFeedback] = useState("")
  const [otherNotes, setOtherNotes] = useState("")

  const [weight, setWeight] = useState<number | "">("")
  const [abdomen, setAbdomen] = useState<number | "">("")
  const [hips, setHips] = useState<number | "">("")

  function togglePhoto(id: string) {
    setPhotosMarked((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  async function handleSubmit() {
    setIsSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error("Not logged in"); return }

      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id)
        .single()
      if (clientError || !clientData) { toast.error("Client record not found"); return }
      const client = clientData as Client

      const { count } = await supabase
        .from("checkins")
        .select("*", { count: "exact", head: true })
        .eq("client_id", client.id)
      const weekNumber = (count ?? 0) + 1

      // Block duplicate submission same week
      const { data: existingCheckin } = await supabase
        .from("checkins")
        .select("id")
        .eq("client_id", client.id)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .single()
      if (existingCheckin) {
        const lastSubmitted = new Date(existingCheckin.submitted_at)
        const now = new Date()
        const daysSinceLast = (now.getTime() - lastSubmitted.getTime()) / (1000 * 60 * 60 * 24)
        if (daysSinceLast < 5) {
          toast.error("You can submit a check-in once every 5 days")
          return
        }
      }

      const formData: CheckinFormData = {
        training: {
          energy_workout: energyWorkout,
          days_worked_out: daysWorkedOut === "" ? null : daysWorkedOut,
          workout_deviation: workoutDeviation,
          exercise_issues: exerciseIssues,
          cardio_achieved: cardioAchieved,
          injury_pain: injuryPain,
        },
        diet: {
          diet_deviation: dietDeviation,
          appetite,
          digestion,
          constipation,
          diet_changes_wanted: dietChangesWanted,
          food_add_remove: foodAddRemove,
        },
        general: {
          energy_day: energyDay,
          sleep_quality: sleepQuality,
          water_intake: waterIntake === "" ? null : waterIntake,
          urine_colour: urineColour,
          coaching_feedback: coachingFeedback,
          other_notes: otherNotes,
        },
        measurements: {
          weight: weight === "" ? null : weight,
          abdomen: abdomen === "" ? null : abdomen,
          hips: hips === "" ? null : hips,
        },
        photos: {
          front_url: null,
          back_url: null,
          left_url: null,
          right_url: null,
          favourite_url: null,
          mandatory_url: null,
        },
      }

      const { error: insertError } = await supabase.from("checkins").insert({
        client_id: client.id,
        week_number: weekNumber,
        weight: formData.measurements.weight,
        energy_level: energyDay,
        sleep_quality: null,
        adherence_workout: Math.min(energyWorkout * 2, 10),
        adherence_nutrition: dietDeviationToScore(dietDeviation),
        notes: otherNotes || null,
        photos: [],
        form_data: formData,
      })

      if (insertError) {
        toast.error("Failed to submit check-in")
        return
      }

      setSubmitted(true)
    } catch {
      toast.error("Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="px-5 flex flex-col items-center justify-center min-h-[70vh] space-y-6 text-center bg-cream">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="size-20 rounded-full bg-lime-tint flex items-center justify-center"
        >
          <CheckCircle2 className="size-10 text-charcoal-deep" />
        </motion.div>
        <div className="space-y-2">
          <h2 className="font-montserrat font-black text-2xl text-charcoal-deep">Submitted!</h2>
          <p className="text-charcoal-muted text-sm max-w-[260px]">
            Aman will review your check-in soon and provide feedback.
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push("/home")}
          className="px-8 py-3.5 rounded-full bg-lime-electric text-charcoal-deep font-montserrat font-black text-xs uppercase tracking-widest shadow-bento"
        >
          Back to Home
        </motion.button>
      </div>
    )
  }

  return (
    <div className="px-5 pt-2 flex flex-col gap-6 pb-28 bg-cream min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold text-lime-electric bg-charcoal-deep px-3 py-1.5 rounded-full uppercase tracking-wider">
            Step {step} of 2
          </span>
          <h2 className="font-montserrat font-black text-xl text-charcoal-deep mt-3 tracking-tight">
            Weekly Check-in
          </h2>
        </div>
        <span className="text-xs font-bold text-charcoal-muted uppercase">
          {step === 1 ? "Training & Diet" : "Bio & Photos"}
        </span>
      </div>

      <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
        <motion.div
          className="bg-lime-electric h-full rounded-full"
          initial={{ width: "50%" }}
          animate={{ width: step === 1 ? "50%" : "100%" }}
          transition={{ type: "spring", stiffness: 100 }}
        />
      </div>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div
            key="step-1"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Section: TRAINING */}
            <div className="space-y-4">
              <h3 className="font-montserrat font-black text-xs text-charcoal-deep uppercase tracking-widest border-b border-charcoal-deep/10 pb-1.5">
                Section 1: Training
              </h3>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-charcoal-deep uppercase tracking-wide">
                  Energy Level during Workouts (1-5)
                </label>
                <div className="flex justify-between bg-white rounded-input p-2 shadow-bento">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setEnergyWorkout(lvl)}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs transition-all ${
                        energyWorkout === lvl ? "bg-lime-electric text-charcoal-deep font-extrabold shadow" : "bg-cream text-charcoal-deep"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-charcoal-deep uppercase tracking-wide">
                  Days Worked Out this week
                </label>
                <input
                  type="number"
                  value={daysWorkedOut}
                  onChange={(e) => setDaysWorkedOut(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full bg-cream focus:bg-white border-2 border-transparent focus:border-lime-electric rounded-input px-4 py-3 text-xs font-semibold text-charcoal-deep shadow-inner transition-all outline-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-charcoal-deep uppercase tracking-wide">
                  Workout Deviations or Missed Sessions
                </label>
                <textarea
                  rows={3}
                  value={workoutDeviation}
                  onChange={(e) => setWorkoutDeviation(e.target.value)}
                  className="w-full bg-cream focus:bg-white border-2 border-transparent focus:border-lime-electric rounded-input px-4 py-3 text-xs font-semibold text-charcoal-deep shadow-inner transition-all outline-none resize-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-charcoal-deep uppercase tracking-wide">
                  Exercise Issues or Technical Blockers
                </label>
                <textarea
                  rows={2}
                  value={exerciseIssues}
                  onChange={(e) => setExerciseIssues(e.target.value)}
                  className="w-full bg-cream focus:bg-white border-2 border-transparent focus:border-lime-electric rounded-input px-4 py-3 text-xs font-semibold text-charcoal-deep shadow-inner transition-all outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-charcoal-deep uppercase tracking-wider">Cardio Achieved</label>
                  <input
                    type="text"
                    value={cardioAchieved}
                    onChange={(e) => setCardioAchieved(e.target.value)}
                    className="w-full bg-cream border border-transparent focus:border-lime-electric rounded-input px-3.5 py-2.5 text-xs font-semibold shadow-inner outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-charcoal-deep uppercase tracking-wider">Injury / Pain</label>
                  <input
                    type="text"
                    value={injuryPain}
                    onChange={(e) => setInjuryPain(e.target.value)}
                    className="w-full bg-cream border border-transparent focus:border-lime-electric rounded-input px-3.5 py-2.5 text-xs font-semibold shadow-inner outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section: DIET */}
            <div className="space-y-4">
              <h3 className="font-montserrat font-black text-xs text-charcoal-deep uppercase tracking-widest border-b border-charcoal-deep/10 pb-1.5">
                Section 2: Diet & Appetite
              </h3>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-charcoal-deep uppercase tracking-wide">
                  Diet Adherence Level
                </label>
                <select
                  value={dietDeviation}
                  onChange={(e) => setDietDeviation(e.target.value)}
                  className="w-full bg-cream border-2 border-transparent focus:border-lime-electric rounded-input px-4 py-3 text-xs font-semibold text-charcoal-deep shadow-inner outline-none transition-all"
                >
                  {DIET_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-charcoal-deep uppercase tracking-wider">Appetite</label>
                  <input
                    type="text"
                    value={appetite}
                    onChange={(e) => setAppetite(e.target.value)}
                    className="w-full bg-cream border border-transparent focus:border-lime-electric rounded-input px-3.5 py-2.5 text-xs font-semibold shadow-inner outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-charcoal-deep uppercase tracking-wider">Digestion</label>
                  <input
                    type="text"
                    value={digestion}
                    onChange={(e) => setDigestion(e.target.value)}
                    className="w-full bg-cream border border-transparent focus:border-lime-electric rounded-input px-3.5 py-2.5 text-xs font-semibold shadow-inner outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-charcoal-deep uppercase tracking-wider">Constipation</label>
                  <input
                    type="text"
                    value={constipation}
                    onChange={(e) => setConstipation(e.target.value)}
                    className="w-full bg-cream border border-transparent focus:border-lime-electric rounded-input px-3.5 py-2.5 text-xs font-semibold shadow-inner outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-charcoal-deep uppercase tracking-wider">Food Add/Remove</label>
                  <input
                    type="text"
                    value={foodAddRemove}
                    onChange={(e) => setFoodAddRemove(e.target.value)}
                    className="w-full bg-cream border border-transparent focus:border-lime-electric rounded-input px-3.5 py-2.5 text-xs font-semibold shadow-inner outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-charcoal-deep uppercase tracking-wide">Diet Changes Wanted</label>
                <textarea
                  rows={2}
                  value={dietChangesWanted}
                  onChange={(e) => setDietChangesWanted(e.target.value)}
                  className="w-full bg-cream focus:bg-white border-2 border-transparent focus:border-lime-electric rounded-input px-4 py-3 text-xs font-semibold text-charcoal-deep shadow-inner transition-all outline-none resize-none"
                />
              </div>
            </div>

            {/* Sticky footer */}
            <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-4 bg-white/90 backdrop-blur-md border-t border-cream flex justify-between items-center z-30">
              <span className="text-xs text-charcoal-muted font-bold">1 of 2</span>
              <motion.button
                type="button"
                onClick={() => setStep(2)}
                whileTap={{ scale: 0.97 }}
                className="bg-lime-electric text-charcoal-deep font-montserrat font-black text-xs uppercase tracking-widest py-3.5 px-6 rounded-full shadow-lg flex items-center gap-1 cursor-pointer"
              >
                Next Section
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="step-2"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Section: GENERAL */}
            <div className="space-y-4">
              <h3 className="font-montserrat font-black text-xs text-charcoal-deep uppercase tracking-widest border-b border-charcoal-deep/10 pb-1.5">
                Section 3: Bio-feedback
              </h3>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-charcoal-deep uppercase tracking-wide">
                  Energy Level Today (1-5)
                </label>
                <div className="flex justify-between bg-white rounded-input p-2 shadow-bento">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setEnergyDay(lvl)}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs transition-all ${
                        energyDay === lvl ? "bg-lime-electric text-charcoal-deep font-extrabold shadow" : "bg-cream text-charcoal-deep"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-charcoal-deep uppercase tracking-wider">Sleep Quality</label>
                  <input
                    type="text"
                    value={sleepQuality}
                    onChange={(e) => setSleepQuality(e.target.value)}
                    className="w-full bg-cream border border-transparent focus:border-lime-electric rounded-input px-3.5 py-2.5 text-xs font-semibold shadow-inner outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-charcoal-deep uppercase tracking-wider">Water Intake (L)</label>
                  <input
                    type="number"
                    value={waterIntake}
                    onChange={(e) => setWaterIntake(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-cream border border-transparent focus:border-lime-electric rounded-input px-3.5 py-2.5 text-xs font-semibold shadow-inner outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-charcoal-deep uppercase tracking-wide">Urine Colour Status</label>
                <select
                  value={urineColour}
                  onChange={(e) => setUrineColour(e.target.value)}
                  className="w-full bg-cream border-2 border-transparent focus:border-lime-electric rounded-input px-4 py-3 text-xs font-semibold text-charcoal-deep shadow-inner outline-none"
                >
                  {URINE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-charcoal-deep uppercase tracking-wide">Notes for Coach</label>
                <textarea
                  rows={2}
                  value={otherNotes}
                  onChange={(e) => setOtherNotes(e.target.value)}
                  className="w-full bg-cream focus:bg-white border-2 border-transparent focus:border-lime-electric rounded-input px-4 py-3 text-xs font-semibold text-charcoal-deep shadow-inner transition-all outline-none resize-none"
                />
              </div>
            </div>

            {/* Section: MEASUREMENTS */}
            <div className="space-y-4">
              <h3 className="font-montserrat font-black text-xs text-charcoal-deep uppercase tracking-widest border-b border-charcoal-deep/10 pb-1.5">
                Section 4: Measurements
              </h3>
              <div className="grid grid-cols-3 gap-2.5 select-none">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-charcoal-muted uppercase">Weight (kg)</span>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-cream focus:bg-white border-2 border-transparent focus:border-lime-electric rounded-input py-2 px-3 text-xs font-montserrat font-bold text-charcoal-deep shadow-inner outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-charcoal-muted uppercase">Abdomen (cm)</span>
                  <input
                    type="number"
                    value={abdomen}
                    onChange={(e) => setAbdomen(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-cream focus:bg-white border-2 border-transparent focus:border-lime-electric rounded-input py-2 px-3 text-xs font-montserrat font-bold text-charcoal-deep shadow-inner outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-charcoal-muted uppercase">Hips (cm)</span>
                  <input
                    type="number"
                    value={hips}
                    onChange={(e) => setHips(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-cream focus:bg-white border-2 border-transparent focus:border-lime-electric rounded-input py-2 px-3 text-xs font-montserrat font-bold text-charcoal-deep shadow-inner outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section: PHOTOS (visual toggle only — upload not built yet) */}
            <div className="space-y-4">
              <h3 className="font-montserrat font-black text-xs text-charcoal-deep uppercase tracking-widest border-b border-charcoal-deep/10 pb-1.5">
                Section 5: Check-in Photos
              </h3>
              <p className="text-[10px] text-charcoal-muted -mt-2">Photo upload coming soon — mark as ready for now.</p>

              <div className="grid grid-cols-3 gap-3 select-none">
                {PHOTO_SLOTS.map((photo) => {
                  const isMarked = !!photosMarked[photo.id]
                  return (
                    <motion.div
                      key={photo.id}
                      onClick={() => togglePhoto(photo.id)}
                      whileTap={{ scale: 0.95 }}
                      className={`aspect-square border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                        isMarked ? "border-lime-electric bg-lime-tint text-charcoal-deep" : "border-neutral-300 bg-white text-neutral-400"
                      }`}
                    >
                      {isMarked ? (
                        <CheckCircle2 className="w-5 h-5 text-lime-electric fill-charcoal-deep" />
                      ) : (
                        <Camera className="w-5 h-5" />
                      )}
                      <span className="text-[9px] font-bold uppercase text-center px-1">{photo.label}</span>
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* Sticky footer */}
            <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-4 bg-white/90 backdrop-blur-md border-t border-cream flex justify-between items-center z-30">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-charcoal-muted font-bold flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <motion.button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                whileTap={{ scale: 0.97 }}
                className="bg-lime-electric text-charcoal-deep font-montserrat font-black text-xs uppercase tracking-widest py-3.5 px-6 rounded-full shadow-lg cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <span className="size-4 rounded-full border-2 border-charcoal-deep/30 border-t-charcoal-deep animate-spin" />
                ) : (
                  "Submit Check-in"
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
