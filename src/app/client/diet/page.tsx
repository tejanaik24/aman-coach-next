"use client"

import { ClientLayout } from "@/components/layout/ClientLayout"
import { EmptyState } from "@/components/ui/EmptyState"
import { PageSkeleton } from "@/components/ui/skeleton"
import { useClientData } from "@/hooks/useClient"
import { motion } from "motion/react"
import { UtensilsCrossed, Download } from "lucide-react"

export default function DietPage() {
  const { dietPlan, loading } = useClientData()

  if (loading) return <ClientLayout><PageSkeleton /></ClientLayout>

  if (!dietPlan) {
    return (
      <ClientLayout>
        <EmptyState
          icon="🥗"
          title="No Diet Plan Yet"
          description="Your coach hasn't uploaded your diet plan yet. Hang tight!"
        />
      </ClientLayout>
    )
  }

  const meals = [
    { key: "breakfast", label: "Breakfast", icon: "🌅" },
    { key: "pre-workout", label: "Pre-Workout", icon: "⚡" },
    { key: "lunch", label: "Lunch", icon: "☀️" },
    { key: "post-workout", label: "Post-Workout", icon: "💪" },
    { key: "dinner", label: "Dinner", icon: "🌙" },
  ]

  return (
    <ClientLayout>
      <div className="flex items-center gap-3 mb-2">
        <UtensilsCrossed className="size-6 text-[#FFB800]" />
        <h1 className="font-heading text-2xl text-white">My Diet Plan</h1>
      </div>
      <p className="text-xs text-zinc-500 mb-1">{dietPlan.name}</p>
      {dietPlan.calories && (
        <p className="text-sm text-[#FFD200] font-medium mb-6">{dietPlan.calories} kcal daily target</p>
      )}

      <div className="space-y-3 mb-6">
        {meals.map((meal, i) => {
          const mealData = dietPlan.meals?.find(
            m => m.name?.toLowerCase().includes(meal.key) || m.name?.toLowerCase() === meal.label.toLowerCase()
          )
          const totals = mealData?.foods?.reduce((acc, f) => ({
            calories: acc.calories + (f.calories ?? 0),
            protein: acc.protein + (f.protein ?? 0),
            carbs: acc.carbs + (f.carbs ?? 0),
            fats: acc.fats + (f.fats ?? 0),
          }), { calories: 0, protein: 0, carbs: 0, fats: 0 })

          return (
            <motion.div
              key={meal.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xl">{meal.icon}</span>
                <div>
                  <p className="text-sm font-medium text-white">{meal.label}</p>
                  {mealData?.time && (
                    <p className="text-xs text-zinc-500">{mealData.time}</p>
                  )}
                </div>
              </div>
              {mealData?.foods && mealData.foods.length > 0 ? (
                <div className="space-y-2">
                  {mealData.foods.map((food, j) => (
                    <div key={j} className="flex items-center justify-between rounded-xl bg-zinc-800/50 px-3 py-2">
                      <span className="text-sm text-zinc-300">{food.name}</span>
                      <span className="text-xs text-zinc-500">{food.portion}</span>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    {totals!.calories > 0 && (
                      <span className="text-[10px] font-medium text-zinc-400 bg-zinc-800 rounded-full px-2 py-1">
                        {totals!.calories} cal
                      </span>
                    )}
                    {totals!.protein > 0 && (
                      <span className="text-[10px] font-medium text-blue-400 bg-blue-500/10 rounded-full px-2 py-1">
                        P: {totals!.protein}g
                      </span>
                    )}
                    {totals!.carbs > 0 && (
                      <span className="text-[10px] font-medium text-yellow-400 bg-yellow-500/10 rounded-full px-2 py-1">
                        C: {totals!.carbs}g
                      </span>
                    )}
                    {totals!.fats > 0 && (
                      <span className="text-[10px] font-medium text-orange-400 bg-orange-500/10 rounded-full px-2 py-1">
                        F: {totals!.fats}g
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 text-center py-3">No items listed for this meal</p>
              )}
            </motion.div>
          )
        })}
      </div>

      <button
        onClick={() => {
          let text = `${dietPlan.name}\n`
          if (dietPlan.calories) text += `${dietPlan.calories} kcal daily target\n\n`
          else text += "\n"
          for (const meal of dietPlan.meals ?? []) {
            text += `${meal.name}${meal.time ? ` (${meal.time})` : ""}\n`
            for (const food of meal.foods ?? []) {
              text += `  ${food.name} — ${food.portion}${food.calories ? ` (${food.calories} cal)` : ""}\n`
            }
            text += "\n"
          }
          const blob = new Blob([text], { type: "text/plain" })
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = "diet-plan.txt"
          a.click()
          URL.revokeObjectURL(url)
        }}
        className="w-full rounded-full bg-[#FFB800] py-3.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-[#B28000] transition-colors flex items-center justify-center gap-2"
      >
        <Download className="size-4" />
        Download Full Plan
      </button>
    </ClientLayout>
  )
}
