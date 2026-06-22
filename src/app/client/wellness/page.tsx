"use client"

import { useState, useEffect, useCallback } from "react"
import { ClientLayout } from "@/components/layout/ClientLayout"
import { MetricCard } from "@/components/wellness/MetricCard"
import { PageSkeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/EmptyState"
import { useAuth } from "@/hooks/useAuth"
import { getWearableMetrics, saveWearableMetrics, getWearableMetricsRange } from "@/lib/store"
import { motion, AnimatePresence } from "motion/react"
import { Activity, Heart, Moon, Flame, Plus, X, TrendingUp } from "lucide-react"
import { format, subDays } from "date-fns"

interface MetricForm {
  steps: string
  heartRateAvg: string
  sleepHours: string
  caloriesBurned: string
  activeMinutes: string
}

export default function WellnessPage() {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<any>(null)
  const [trends, setTrends] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showManual, setShowManual] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedDay, setSelectedDay] = useState(format(new Date(), "yyyy-MM-dd"))
  const [form, setForm] = useState<MetricForm>({
    steps: "", heartRateAvg: "", sleepHours: "", caloriesBurned: "", activeMinutes: "",
  })

  const today = format(new Date(), "yyyy-MM-dd")

  const last7Days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), "yyyy-MM-dd"))

  const loadMetrics = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const [data, trendData] = await Promise.all([
        getWearableMetrics(user.id, selectedDay),
        getWearableMetricsRange(user.id, last7Days[0], last7Days[6]),
      ])
      const combined = data.reduce((acc: any, m: any) => {
        if (m.steps) acc.steps = m.steps
        if (m.heartRateAvg) acc.heartRateAvg = m.heartRateAvg
        if (m.sleepHours) acc.sleepHours = m.sleepHours
        if (m.caloriesBurned) acc.caloriesBurned = m.caloriesBurned
        if (m.activeMinutes) acc.activeMinutes = m.activeMinutes
        return acc
      }, {})
      setMetrics(Object.keys(combined).length > 0 ? combined : null)
      setTrends(trendData)
    } finally {
      setLoading(false)
    }
  }, [user?.id, selectedDay, last7Days])

  useEffect(() => { loadMetrics() }, [loadMetrics])

  const handleSave = async () => {
    if (!user?.id) return
    setSaving(true)
    try {
      await saveWearableMetrics({
        userId: user.id,
        date: selectedDay,
        source: "manual",
        steps: form.steps ? parseInt(form.steps) : undefined,
        heartRateAvg: form.heartRateAvg ? parseFloat(form.heartRateAvg) : undefined,
        sleepHours: form.sleepHours ? parseFloat(form.sleepHours) : undefined,
        caloriesBurned: form.caloriesBurned ? parseInt(form.caloriesBurned) : undefined,
        activeMinutes: form.activeMinutes ? parseInt(form.activeMinutes) : undefined,
      })
      setShowManual(false)
      setForm({ steps: "", heartRateAvg: "", sleepHours: "", caloriesBurned: "", activeMinutes: "" })
      await loadMetrics()
    } finally {
      setSaving(false)
    }
  }

  const avgPrev = (field: string): number | null => {
    if (trends.length < 2) return null
    const vals = trends.slice(0, -1).map((m: any) => m[field]).filter(Boolean)
    if (vals.length === 0) return null
    const current = trends[trends.length - 1]?.[field]
    if (!current) return null
    const avg = vals.reduce((a: number, b: number) => a + b, 0) / vals.length
    return avg > 0 ? Math.round(((current - avg) / avg) * 100) : null
  }

  if (loading) return <ClientLayout><PageSkeleton /></ClientLayout>

  return (
    <ClientLayout>
      <AnimatePresence mode="wait">
        {showManual ? (
          <motion.div
            key="manual-form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Activity className="size-6 text-[#FFB800]" />
                <h1 className="font-heading text-2xl text-white">Manual Entry</h1>
              </div>
              <button onClick={() => setShowManual(false)}>
                <X className="size-5 text-zinc-500 hover:text-white transition-colors" />
              </button>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-4 mb-4">
              {[
                { key: "steps", label: "Steps", unit: "steps", icon: "👟" },
                { key: "heartRateAvg", label: "Avg Heart Rate", unit: "bpm", icon: "❤️" },
                { key: "sleepHours", label: "Sleep", unit: "hours", icon: "😴" },
                { key: "caloriesBurned", label: "Calories Burned", unit: "kcal", icon: "🔥" },
                { key: "activeMinutes", label: "Active Minutes", unit: "min", icon: "🏃" },
              ].map((field) => (
                <div key={field.key}>
                  <label className="flex items-center gap-2 text-xs text-zinc-400 mb-1.5">
                    <span>{field.icon}</span>
                    {field.label}
                    <span className="text-zinc-600">({field.unit})</span>
                  </label>
                  <input
                    type="number"
                    value={(form as any)[field.key]}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800]/30"
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-full bg-[#FFB800] py-3.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-[#B28000] disabled:opacity-50 transition-all"
            >
              {saving ? "Saving..." : "Save Metrics"}
            </button>
          </motion.div>
        ) : (
          <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Activity className="size-6 text-[#FFB800]" />
                <h1 className="font-heading text-2xl text-white">Wellness</h1>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowManual(true)}
                className="size-10 rounded-full bg-[#FFB800] flex items-center justify-center"
              >
                <Plus className="size-5 text-white" />
              </motion.button>
            </div>
            <p className="text-xs text-zinc-500 mb-6">
              {format(new Date(selectedDay), "EEEE, MMMM d")}
            </p>

            <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
              {last7Days.map((day) => {
                const d = new Date(day)
                const isToday = day === today
                const isSelected = day === selectedDay
                return (
                  <motion.button
                    key={day}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedDay(day)}
                    className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl min-w-[52px] transition-all ${
                      isSelected
                        ? "bg-[#FFB800] text-white"
                        : isToday
                        ? "bg-zinc-800 text-zinc-300"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <span className="text-[10px] font-medium uppercase">{format(d, "EEE")}</span>
                    <span className="text-sm font-bold">{format(d, "d")}</span>
                  </motion.button>
                )
              })}
            </div>

            {metrics ? (
              <div className="grid grid-cols-2 gap-3 mb-6">
                {metrics.steps !== undefined && (
                  <MetricCard
                    icon={<TrendingUp className="size-5" />}
                    label="Steps"
                    value={metrics.steps.toLocaleString()}
                    unit="steps"
                    color="#3B82F6"
                    trend={{ value: Math.abs(avgPrev("steps") || 0), positive: (avgPrev("steps") || 0) >= 0 }}
                  />
                )}
                {metrics.heartRateAvg !== undefined && (
                  <MetricCard
                    icon={<Heart className="size-5" />}
                    label="Heart Rate"
                    value={String(metrics.heartRateAvg)}
                    unit="bpm"
                    color="#EF4444"
                    trend={{ value: Math.abs(avgPrev("heartRateAvg") || 0), positive: (avgPrev("heartRateAvg") || 0) <= 0 }}
                  />
                )}
                {metrics.sleepHours !== undefined && (
                  <MetricCard
                    icon={<Moon className="size-5" />}
                    label="Sleep"
                    value={String(metrics.sleepHours)}
                    unit="hrs"
                    color="#FFB800"
                    trend={{ value: Math.abs(avgPrev("sleepHours") || 0), positive: (avgPrev("sleepHours") || 0) >= 0 }}
                  />
                )}
                {metrics.caloriesBurned !== undefined && (
                  <MetricCard
                    icon={<Flame className="size-5" />}
                    label="Calories"
                    value={metrics.caloriesBurned.toLocaleString()}
                    unit="kcal"
                    color="#F97316"
                    trend={{ value: Math.abs(avgPrev("caloriesBurned") || 0), positive: (avgPrev("caloriesBurned") || 0) >= 0 }}
                  />
                )}
              </div>
            ) : (
              <EmptyState
                icon="📱"
                title="No data for this day"
                description="Tap + to manually add your metrics or connect a wearable device."
              />
            )}

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">
                Connected Sources
              </p>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50">
                <div className="size-10 rounded-xl bg-zinc-800 flex items-center justify-center text-lg">
                  ✋
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white font-medium">Manual Entry</p>
                  <p className="text-xs text-green-400">Active</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ClientLayout>
  )
}
