"use client"

import { useState, useEffect, useCallback } from "react"
import { CoachLayout } from "@/components/layout/CoachLayout"
import { PageSkeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/useAuth"
import { getCoachAvailability, setCoachAvailability } from "@/lib/store"
import { CoachAvailabilitySlot } from "@/types"
import { motion, AnimatePresence } from "motion/react"
import { Clock, Plus, Trash2, Save, Loader2, Check, Sun, X } from "lucide-react"
import toast from "react-hot-toast"

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const TIME_OPTIONS: string[] = []
for (let h = 6; h <= 22; h++) {
  TIME_OPTIONS.push(`${h.toString().padStart(2, "0")}:00`)
}

export default function CoachAvailabilityPage() {
  const { user } = useAuth()
  const [slots, setSlots] = useState<CoachAvailabilitySlot[]>([])
  const [editingSlots, setEditingSlots] = useState<Record<number, { startTime: string; endTime: string }[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showEditor, setShowEditor] = useState(false)

  const loadSlots = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const data = await getCoachAvailability(user.id)
      setSlots(data)
      const map: Record<number, { startTime: string; endTime: string }[]> = {}
      for (let d = 0; d < 7; d++) map[d] = []
      data.forEach((s) => {
        map[s.dayOfWeek].push({ startTime: s.startTime, endTime: s.endTime })
      })
      setEditingSlots(map)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { loadSlots() }, [loadSlots])

  const addSlot = (day: number) => {
    setEditingSlots((prev) => ({
      ...prev,
      [day]: [...prev[day], { startTime: "09:00", endTime: "10:00" }],
    }))
  }

  const updateSlot = (day: number, index: number, field: "startTime" | "endTime", value: string) => {
    setEditingSlots((prev) => {
      const updated = [...prev[day]]
      updated[index] = { ...updated[index], [field]: value }
      if (field === "startTime") {
        const startH = parseInt(value.split(":")[0])
        const endH = startH + 1
        updated[index].endTime = `${endH.toString().padStart(2, "0")}:00`
      }
      return { ...prev, [day]: updated }
    })
  }

  const removeSlot = (day: number, index: number) => {
    setEditingSlots((prev) => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index),
    }))
  }

  const handleSave = async () => {
    if (!user?.id) return
    setSaving(true)
    try {
      const allSlots: { dayOfWeek: number; startTime: string; endTime: string }[] = []
      for (let d = 0; d < 7; d++) {
        editingSlots[d].forEach((s) => {
          allSlots.push({ dayOfWeek: d, startTime: s.startTime, endTime: s.endTime })
        })
      }
      await setCoachAvailability(allSlots, user.id)
      toast.success("Availability saved!")
      setShowEditor(false)
      await loadSlots()
    } catch {
      toast.error("Failed to save availability")
    } finally {
      setSaving(false)
    }
  }

  const hasSlots = slots.length > 0

  if (loading) return <CoachLayout><PageSkeleton /></CoachLayout>

  return (
    <CoachLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-3xl text-white">Availability</h1>
            <p className="text-sm text-zinc-500 mt-1">Set your weekly coaching hours</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowEditor(true)}
            className="flex items-center gap-1.5 rounded-full bg-[#FFB800] px-4 py-2 text-xs font-medium text-white"
          >
            <Clock className="size-3.5" />
            Edit Hours
          </motion.button>
        </div>

        {hasSlots ? (
          <div className="space-y-2">
            <AnimatePresence>
              {slots
                .reduce<{ day: number; times: string[] }[]>((acc, s) => {
                  const existing = acc.find((a) => a.day === s.dayOfWeek)
                  if (existing) existing.times.push(`${s.startTime}—${s.endTime}`)
                  else acc.push({ day: s.dayOfWeek, times: [`${s.startTime}—${s.endTime}`] })
                  return acc
                }, [])
                .sort((a, b) => a.day - b.day)
                .map((group, i) => (
                  <motion.div
                    key={group.day}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-white">{DAY_NAMES[group.day]}</p>
                      <span className="text-xs text-zinc-500">{group.times.length} slot{group.times.length > 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {group.times.map((t) => (
                        <span key={t} className="text-xs bg-[#FFB800]/10 text-[#FFD200] px-2.5 py-1 rounded-full">
                          {t}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-12 text-center">
            <Sun className="size-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500 mb-1">No availability set</p>
            <p className="text-xs text-zinc-600 mb-4">Set your weekly hours so clients can book sessions</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowEditor(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#FFB800] px-4 py-2 text-xs font-medium text-white"
            >
              <Plus className="size-3.5" />
              Set Availability
            </motion.button>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showEditor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center"
            onClick={() => setShowEditor(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-t-3xl bg-zinc-900 border border-zinc-800 p-6 sm:rounded-2xl sm:m-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-lg text-white">Weekly Availability</h2>
                <button onClick={() => setShowEditor(false)} className="size-8 rounded-full bg-zinc-800 flex items-center justify-center">
                  <X className="size-4 text-zinc-400" />
                </button>
              </div>

              <div className="space-y-4 mb-6 max-h-[50vh] overflow-y-auto pr-1">
                {DAY_NAMES.map((dayName, dayIndex) => {
                  const daySlots = editingSlots[dayIndex] || []
                  return (
                    <div key={dayIndex} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-white">{dayName}</p>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => addSlot(dayIndex)}
                          className="size-7 rounded-full bg-zinc-800 flex items-center justify-center"
                        >
                          <Plus className="size-3.5 text-[#FFD200]" />
                        </motion.button>
                      </div>
                      {daySlots.length === 0 ? (
                        <p className="text-xs text-zinc-600">No hours — clients can&apos;t book</p>
                      ) : (
                        <div className="space-y-2">
                          {daySlots.map((slot, slotIndex) => (
                            <div key={slotIndex} className="flex items-center gap-2">
                              <select
                                value={slot.startTime}
                                onChange={(e) => updateSlot(dayIndex, slotIndex, "startTime", e.target.value)}
                                className="flex-1 rounded-lg bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-xs text-white"
                              >
                                {TIME_OPTIONS.map((t) => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                              <span className="text-xs text-zinc-500">to</span>
                              <select
                                value={slot.endTime}
                                onChange={(e) => updateSlot(dayIndex, slotIndex, "endTime", e.target.value)}
                                className="flex-1 rounded-lg bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-xs text-white"
                              >
                                {TIME_OPTIONS.map((t) => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => removeSlot(dayIndex, slotIndex)}
                                className="size-8 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 hover:bg-red-500/20 transition-colors"
                              >
                                <Trash2 className="size-3.5 text-zinc-500 hover:text-red-400" />
                              </motion.button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={saving}
                onClick={handleSave}
                className="w-full rounded-xl bg-[#FFB800] py-3 text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {saving ? "Saving..." : "Save Availability"}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </CoachLayout>
  )
}
