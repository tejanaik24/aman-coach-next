"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { X } from "lucide-react"

interface Props {
  open: boolean
  onClose: () => void
  onSave: (data: { name: string; icon: string; category: string; color: string }) => void
}

const icons = ["💧", "🚶", "🏃", "🧘", "🥗", "📖", "😴", "🎯", "💪", "🧠", "☀️", "🎵"]
const categories = [
  { value: "hydration", label: "Hydration" },
  { value: "movement", label: "Movement" },
  { value: "mindfulness", label: "Mindfulness" },
  { value: "nutrition", label: "Nutrition" },
  { value: "sleep", label: "Sleep" },
  { value: "other", label: "Other" },
]
const colors = ["#FFB800", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#06B6D4", "#8B5CF6"]

export function AddHabitSheet({ open, onClose, onSave }: Props) {
  const [name, setName] = useState("")
  const [icon, setIcon] = useState("💧")
  const [category, setCategory] = useState("hydration")
  const [color, setColor] = useState("#FFB800")

  const handleSave = () => {
    if (!name.trim()) return
    onSave({ name: name.trim(), icon, category, color })
    setName("")
    setIcon("💧")
    setCategory("hydration")
    setColor("#FFB800")
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-zinc-800 bg-zinc-900 p-6 max-w-lg mx-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-xl text-white">New Habit</h2>
              <button onClick={onClose}>
                <X className="size-5 text-zinc-500 hover:text-white transition-colors" />
              </button>
            </div>

            <div className="mb-5">
              <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2 block">
                Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Drink 8 glasses of water"
                className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800]/30"
                autoFocus
              />
            </div>

            <div className="mb-5">
              <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2 block">
                Icon
              </label>
              <div className="flex gap-2 flex-wrap">
                {icons.map((ic) => (
                  <button
                    key={ic}
                    onClick={() => setIcon(ic)}
                    className={`size-10 rounded-xl flex items-center justify-center text-lg transition-all ${
                      icon === ic ? "bg-[#FFB800]/20 border border-[#FFB800]/40" : "bg-zinc-800 border border-zinc-800 hover:border-zinc-600"
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2 block">
                Category
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      category === cat.value ? "bg-[#FFB800] text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2 block">
                Color
              </label>
              <div className="flex gap-2">
                {colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`size-8 rounded-full transition-all ${
                      color === c ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110" : ""
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={!name.trim()}
              className="w-full rounded-full bg-[#FFB800] py-3.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-[#B28000] disabled:opacity-50 transition-all"
            >
              Create Habit
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
