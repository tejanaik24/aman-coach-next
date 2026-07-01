"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { CheckCircle, ChevronLeft } from "lucide-react"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"
import type { Client } from "@/types"

// ─── Score selector ───────────────────────────────────────────────────────────

function ScoreSelector({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | null
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-white font-medium">{label}</p>
        {value !== null && (
          <span className="text-[#C9A84C] font-bold text-lg">{value}/10</span>
        )}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <motion.button
            key={n}
            whileTap={{ scale: 0.97 }}
            onClick={() => onChange(n)}
            className={`py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              value === n
                ? "bg-[#C9A84C] text-black"
                : "bg-[#1A1A1A] border border-[#333333] text-[#A0A0A0]"
            }`}
          >
            {n}
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// ─── Step progress dots ───────────────────────────────────────────────────────

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i === current ? "w-6 bg-[#C9A84C]" : i < current ? "w-2 bg-[#C9A84C]/40" : "w-2 bg-[#333333]"
          }`}
        />
      ))}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

interface FormData {
  weight: string
  bodyFat: string
  notes: string
  energyLevel: number | null
  sleepQuality: number | null
  adherenceWorkout: number | null
  adherenceNutrition: number | null
}

export default function ClientCheckinPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(0) // 0, 1, 2
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [form, setForm] = useState<FormData>({
    weight: "",
    bodyFat: "",
    notes: "",
    energyLevel: null,
    sleepQuality: null,
    adherenceWorkout: null,
    adherenceNutrition: null,
  })

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
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

      // Count existing check-ins to determine week number
      const { count } = await supabase
        .from("checkins")
        .select("*", { count: "exact", head: true })
        .eq("client_id", client.id)

      const weekNumber = (count ?? 0) + 1

      const { error: insertError } = await supabase.from("checkins").insert({
        client_id: client.id,
        week_number: weekNumber,
        weight: form.weight ? parseFloat(form.weight) : null,
        body_fat: form.bodyFat ? parseFloat(form.bodyFat) : null,
        notes: form.notes || null,
        energy_level: form.energyLevel,
        sleep_quality: form.sleepQuality,
        adherence_workout: form.adherenceWorkout,
        adherence_nutrition: form.adherenceNutrition,
        photos: [],
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

  // Success screen
  if (submitted) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[70vh] space-y-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="size-20 rounded-full bg-[#C9A84C]/15 flex items-center justify-center"
        >
          <CheckCircle className="size-10 text-[#C9A84C]" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <h2
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
          >
            Submitted!
          </h2>
          <p className="text-[#A0A0A0] text-sm max-w-[260px]">
            Aman will review your check-in soon and provide feedback.
          </p>
        </motion.div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          onClick={() => router.push("/home")}
          className="px-8 py-3 rounded-2xl bg-[#C9A84C] text-black font-bold text-sm"
        >
          Back to Home
        </motion.button>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          {step > 0 && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setStep((s) => s - 1)}
              className="size-9 rounded-xl bg-[#161616] border border-[#222222] flex items-center justify-center"
            >
              <ChevronLeft className="size-4 text-[#A0A0A0]" />
            </motion.button>
          )}
          <div>
            <h1
              className="text-xl font-bold text-white"
              style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
            >
              Weekly Check-in
            </h1>
            <p className="text-xs text-[#555555] mt-0.5">Step {step + 1} of 3</p>
          </div>
        </div>
        <StepDots current={step} total={3} />
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="step0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            <div className="bg-[#161616] border border-[#222222] rounded-2xl p-5 space-y-5">
              <p className="text-xs text-[#555555] uppercase tracking-widest">Body Stats</p>

              {/* Weight */}
              <div className="space-y-2">
                <label className="text-sm text-white font-medium">
                  Weight <span className="text-[#555555]">(kg)</span>
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 75.5"
                  value={form.weight}
                  onChange={(e) => set("weight", e.target.value)}
                  className="w-full bg-[#111111] border border-[#222222] rounded-xl px-4 py-3 text-white text-sm placeholder-[#555555] outline-none focus:border-[#C9A84C] transition-colors"
                />
              </div>

              {/* Body fat */}
              <div className="space-y-2">
                <label className="text-sm text-white font-medium">
                  Body Fat <span className="text-[#555555]">(%) — optional</span>
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 18"
                  value={form.bodyFat}
                  onChange={(e) => set("bodyFat", e.target.value)}
                  className="w-full bg-[#111111] border border-[#222222] rounded-xl px-4 py-3 text-white text-sm placeholder-[#555555] outline-none focus:border-[#C9A84C] transition-colors"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm text-white font-medium">
                  Notes <span className="text-[#555555]">— optional</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="How's it going? Any challenges this week?"
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  className="w-full bg-[#111111] border border-[#222222] rounded-xl px-4 py-3 text-white text-sm placeholder-[#555555] outline-none focus:border-[#C9A84C] transition-colors resize-none"
                />
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setStep(1)}
              className="w-full py-4 rounded-2xl bg-[#C9A84C] text-black font-bold text-sm"
            >
              Next — Wellness
            </motion.button>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            <div className="bg-[#161616] border border-[#222222] rounded-2xl p-5 space-y-6">
              <p className="text-xs text-[#555555] uppercase tracking-widest">Wellness Scores</p>
              <ScoreSelector
                label="Energy Level"
                value={form.energyLevel}
                onChange={(v) => set("energyLevel", v)}
              />
              <div className="border-t border-[#222222]" />
              <ScoreSelector
                label="Sleep Quality"
                value={form.sleepQuality}
                onChange={(v) => set("sleepQuality", v)}
              />
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setStep(2)}
              disabled={form.energyLevel === null || form.sleepQuality === null}
              className="w-full py-4 rounded-2xl bg-[#C9A84C] text-black font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next — Adherence
            </motion.button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            <div className="bg-[#161616] border border-[#222222] rounded-2xl p-5 space-y-6">
              <p className="text-xs text-[#555555] uppercase tracking-widest">Adherence</p>
              <ScoreSelector
                label="Workout Adherence"
                value={form.adherenceWorkout}
                onChange={(v) => set("adherenceWorkout", v)}
              />
              <div className="border-t border-[#222222]" />
              <ScoreSelector
                label="Nutrition Adherence"
                value={form.adherenceNutrition}
                onChange={(v) => set("adherenceNutrition", v)}
              />
            </div>

            {/* Summary */}
            <div className="bg-[#111111] border border-[#222222] rounded-2xl p-4 space-y-2">
              <p className="text-xs text-[#555555] uppercase tracking-widest mb-3">Summary</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {form.weight && (
                  <div className="flex justify-between col-span-2">
                    <span className="text-[#A0A0A0]">Weight</span>
                    <span className="text-white font-medium">{form.weight} kg</span>
                  </div>
                )}
                {form.energyLevel !== null && (
                  <div className="flex justify-between">
                    <span className="text-[#A0A0A0]">Energy</span>
                    <span className="text-[#C9A84C] font-medium">{form.energyLevel}/10</span>
                  </div>
                )}
                {form.sleepQuality !== null && (
                  <div className="flex justify-between">
                    <span className="text-[#A0A0A0]">Sleep</span>
                    <span className="text-[#3b82f6] font-medium">{form.sleepQuality}/10</span>
                  </div>
                )}
                {form.adherenceWorkout !== null && (
                  <div className="flex justify-between">
                    <span className="text-[#A0A0A0]">Workout</span>
                    <span className="text-[#C9A84C] font-medium">{form.adherenceWorkout}/10</span>
                  </div>
                )}
                {form.adherenceNutrition !== null && (
                  <div className="flex justify-between">
                    <span className="text-[#A0A0A0]">Nutrition</span>
                    <span className="text-[#f97316] font-medium">{form.adherenceNutrition}/10</span>
                  </div>
                )}
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                form.adherenceWorkout === null ||
                form.adherenceNutrition === null
              }
              className="w-full py-4 rounded-2xl bg-[#C9A84C] text-black font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="size-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit Check-in"
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
