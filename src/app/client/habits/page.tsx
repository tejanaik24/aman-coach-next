"use client"

import { useState, useEffect, useCallback } from "react"
import { ClientLayout } from "@/components/layout/ClientLayout"
import { HabitCard } from "@/components/habits/HabitCard"
import { AddHabitSheet } from "@/components/habits/AddHabitSheet"
import { PageSkeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/EmptyState"
import { useAuth } from "@/hooks/useAuth"
import { getHabits, createHabit, deleteHabit, getHabitLogs, toggleHabitLog, getHabitLogsRange } from "@/lib/store"
import { Habit } from "@/types"
import { motion, AnimatePresence } from "motion/react"
import { CheckSquare, Plus, ChevronLeft, ChevronRight, Trash2, Sparkles } from "lucide-react"
import { format, subDays, addDays, isSameDay } from "date-fns"

const habitStreakDefault: Habit[] = [
  { id: "pre-built-1", userId: "", name: "8 Glasses of Water", icon: "💧", category: "hydration", color: "#3B82F6", sortOrder: 0, createdAt: new Date() },
  { id: "pre-built-2", userId: "", name: "10,000 Steps", icon: "🚶", category: "movement", color: "#10B981", sortOrder: 1, createdAt: new Date() },
  { id: "pre-built-3", userId: "", name: "7-8 Hours Sleep", icon: "😴", category: "sleep", color: "#FFB800", sortOrder: 2, createdAt: new Date() },
  { id: "pre-built-4", userId: "", name: "No Sugar", icon: "🎯", category: "nutrition", color: "#F59E0B", sortOrder: 3, createdAt: new Date() },
  { id: "pre-built-5", userId: "", name: "Stretch 10min", icon: "🧘", category: "movement", color: "#EC4899", sortOrder: 4, createdAt: new Date() },
]

export default function HabitsPage() {
  const { user } = useAuth()
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<Record<string, boolean>>({})
  const [weekRange, setWeekRange] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [selectedDay, setSelectedDay] = useState(format(new Date(), "yyyy-MM-dd"))
  const [toggling, setToggling] = useState<string | null>(null)

  const today = format(new Date(), "yyyy-MM-dd")

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i)
    return format(d, "yyyy-MM-dd")
  })

  const loadAll = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const [hData, logsData, weekData] = await Promise.all([
        getHabits(user.id),
        getHabitLogs(user.id, selectedDay),
        getHabitLogsRange(user.id, last7Days[0], last7Days[6]),
      ])
      const allHabits = hData.length > 0 ? hData : []
      setHabits(allHabits)

      const logMap: Record<string, boolean> = {}
      logsData.forEach((l) => { logMap[l.habitId] = l.value > 0 })
      setLogs(logMap)

      const weekMap: Record<string, string[]> = {}
      weekData.forEach((l) => {
        if (!weekMap[l.habitId]) weekMap[l.habitId] = []
        weekMap[l.habitId].push(l.date)
      })
      setWeekRange(weekMap)
    } finally {
      setLoading(false)
    }
  }, [user?.id, selectedDay, last7Days])

  useEffect(() => { loadAll() }, [loadAll])

  const handleToggle = async (habitId: string) => {
    if (!user?.id || toggling) return
    setToggling(habitId)
    try {
      const newState = await toggleHabitLog(habitId, user.id, selectedDay)
      setLogs((prev) => ({ ...prev, [habitId]: newState }))
      await loadAll()
    } finally {
      setToggling(null)
    }
  }

  const handleCreateHabit = async (data: { name: string; icon: string; category: string; color: string }) => {
    if (!user?.id) return
    await createHabit({ userId: user.id, name: data.name, icon: data.icon, category: data.category as Habit["category"], color: data.color, sortOrder: habits.length })
    setShowAdd(false)
    await loadAll()
  }

  const handleDeleteHabit = async (id: string) => {
    await deleteHabit(id)
    await loadAll()
  }

  const getStreak = (habitId: string): number => {
    let streak = 0
    const d = new Date()
    while (true) {
      const ds = format(d, "yyyy-MM-dd")
      const dayLogs = weekRange[habitId] || []
      if (dayLogs.includes(ds)) {
        streak++
        d.setDate(d.getDate() - 1)
      } else {
        break
      }
    }
    return streak
  }

  const getWeekStatus = (habitId: string, day: string): "done" | "missed" | "none" => {
    const dayLogs = weekRange[habitId] || []
    return dayLogs.includes(day) ? "done" : day < today ? "missed" : "none"
  }

  if (loading) return <ClientLayout><PageSkeleton /></ClientLayout>

  return (
    <ClientLayout>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <CheckSquare className="size-6 text-[#FFB800]" />
          <h1 className="font-heading text-2xl text-white">Habits</h1>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAdd(true)}
          className="size-10 rounded-full bg-[#FFB800] flex items-center justify-center"
        >
          <Plus className="size-5 text-white" />
        </motion.button>
      </div>

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

      {habits.length === 0 ? (
        <div className="space-y-3 mb-16">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Suggested Habits</p>
          {habitStreakDefault.map((habit, i) => (
            <motion.div
              key={habit.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/50 p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{habit.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-white">{habit.name}</p>
                    <p className="text-xs text-zinc-500">Tap + to add this habit</p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={async () => {
                    if (!user?.id) return
                    await createHabit({ userId: user.id, name: habit.name, icon: habit.icon, category: habit.category as Habit["category"], color: habit.color, sortOrder: i })
                    await loadAll()
                  }}
                  className="size-8 rounded-full bg-[#FFB800]/20 border border-[#FFB800]/30 flex items-center justify-center"
                >
                  <Plus className="size-4 text-[#FFD200]" />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-2 mb-20">
          <AnimatePresence>
            {habits.map((habit, i) => {
              const done = logs[habit.id] || false
              const streak = getStreak(habit.id)
              return (
                <motion.div
                  key={habit.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.04 }}
                  className="relative"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex gap-1 flex-1">
                      {last7Days.map((day) => {
                        const status = getWeekStatus(habit.id, day)
                        return (
                          <div
                            key={day}
                            className={`flex-1 h-1 rounded-full ${
                              status === "done" ? "bg-[#FFB800]" : status === "missed" ? "bg-zinc-800" : "bg-zinc-800/50"
                            }`}
                          />
                        )
                      })}
                    </div>
                    {streak >= 4 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-0.5"
                      >
                        <Sparkles className="size-3 text-amber-400" />
                        <span className="text-[10px] text-amber-400 font-medium">{streak}</span>
                      </motion.div>
                    )}
                  </div>
                  <HabitCard
                    name={habit.name}
                    icon={habit.icon}
                    color={habit.color}
                    done={done || false}
                    streak={streak}
                    onToggle={() => handleToggle(habit.id)}
                    loading={toggling === habit.id}
                  />
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      <AddHabitSheet
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={handleCreateHabit}
      />
    </ClientLayout>
  )
}
