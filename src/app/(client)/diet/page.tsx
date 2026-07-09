"use client"

import { useState, useEffect } from "react"
import { motion } from "motion/react"
import { Apple, Download, Printer, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import toast from "react-hot-toast"
import { format } from "date-fns"
import jsPDF from "jspdf"

interface FoodItem {
  name: string
  portion: string
  calories: number
  protein: number
  carbs: number
  fats: number
}

interface MealJSON {
  meal_name: string
  meal_time?: string
  foods: FoodItem[]
}

interface DietPlan {
  id: string
  name: string
  description: string | null
  calories: number | null
  meals: MealJSON[]
  start_date: string | null
  end_date: string | null
  created_at: string
}

export default function DietPage() {
  const supabase = createClient()
  const [plan, setPlan] = useState<DietPlan | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchDietPlan() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // 1. Get client record
        const { data: clientData, error: clientErr } = await supabase
          .from("clients")
          .select("id")
          .eq("user_id", user.id)
          .single()

        if (clientErr || !clientData) {
          setIsLoading(false)
          return
        }

        // 2. Get latest diet plan
        const { data: planData, error: planErr } = await supabase
          .from("diet_plans")
          .select("*")
          .eq("client_id", clientData.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (planErr) throw planErr
        if (planData) {
          // Parse meals if it's a string, or use directly if object
          let parsedMeals: MealJSON[] = []
          if (typeof planData.meals === "string") {
            try {
              parsedMeals = JSON.parse(planData.meals)
            } catch {
              parsedMeals = []
            }
          } else if (Array.isArray(planData.meals)) {
            parsedMeals = planData.meals as unknown as MealJSON[]
          }
          setPlan({
            ...planData,
            meals: parsedMeals
          })
        }
      } catch (err) {
        console.error(err)
        toast.error("Failed to load diet plan")
      } finally {
        setIsLoading(false)
      }
    }
    fetchDietPlan()
  }, [supabase])

  const handleDownloadPDF = () => {
    if (!plan) return
    try {
      const doc = new jsPDF()
      
      // Page title
      doc.setFont("helvetica", "bold")
      doc.setFontSize(22)
      doc.text("AK FITNESS — DIET PLAN", 20, 20)
      
      doc.setFontSize(14)
      doc.setFont("helvetica", "normal")
      doc.text(`Plan Name: ${plan.name}`, 20, 30)
      if (plan.calories) {
        doc.text(`Daily Calorie Target: ${plan.calories} kcal`, 20, 38)
      }
      
      let y = 50
      plan.meals.forEach((meal) => {
        if (y > 250) {
          doc.addPage()
          y = 20
        }
        
        doc.setFont("helvetica", "bold")
        doc.setFontSize(14)
        doc.text(`${meal.meal_name.toUpperCase()} ${meal.meal_time ? `(${meal.meal_time})` : ""}`, 20, y)
        y += 8
        
        meal.foods.forEach((food) => {
          doc.setFont("helvetica", "normal")
          doc.setFontSize(11)
          const foodText = `- ${food.name} (${food.portion}): ${food.calories} kcal (P: ${food.protein}g, C: ${food.carbs}g, F: ${food.fats}g)`
          doc.text(foodText, 25, y)
          y += 6
        })
        y += 6
      })

      doc.save(`Diet_Plan_${plan.name.replace(/\s+/g, "_")}.pdf`)
      toast.success("PDF Downloaded!")
    } catch {
      toast.error("Failed to generate PDF")
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#FFB800]" />
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="size-16 rounded-full bg-[#FFB800]/10 flex items-center justify-center">
          <Apple className="size-8 text-[#FFB800]" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-white font-semibold text-lg">No active diet plan assigned</p>
          <p className="text-sm text-[#FFB800]/60">Your coach will set your diet plan soon</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-5 pb-24">
      {/* Header */}
      <div className="pt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Apple className="size-5 text-[#FFB800]" />
          <h1
            className="text-2xl font-bold text-white tracking-wide uppercase"
            style={{ fontFamily: "Bebas Neue, sans-serif" }}
          >
            Diet Plan
          </h1>
        </div>
        <button
          onClick={handleDownloadPDF}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#FFB800] text-black text-xs font-bold hover:bg-[#FFD200] transition-colors"
        >
          <Download className="size-3.5" />
          PDF
        </button>
      </div>

      {/* Plan Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#111111] border border-[rgba(255,184,0,0.25)] rounded-2xl p-5 space-y-3"
      >
        <div>
          <h2 className="text-xl font-bold text-white uppercase tracking-wider">{plan.name}</h2>
          {plan.description && <p className="text-[#A0A0A0] text-sm mt-1">{plan.description}</p>}
        </div>
        <div className="flex items-center gap-4 pt-2 border-t border-[#222222]">
          <div>
            <p className="text-[10px] text-[#555555] uppercase tracking-wider">Total Calories</p>
            <p className="text-2xl font-extrabold text-[#FFB800]">{plan.calories ?? "—"} kcal</p>
          </div>
        </div>
      </motion.div>

      {/* Meals List */}
      <div className="space-y-4">
        {plan.meals.map((meal, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-[#111111] border border-[#222222] rounded-2xl p-4 space-y-3 hover:border-[rgba(255,184,0,0.15)] transition-all"
          >
            <div className="flex items-center justify-between border-b border-[#222222] pb-2">
              <h3 className="text-white font-bold text-base capitalize">{meal.meal_name}</h3>
              {meal.meal_time && (
                <span className="text-[10px] bg-[#222222] text-[#A0A0A0] px-2 py-0.5 rounded-full">
                  {meal.meal_time}
                </span>
              )}
            </div>

            <div className="space-y-3">
              {meal.foods.map((food, fIdx) => (
                <div key={fIdx} className="flex justify-between items-start gap-4">
                  <div>
                    <p className="text-white text-sm font-medium">{food.name}</p>
                    <p className="text-[#555555] text-xs mt-0.5">{food.portion}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#FFB800] text-sm font-bold">{food.calories} kcal</p>
                    <p className="text-[#555555] text-[10px] mt-0.5">
                      P: {food.protein}g · C: {food.carbs}g · F: {food.fats}g
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
