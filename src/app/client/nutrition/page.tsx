"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { ClientLayout } from "@/components/layout/ClientLayout"
import { CalorieRing } from "@/components/nutrition/CalorieRing"
import { MacroBar } from "@/components/nutrition/MacroBar"
import { PageSkeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/EmptyState"
import { useAuth } from "@/hooks/useAuth"
import { getMealLogs, logMeal, deleteMealLog, searchFoodDatabase } from "@/lib/store"
import { MealLog, FoodItem } from "@/types"
import { motion, AnimatePresence } from "motion/react"
import {
  UtensilsCrossed, Plus, X, Search, ChevronRight, Flame, Trash2,
} from "lucide-react"
import { format } from "date-fns"

const mealIcons: Record<string, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍿",
}

const mealLabels: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
}

const macroColors = { protein: "#3B82F6", carbs: "#EAB308", fats: "#F97316" }
const dailyTarget = 2000

export default function NutritionPage() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<MealLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<FoodItem[]>([])
  const [selectedFoods, setSelectedFoods] = useState<FoodItem[]>([])
  const [adding, setAdding] = useState(false)
  const today = format(new Date(), "yyyy-MM-dd")
  const searchRef = useRef<HTMLInputElement>(null)

  const loadLogs = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const data = await getMealLogs(user.id, today)
      setLogs(data)
    } finally {
      setLoading(false)
    }
  }, [user?.id, today])

  useEffect(() => { loadLogs() }, [loadLogs])

  const totals = logs.reduce(
    (acc, m) => ({
      calories: acc.calories + m.totalCalories,
      protein: acc.protein + m.totalProtein,
      carbs: acc.carbs + m.totalCarbs,
      fats: acc.fats + m.totalFats,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  )

  const handleSearch = async (q: string) => {
    setSearch(q)
    if (q.length < 1) { setResults([]); return }
    const data = await searchFoodDatabase(q)
    setResults(data.map((d) => ({
      name: d.name,
      portion: d.portion,
      calories: d.calories,
      protein: d.protein,
      carbs: d.carbs,
      fats: d.fats,
    })))
  }

  const handleAddFood = (food: FoodItem) => {
    setSelectedFoods((prev) => [...prev, food])
    setSearch("")
    setResults([])
    searchRef.current?.focus()
  }

  const handleRemoveSelected = (i: number) => {
    setSelectedFoods((prev) => prev.filter((_, idx) => idx !== i))
  }

  const handleSaveMeal = async () => {
    if (!user?.id || !showAdd || selectedFoods.length === 0) return
    setAdding(true)
    try {
      const mealTotals = selectedFoods.reduce(
        (acc, f) => ({
          calories: acc.calories + (f.calories || 0),
          protein: acc.protein + (f.protein || 0),
          carbs: acc.carbs + (f.carbs || 0),
          fats: acc.fats + (f.fats || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fats: 0 }
      )
      await logMeal({
        userId: user.id,
        date: today,
        mealName: showAdd as MealLog["mealName"],
        foods: selectedFoods,
        totalCalories: mealTotals.calories,
        totalProtein: mealTotals.protein,
        totalCarbs: mealTotals.carbs,
        totalFats: mealTotals.fats,
      })
      setShowAdd(null)
      setSelectedFoods([])
      setSearch("")
      setResults([])
      await loadLogs()
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteMeal = async (id: string) => {
    await deleteMealLog(id)
    await loadLogs()
  }

  if (loading) return <ClientLayout><PageSkeleton /></ClientLayout>

  return (
    <ClientLayout>
      <AnimatePresence mode="wait">
        {showAdd ? (
          <motion.div
            key="add-meal"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{mealIcons[showAdd]}</span>
                <h1 className="font-heading text-2xl text-white">
                  Add {mealLabels[showAdd]}
                </h1>
              </div>
              <button onClick={() => { setShowAdd(null); setSelectedFoods([]); setSearch(""); setResults([]) }}>
                <X className="size-5 text-zinc-500 hover:text-white transition-colors" />
              </button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search food..."
                className="w-full rounded-xl bg-zinc-800 border border-zinc-700 pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800]/30"
                autoFocus
              />
            </div>

            <AnimatePresence>
              {results.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900 mb-4 overflow-hidden"
                >
                  {results.map((food, i) => (
                    <motion.button
                      key={food.name + i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => handleAddFood(food)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50 last:border-0"
                    >
                      <div>
                        <p className="text-sm text-white font-medium">{food.name}</p>
                        <p className="text-xs text-zinc-500">{food.portion}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-400">{food.calories} cal</span>
                        <ChevronRight className="size-4 text-zinc-600" />
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {selectedFoods.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 mb-4"
              >
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
                  Selected Foods ({selectedFoods.length})
                </p>
                <div className="space-y-2">
                  {selectedFoods.map((food, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-zinc-800/50 px-3 py-2">
                      <div>
                        <span className="text-sm text-white">{food.name}</span>
                        <span className="text-xs text-zinc-500 ml-2">{food.portion}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-400">{food.calories} cal</span>
                        <button onClick={() => handleRemoveSelected(i)}>
                          <X className="size-3.5 text-zinc-600 hover:text-red-400 transition-colors" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  {(["protein", "carbs", "fats"] as const).map((m) => {
                    const total = selectedFoods.reduce((s, f) => s + (f[m] || 0), 0)
                    const color = macroColors[m]
                    return (
                      <span
                        key={m}
                        className="text-[10px] font-medium rounded-full px-2 py-1"
                        style={{ backgroundColor: `${color}15`, color }}
                      >
                        {m === "protein" ? "P" : m === "carbs" ? "C" : "F"}: {Math.round(total)}g
                      </span>
                    )
                  })}
                </div>
              </motion.div>
            )}

            <button
              onClick={handleSaveMeal}
              disabled={selectedFoods.length === 0 || adding}
              className="w-full rounded-full bg-[#FFB800] py-3.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-[#B28000] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {adding ? "Saving..." : `Save ${mealLabels[showAdd]}`}
            </button>
          </motion.div>
        ) : (
          <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center gap-3 mb-2">
              <UtensilsCrossed className="size-6 text-[#FFB800]" />
              <h1 className="font-heading text-2xl text-white">Nutrition</h1>
            </div>
            <p className="text-xs text-zinc-500 mb-6">
              {format(new Date(), "EEEE, MMMM d")}
            </p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-900/50 p-5 mb-4 flex flex-col items-center"
            >
              <CalorieRing current={totals.calories} target={dailyTarget} />
              {totals.calories > 0 && (
                <div className="flex gap-3 mt-4 w-full max-w-xs">
                  <MacroBar
                    macros={[
                      { label: "Protein", current: totals.protein, target: 120, color: macroColors.protein, unit: "g" },
                      { label: "Carbs", current: totals.carbs, target: 250, color: macroColors.carbs, unit: "g" },
                      { label: "Fats", current: totals.fats, target: 65, color: macroColors.fats, unit: "g" },
                    ]}
                  />
                </div>
              )}
            </motion.div>

            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
              Today&apos;s Meals
            </p>

            {logs.length === 0 ? (
              <EmptyState icon="🍽️" title="No meals logged today" description="Tap + to add your first meal" />
            ) : (
              <div className="space-y-2 mb-4">
                {(["breakfast", "lunch", "snack", "dinner"] as const).map((type) => {
                  const mealLogs = logs.filter((l) => l.mealName === type)
                  if (mealLogs.length === 0) return null
                  return mealLogs.map((ml) => (
                    <motion.div
                      key={ml.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{mealIcons[ml.mealName]}</span>
                          <span className="text-sm font-medium text-white">
                            {mealLabels[ml.mealName]}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-zinc-400 font-medium">
                            {Math.round(ml.totalCalories)} cal
                          </span>
                          <button onClick={() => handleDeleteMeal(ml.id)}>
                            <Trash2 className="size-3.5 text-zinc-600 hover:text-red-400 transition-colors" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {ml.foods.map((food, j) => (
                          <div key={j} className="flex items-center justify-between rounded-xl bg-zinc-800/30 px-3 py-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-zinc-300">{food.name}</span>
                              <span className="text-xs text-zinc-600">{food.portion}</span>
                            </div>
                            <span className="text-xs text-zinc-500">{food.calories} cal</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-2">
                        {ml.totalProtein > 0 && (
                          <span className="text-[10px] text-blue-400 bg-blue-500/10 rounded-full px-2 py-0.5">
                            P: {Math.round(ml.totalProtein)}g
                          </span>
                        )}
                        {ml.totalCarbs > 0 && (
                          <span className="text-[10px] text-yellow-400 bg-yellow-500/10 rounded-full px-2 py-0.5">
                            C: {Math.round(ml.totalCarbs)}g
                          </span>
                        )}
                        {ml.totalFats > 0 && (
                          <span className="text-[10px] text-orange-400 bg-orange-500/10 rounded-full px-2 py-0.5">
                            F: {Math.round(ml.totalFats)}g
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))
                })}
              </div>
            )}

            <div className="grid grid-cols-4 gap-2 mb-16">
              {(["breakfast", "lunch", "snack", "dinner"] as const).map((type) => {
                const hasMeal = logs.some((l) => l.mealName === type)
                return (
                  <motion.button
                    key={type}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowAdd(type)}
                    className={`rounded-2xl border p-3 flex flex-col items-center gap-1 transition-all ${
                      hasMeal
                        ? "border-[#FFB800]/30 bg-[#FFB800]/10"
                        : "border-dashed border-zinc-700 bg-zinc-900/50 hover:border-[#FFB800]/40"
                    }`}
                  >
                    <span className="text-xl">{mealIcons[type]}</span>
                    <span className="text-[10px] text-zinc-400 font-medium">{mealLabels[type]}</span>
                    {hasMeal ? (
                      <Flame className="size-3 text-[#FFB800]" />
                    ) : (
                      <Plus className="size-3 text-zinc-600" />
                    )}
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ClientLayout>
  )
}
