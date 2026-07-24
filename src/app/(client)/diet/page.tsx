"use client"

import { useState, useEffect } from "react"
import { motion } from "motion/react"
import { Apple, Download, Coffee, Soup, Flame } from "lucide-react"
import { format } from "date-fns"
import toast from "react-hot-toast"
import jsPDF from "jspdf"
import { createClient } from "@/lib/supabase/client"
import type { Client, NutritionPlan, Meal } from "@/types"

function mealIcon(mealName: string) {
  const n = mealName.toLowerCase()
  if (n.includes("breakfast")) return Coffee
  if (n.includes("dinner")) return Flame
  return Soup
}

function foodField(food: Record<string, unknown>, key: string): string {
  const v = food[key]
  return v !== undefined && v !== null ? String(v) : ""
}

function DietSkeleton() {
  return (
    <div className="px-5 pt-2 space-y-5 bg-cream min-h-full">
      <div className="h-7 w-40 bg-white rounded-card-mobile animate-pulse" />
      <div className="grid grid-cols-4 gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[85px] bg-white rounded-2xl shadow-bento animate-pulse" />
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-white rounded-card-mobile shadow-bento animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export default function ClientDietPage() {
  const supabase = createClient()
  const [plan, setPlan] = useState<NutritionPlan | null>(null)
  const [meals, setMeals] = useState<Meal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasNoPlan, setHasNoPlan] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: clientData, error: clientError } = await supabase
          .from("clients")
          .select("*")
          .eq("user_id", user.id)
          .single()
        if (clientError || !clientData) { setHasNoPlan(true); return }
        const client = clientData as Client

        const { data: planData, error: planError } = await supabase
          .from("nutrition_plans")
          .select("*")
          .eq("client_id", client.id)
          .eq("is_active", true)
          .single()
        if (planError || !planData) { setHasNoPlan(true); return }
        const activePlan = planData as NutritionPlan
        setPlan(activePlan)

        const { data: mealsData } = await supabase
          .from("meals")
          .select("*")
          .eq("plan_id", activePlan.id)
          .order("order_index", { ascending: true })
        setMeals((mealsData ?? []) as Meal[])
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  function handleDownloadPDF() {
    if (!plan) return
    try {
      const doc = new jsPDF()
      doc.setFont("helvetica", "bold")
      doc.setFontSize(22)
      doc.text("AK FITNESS — DIET PLAN", 20, 20)

      doc.setFontSize(12)
      doc.setFont("helvetica", "normal")
      doc.text(`Daily Calorie Target: ${plan.total_calories ?? "—"} kcal`, 20, 30)
      doc.text(`Protein: ${plan.protein_g ?? "—"}g  Carbs: ${plan.carbs_g ?? "—"}g  Fats: ${plan.fats_g ?? "—"}g`, 20, 38)

      let y = 52
      meals.forEach((meal) => {
        if (y > 250) { doc.addPage(); y = 20 }
        doc.setFont("helvetica", "bold")
        doc.setFontSize(14)
        doc.text(`${meal.meal_name.toUpperCase()}${meal.meal_time ? ` (${meal.meal_time})` : ""}`, 20, y)
        y += 8
        meal.foods.forEach((food) => {
          doc.setFont("helvetica", "normal")
          doc.setFontSize(11)
          const name = foodField(food, "name")
          const cals = foodField(food, "calories")
          doc.text(`- ${name}${cals ? ` (${cals} kcal)` : ""}`, 25, y)
          y += 6
        })
        y += 6
      })

      doc.save(`Diet_Plan_AK_Fitness_${format(new Date(), "yyyy-MM-dd")}.pdf`)
      toast.success("PDF downloaded")
    } catch {
      toast.error("Failed to generate PDF")
    }
  }

  if (isLoading) return <DietSkeleton />

  if (hasNoPlan || !plan) {
    return (
      <div className="px-5 flex flex-col items-center justify-center min-h-[60vh] space-y-4 bg-cream">
        <div className="size-16 rounded-full bg-lime-tint flex items-center justify-center">
          <Apple className="size-8 text-charcoal-deep" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-charcoal-deep font-montserrat font-bold text-lg">No diet plan assigned</p>
          <p className="text-sm text-charcoal-muted">Your coach will set your nutrition targets soon</p>
        </div>
      </div>
    )
  }

  const macros = [
    { label: "Calories", value: plan.total_calories ?? "—", unit: "kcal", highlight: false },
    { label: "Protein", value: plan.protein_g ?? "—", unit: "g", highlight: true },
    { label: "Carbs", value: plan.carbs_g ?? "—", unit: "g", highlight: false },
    { label: "Fats", value: plan.fats_g ?? "—", unit: "g", highlight: false },
  ]

  return (
    <div className="px-5 pt-2 flex flex-col gap-6 bg-cream min-h-full pb-4">
      {/* Header */}
      <div className="flex flex-col">
        <span className="text-[11px] font-bold text-charcoal-muted uppercase tracking-widest">
          Active Nutrition
        </span>
        <h2 className="font-montserrat font-black text-xl text-charcoal-deep leading-tight mt-0.5">
          {plan.notes || "Diet Plan"}
        </h2>
      </div>

      {/* Macro Bento Grid */}
      <div className="grid grid-cols-4 gap-2.5 select-none">
        {macros.map((macro) => (
          <div
            key={macro.label}
            className={`p-3 rounded-2xl shadow-bento flex flex-col justify-between h-[85px] ${
              macro.highlight ? "bg-lime-electric text-charcoal-deep" : "bg-white text-charcoal-deep"
            }`}
          >
            <span className={`text-[9px] font-bold uppercase tracking-wider ${macro.highlight ? "text-charcoal-deep" : "text-charcoal-muted"}`}>
              {macro.label}
            </span>
            <div className="flex flex-col mt-1">
              <span className="font-montserrat font-black text-lg leading-none">{macro.value}</span>
              <span className="text-[9px] font-bold uppercase mt-0.5 opacity-60">{macro.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Meals List */}
      <div className="flex flex-col gap-4">
        <h3 className="font-montserrat font-bold text-xs text-charcoal-deep uppercase tracking-widest mb-1">
          Meal Plan
        </h3>

        {meals.length === 0 ? (
          <div className="bg-white rounded-card-mobile shadow-bento p-8 flex flex-col items-center gap-2">
            <Apple className="size-8 text-charcoal-muted/40" />
            <p className="text-charcoal-muted text-xs font-medium">No meals configured yet</p>
          </div>
        ) : (
          meals.map((meal) => {
            const MealIcon = mealIcon(meal.meal_name)
            return (
              <motion.div
                key={meal.id}
                whileTap={{ scale: 0.98 }}
                className="bg-white rounded-card-mobile p-4 shadow-bento flex gap-3 cursor-pointer border border-transparent hover:border-lime-electric/20 transition-all duration-300"
              >
                <div className="w-16 h-16 rounded-xl bg-lime-tint flex items-center justify-center shrink-0">
                  <MealIcon className="w-6 h-6 text-charcoal-deep" />
                </div>
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <h4 className="font-montserrat font-bold text-xs text-charcoal-deep capitalize truncate">
                        {meal.meal_name}
                      </h4>
                      {meal.foods.length > 0 && (
                        <p className="text-[10px] text-charcoal-muted font-bold mt-0.5 leading-tight truncate">
                          {meal.foods.map((f) => foodField(f, "name")).filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                    {meal.meal_time && (
                      <span className="text-[9px] font-bold text-charcoal-muted shrink-0 bg-cream px-2 py-0.5 rounded">
                        {meal.meal_time}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-cream">
                    <span className="text-xs font-bold text-charcoal-deep font-montserrat">
                      {meal.total_calories ?? "—"} kcal
                    </span>
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {/* Download PDF */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleDownloadPDF}
        className="w-full border-2 border-charcoal-deep/15 hover:border-charcoal-deep text-charcoal-deep font-montserrat font-black text-xs uppercase tracking-widest py-3.5 px-6 rounded-full transition-all active:scale-[0.99] mt-2 flex items-center justify-center gap-2 cursor-pointer bg-white"
      >
        <Download className="w-4 h-4 stroke-[2.5]" />
        Download Diet PDF
      </motion.button>
    </div>
  )
}
