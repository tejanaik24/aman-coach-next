"use client"

import { useState } from "react"
import { ClientLayout } from "@/components/layout/ClientLayout"
import { useAuth } from "@/hooks/useAuth"
import { addCheckin } from "@/lib/store"
import toast from "react-hot-toast"
import { motion, AnimatePresence } from "motion/react"
import { Camera, Check, ChevronLeft, ChevronRight, ClipboardCheck } from "lucide-react"

const steps = ["Body Stats", "Progress Photos", "Notes"]

const energyLevels = [
  { value: 1, emoji: "😫", label: "Exhausted" },
  { value: 2, emoji: "😩", label: "Tired" },
  { value: 3, emoji: "🙂", label: "Okay" },
  { value: 4, emoji: "💪", label: "Good" },
  { value: 5, emoji: "🔥", label: "Amazing" },
]

const sleepLevels = [
  { value: 1, emoji: "😫", label: "Terrible" },
  { value: 2, emoji: "😩", label: "Poor" },
  { value: 3, emoji: "🙂", label: "Fair" },
  { value: 4, emoji: "😊", label: "Good" },
  { value: 5, emoji: "😴", label: "Great" },
]

export default function CheckinPage() {
  const { user } = useAuth()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [photos, setPhotos] = useState<Record<string, string | null>>({
    front: null,
    side: null,
    back: null,
  })
  const [form, setForm] = useState({
    weight: "",
    waist: "",
    energy: 3,
    sleep: 3,
    notes: "",
  })

  const handleNext = () => {
    if (step < steps.length - 1) setStep(step + 1)
  }

  const handlePrev = () => {
    if (step > 0) setStep(step - 1)
  }

  const handlePhotoUpload = (view: string) => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (ev) => {
          setPhotos({ ...photos, [view]: ev.target?.result as string })
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }

  const handleSubmit = async () => {
    if (!user?.uid) return
    setSubmitting(true)
    try {
      await addCheckin({
        clientId: user.uid,
        coachId: "",
        date: new Date(),
        weight: form.weight ? Number(form.weight) : undefined,
        energy: form.energy,
        sleep: form.sleep,
        notes: form.notes,
      })
      setDone(true)
    } catch {
      toast.error("Failed to submit check-in")
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
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <span className="text-6xl mb-4">🎉</span>
          <h2 className="font-heading text-2xl text-white mb-2">Check-in Submitted!</h2>
          <p className="text-sm text-zinc-400 max-w-xs">
            Your coach will review your check-in shortly. Keep up the great work!
          </p>
        </motion.div>
      </ClientLayout>
    )
  }

  return (
    <ClientLayout>
      <div className="flex items-center gap-3 mb-2">
        <ClipboardCheck className="size-6 text-purple" />
        <h1 className="font-heading text-2xl text-white">Weekly Check-in</h1>
      </div>
      <p className="text-xs text-zinc-500 mb-6">Track your progress every week</p>

      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              i <= step ? "bg-purple text-white" : "bg-zinc-800 text-zinc-500"
            }`}>
              {i < step ? <Check className="size-4" /> : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 transition-colors ${i < step ? "bg-purple" : "bg-zinc-800"}`} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          {step === 0 && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">
                  Body Stats
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
                      Current Weight
                      <span className="text-purple-light font-medium">kg</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.weight}
                      onChange={(e) => setForm({ ...form, weight: e.target.value })}
                      className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-purple focus:ring-1 focus:ring-purple/30"
                      placeholder="e.g. 75.5"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1.5 block">
                      Waist Measurement <span className="text-zinc-600">(optional)</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.waist}
                      onChange={(e) => setForm({ ...form, waist: e.target.value })}
                      className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-purple focus:ring-1 focus:ring-purple/30"
                      placeholder="cm"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Energy Level</p>
                <div className="flex gap-2">
                  {energyLevels.map((level) => (
                    <button
                      key={level.value}
                      onClick={() => setForm({ ...form, energy: level.value })}
                      className={`flex-1 flex flex-col items-center gap-1 rounded-xl p-3 transition-colors ${
                        form.energy === level.value
                          ? "bg-purple/20 border border-purple/40"
                          : "bg-zinc-800 border border-zinc-800 hover:border-zinc-600"
                      }`}
                    >
                      <span className="text-2xl">{level.emoji}</span>
                      <span className="text-[10px] text-zinc-400">{level.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Sleep Quality</p>
                <div className="flex gap-2">
                  {sleepLevels.map((level) => (
                    <button
                      key={level.value}
                      onClick={() => setForm({ ...form, sleep: level.value })}
                      className={`flex-1 flex flex-col items-center gap-1 rounded-xl p-3 transition-colors ${
                        form.sleep === level.value
                          ? "bg-purple/20 border border-purple/40"
                          : "bg-zinc-800 border border-zinc-800 hover:border-zinc-600"
                      }`}
                    >
                      <span className="text-2xl">{level.emoji}</span>
                      <span className="text-[10px] text-zinc-400">{level.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Progress Photos</p>
              <div className="space-y-3">
                {[
                  { key: "front", label: "Front" },
                  { key: "side", label: "Side" },
                  { key: "back", label: "Back" },
                ].map((view) => (
                  <button
                    key={view.key}
                    onClick={() => handlePhotoUpload(view.key)}
                    className="w-full rounded-xl border-2 border-dashed border-zinc-700 p-6 text-center hover:border-purple/40 transition-colors"
                  >
                    {photos[view.key] ? (
                      <div className="flex items-center gap-3">
                        <img
                          src={photos[view.key]!}
                          alt={view.label}
                          className="size-16 rounded-lg object-cover"
                        />
                        <div className="text-left">
                          <p className="text-sm text-white font-medium">{view.label} View</p>
                          <p className="text-xs text-green-400">Photo selected ✓</p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Camera className="size-8 text-zinc-500 mx-auto mb-2" />
                        <p className="text-sm text-zinc-400 font-medium">{view.label} View</p>
                        <p className="text-xs text-zinc-600 mt-1">Tap to upload</p>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Notes</p>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-purple focus:ring-1 focus:ring-purple/30 min-h-[120px] resize-none"
                placeholder="How was your week? Any issues, wins, or things to discuss with your coach?"
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-3 mt-6">
        {step > 0 && (
          <button
            onClick={handlePrev}
            className="flex-1 rounded-full border border-zinc-700 py-3 text-sm font-medium text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <ChevronLeft className="size-4" />
            Back
          </button>
        )}
        {step < steps.length - 1 ? (
          <button
            onClick={handleNext}
            className="flex-1 rounded-full bg-purple py-3 text-sm font-bold uppercase tracking-wider text-white hover:bg-purple-dark transition-colors flex items-center justify-center gap-2"
          >
            Next
            <ChevronRight className="size-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 rounded-full bg-purple py-3 text-sm font-bold uppercase tracking-wider text-white hover:bg-purple-dark disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? "Submitting..." : "Submit Check-in 🚀"}
          </button>
        )}
      </div>
    </ClientLayout>
  )
}
