"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { getCoachAvailability, setCoachAvailability } from "@/lib/store"
import { CoachAvailabilitySlot } from "@/types"
import { motion } from "motion/react"
import { Calendar, Clock, Save, Plus, Trash2, Loader2 } from "lucide-react"
import toast from "react-hot-toast"

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export default function CoachSchedulePage() {
  const { user } = useAuth()
  const [slots, setSlots] = useState<{ dayOfWeek: number; startTime: string; endTime: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // New slot form state
  const [newDay, setNewDay] = useState(1)
  const [newStart, setNewStart] = useState("09:00")
  const [newEnd, setNewEnd] = useState("10:00")

  useEffect(() => {
    async function loadAvailability() {
      if (!user?.id) return
      try {
        const data = await getCoachAvailability(user.id)
        setSlots(
          data.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
          }))
        )
      } catch (err) {
        console.error(err)
        toast.error("Failed to load availability")
      } finally {
        setLoading(false)
      }
    }
    loadAvailability()
  }, [user])

  const handleAddSlot = () => {
    // Validate times
    const startH = parseInt(newStart.split(":")[0])
    const endH = parseInt(newEnd.split(":")[0])
    if (startH >= endH) {
      toast.error("End time must be after start time")
      return
    }

    // Check for duplicate
    const exists = slots.some(
      (s) => s.dayOfWeek === newDay && s.startTime === newStart && s.endTime === newEnd
    )
    if (exists) {
      toast.error("Slot already exists")
      return
    }

    setSlots((prev) => [...prev, { dayOfWeek: newDay, startTime: newStart, endTime: newEnd }].sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek
      return a.startTime.localeCompare(b.startTime)
    }))
    toast.success("Slot added locally")
  }

  const handleRemoveSlot = (index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!user?.id) return
    setSaving(true)
    try {
      await setCoachAvailability(slots, user.id)
      toast.success("Availability saved successfully!")
    } catch (err) {
      console.error(err)
      toast.error("Failed to save availability")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-black">
        <Loader2 className="size-8 animate-spin text-[#FFB800]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24 max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="pt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="size-5 text-[#FFB800]" />
          <h1
            className="text-2xl font-bold tracking-wide uppercase"
            style={{ fontFamily: "Bebas Neue, sans-serif" }}
          >
            Weekly Availability
          </h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FFB800] text-black text-xs font-bold hover:bg-[#FFD200] transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3.5" />}
          Save
        </button>
      </div>

      {/* Add New Slot Form */}
      <div className="bg-[#111111] border border-[#222222] rounded-2xl p-4 space-y-4">
        <h2 className="text-sm font-bold text-[#FFB800] uppercase tracking-wider">Add Availability Slot</h2>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] text-[#555555] uppercase block mb-1">Day</label>
            <select
              value={newDay}
              onChange={(e) => setNewDay(parseInt(e.target.value))}
              className="w-full bg-[#222222] border border-[#333333] text-white text-xs rounded-lg p-2 focus:outline-none focus:border-[#FFB800]"
            >
              {DAYS.map((d, i) => (
                <option key={i} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-[#555555] uppercase block mb-1">Start Time</label>
            <select
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
              className="w-full bg-[#222222] border border-[#333333] text-white text-xs rounded-lg p-2 focus:outline-none focus:border-[#FFB800]"
            >
              {Array.from({ length: 24 }, (_, i) => {
                const hour = `${i.toString().padStart(2, "0")}:00`
                return (
                  <option key={i} value={hour}>
                    {hour}
                  </option>
                )
              })}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-[#555555] uppercase block mb-1">End Time</label>
            <select
              value={newEnd}
              onChange={(e) => setNewEnd(e.target.value)}
              className="w-full bg-[#222222] border border-[#333333] text-white text-xs rounded-lg p-2 focus:outline-none focus:border-[#FFB800]"
            >
              {Array.from({ length: 24 }, (_, i) => {
                const hour = `${i.toString().padStart(2, "0")}:00`
                return (
                  <option key={i} value={hour}>
                    {hour}
                  </option>
                )
              })}
            </select>
          </div>
        </div>
        <button
          onClick={handleAddSlot}
          className="w-full flex items-center justify-center gap-1 py-2 rounded-xl border border-dashed border-[#FFB800]/40 text-[#FFB800] text-xs font-bold hover:bg-[#FFB800]/5 transition-colors"
        >
          <Plus className="size-4" /> Add Slot
        </button>
      </div>

      {/* Slots List */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Active Slots ({slots.length})</h2>
        {slots.length === 0 ? (
          <p className="text-xs text-[#555555] text-center py-6">No availability slots set. Clients won't be able to book sessions.</p>
        ) : (
          <div className="space-y-2">
            {slots.map((slot, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#111111] border border-[#222222] rounded-xl px-4 py-3 flex items-center justify-between hover:border-[#FFB800]/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-[#FFB800]/10 text-[#FFB800] px-2.5 py-1 rounded-lg text-xs font-semibold">
                    {DAYS[slot.dayOfWeek].slice(0, 3)}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-[#A0A0A0]">
                    <Clock className="size-3.5 text-[#555555]" />
                    <span>
                      {slot.startTime} - {slot.endTime}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveSlot(index)}
                  className="p-1.5 rounded-lg text-[#FF4D4D] hover:bg-[#FF4D4D]/10 transition-colors"
                >
                  <Trash2 className="size-4" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
