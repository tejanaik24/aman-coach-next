"use client"

import { useState } from "react"
import { ClientLayout } from "@/components/layout/ClientLayout"
import { Card, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/useAuth"
import { addCheckin } from "@/lib/firestore"
import toast from "react-hot-toast"

export default function CheckinPage() {
  const { user } = useAuth()
  const [form, setForm] = useState({
    weight: "",
    energy: "7",
    sleep: "7",
    hunger: "5",
    mood: "7",
    adherence: "",
    notes: "",
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.uid) return
    setSubmitting(true)
    try {
      await addCheckin({
        clientId: user.uid,
        coachId: "",
        date: new Date(),
        weight: form.weight ? Number(form.weight) : undefined,
        energy: Number(form.energy),
        sleep: Number(form.sleep),
        hunger: Number(form.hunger),
        mood: Number(form.mood),
        adherence: form.adherence ? Number(form.adherence) : undefined,
        notes: form.notes,
      })
      toast.success("Check-in submitted!")
      setForm({ weight: "", energy: "7", sleep: "7", hunger: "5", mood: "7", adherence: "", notes: "" })
    } catch {
      toast.error("Failed to submit check-in")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ClientLayout>
      <h1 className="font-heading text-3xl text-white mb-2">DAILY CHECK-IN</h1>
      <p className="text-sm text-white/40 mb-6">How did things go today?</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardTitle className="text-base">Body Stats</CardTitle>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs text-white/40 block mb-1">Weight (kg)</label>
              <Input
                type="number"
                step="0.1"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
                placeholder="e.g. 75.5"
              />
            </div>
            <div>
              <label className="text-xs text-white/40 block mb-1">Adherence (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={form.adherence}
                onChange={(e) => setForm({ ...form, adherence: e.target.value })}
                placeholder="0-100"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardTitle className="text-base">How Are You Feeling?</CardTitle>
          <CardContent className="space-y-4">
            {[
              { key: "energy", label: "Energy", min: 1, max: 10 },
              { key: "sleep", label: "Sleep", min: 1, max: 10 },
              { key: "hunger", label: "Hunger", min: 1, max: 10 },
              { key: "mood", label: "Mood", min: 1, max: 10 },
            ].map((field) => (
              <div key={field.key}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-white/40">{field.label}</label>
                  <span className="text-xs text-gold">
                    {(form as Record<string, string>)[field.key]}/{field.max}
                  </span>
                </div>
                <input
                  type="range"
                  min={field.min}
                  max={field.max}
                  value={(form as Record<string, string>)[field.key]}
                  onChange={(e) =>
                    setForm({ ...form, [field.key]: e.target.value })
                  }
                  className="w-full accent-gold"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardTitle className="text-base">Notes</CardTitle>
          <CardContent>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none transition-colors focus:border-gold focus:ring-1 focus:ring-gold/30 min-h-[80px] resize-none"
              placeholder="Any notes for your coach..."
            />
          </CardContent>
        </Card>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-gold px-6 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit Check-in"}
        </button>
      </form>
    </ClientLayout>
  )
}
