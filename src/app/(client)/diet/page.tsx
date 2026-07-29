"use client"

import { useState, useEffect } from "react"
import { motion } from "motion/react"
import { Apple, Download, Coffee, Soup, Flame } from "lucide-react"
import { format } from "date-fns"
import toast from "react-hot-toast"
import jsPDF from "jspdf"
import { createClient } from "@/lib/supabase/client"
import { useStaggerReveal } from "@/hooks/useStaggerReveal"
import KineticText from "@/components/ui/KineticText"
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
    <div className="px-5 pt-2 space-y-5 bg-bg-primary min-h-full">
      <div className="h-7 w-40 bg-bg-card rounded-2xl skeleton-pulse" />
      <div className="grid grid-cols-4 gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[85px] bg-bg-card rounded-2xl skeleton-pulse" />
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-bg-card rounded-2xl skeleton-pulse" />
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

  const macroRef = useStaggerReveal<HTMLDivElement>([isLoading])
  const mealsRef = useStaggerReveal<HTMLDivElement>([isLoading])

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
      <div className="px-5 flex flex-col items-center justify-center min-h-[60vh] space-y-4 bg-bg-primary">
        <div className="size-16 rounded-full bg-accent-orange/10 border border-accent-orange/30 flex items-center justify-center">
          <Apple className="size-8 text-accent-orange" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-text-primary font-heading font-bold text-lg">No diet plan assigned</p>
          <p className="text-sm text-text-muted">Your coach will set your nutrition targets soon</p>
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

  const planLabel = plan.notes || "Diet Plan"
  const planLabelFontSize = planLabel.length <= 10 ? 26 : planLabel.length <= 16 ? 22 : planLabel.length <= 24 ? 18 : 15

  return (
    <div className="px-5 pt-2 flex flex-col gap-6 bg-bg-primary min-h-full pb-4">
      {/* HERO — same cinematic language as home/workout: warm charcoal/brown base,
          single orange halo, bloom-spill, grain, full-bleed photo layer. */}
      <div
        className="relative rounded-[32px] overflow-hidden"
        style={{
          height: "300px",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 0 1px rgba(255,106,26,0.16), 0 30px 60px -20px rgba(0,0,0,0.65), 0 0 40px -10px rgba(255,106,26,0.12)",
        }}
      >
        <img
          src="/images/backgrounds/box-nutrition.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover animate-breathe"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(100deg, #0A0705 0%, rgba(20,13,6,0.55) 25%, rgba(28,17,8,0.22) 50%, rgba(36,23,8,0.06) 72%, transparent 92%), linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.3) 100%)",
          }}
        />

        <div className="absolute -top-20 -left-20 w-[340px] h-[340px] rounded-full radial-orange-ambient opacity-70" />
        <div
          className="absolute rounded-full pointer-events-none animate-halo-pulse"
          style={{
            width: "460px",
            height: "460px",
            right: "-140px",
            top: "-100px",
            background: "radial-gradient(circle, rgba(255,120,40,0.22) 0%, transparent 66%)",
            filter: "blur(65px)",
          }}
        />

        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            backgroundSize: "120px 120px",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ boxShadow: "inset 0 0 70px 10px rgba(0,0,0,0.28)" }}
        />

        <div className="relative z-20 px-5 pt-6 max-w-[60%]">
          <span className="text-accent-orange text-[11px] font-bold uppercase tracking-[0.25em]">
            Active Nutrition
          </span>
          <div className="mt-1">
            <KineticText
              text={planLabel}
              fontSize={planLabelFontSize}
              delay={0.15}
              className="font-heading font-extrabold text-white leading-tight"
            />
          </div>
        </div>
      </div>

      {/* Macro Bento Grid */}
      <div ref={macroRef} className="grid grid-cols-4 gap-2.5 select-none">
        {macros.map((macro) => (
          <div
            key={macro.label}
            className={`reveal-item p-3 rounded-2xl backdrop-blur-xl border flex flex-col justify-between h-[85px] ${
              macro.highlight
                ? "bg-accent-orange/10 border-accent-orange/40 shadow-[0_0_24px_rgba(255,106,26,0.15)]"
                : "bg-bg-card/80 border-border-subtle"
            }`}
          >
            <span className={`text-[9px] font-bold uppercase tracking-wider ${macro.highlight ? "text-accent-orange" : "text-text-muted"}`}>
              {macro.label}
            </span>
            <div className="flex flex-col mt-1">
              <span className={`font-heading font-bold text-lg leading-none ${macro.highlight ? "text-accent-orange" : "text-text-primary"}`}>{macro.value}</span>
              <span className="text-[9px] font-bold uppercase mt-0.5 text-text-muted">{macro.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Meals List */}
      <div className="flex flex-col gap-4">
        <h3 className="font-heading font-bold text-xs text-text-primary uppercase tracking-widest mb-1">
          Meal Plan
        </h3>

        {meals.length === 0 ? (
          <div className="bg-bg-card/80 border border-border-subtle backdrop-blur-xl rounded-2xl p-8 flex flex-col items-center gap-2">
            <Apple className="size-8 text-text-muted/50" />
            <p className="text-text-muted text-xs font-medium">No meals configured yet</p>
          </div>
        ) : (
          <div ref={mealsRef} className="flex flex-col gap-4">
            {meals.map((meal) => {
              const MealIcon = mealIcon(meal.meal_name)
              return (
                <motion.div
                  key={meal.id}
                  whileTap={{ scale: 0.98 }}
                  className="reveal-item bg-bg-card/80 border border-border-subtle backdrop-blur-xl rounded-2xl p-4 flex gap-3 cursor-pointer hover:border-accent-orange/40 transition-colors duration-300"
                >
                  <div className="w-16 h-16 rounded-xl bg-accent-orange/10 border border-accent-orange/30 flex items-center justify-center shrink-0">
                    <MealIcon className="w-6 h-6 text-accent-orange" />
                  </div>
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <h4 className="font-heading font-bold text-xs text-text-primary capitalize truncate">
                          {meal.meal_name}
                        </h4>
                        {meal.foods.length > 0 && (
                          <p className="text-[10px] text-text-muted font-bold mt-0.5 leading-tight truncate">
                            {meal.foods.map((f) => foodField(f, "name")).filter(Boolean).join(", ")}
                          </p>
                        )}
                      </div>
                      {meal.meal_time && (
                        <span className="text-[9px] font-bold text-text-muted shrink-0 bg-bg-elevated px-2 py-0.5 rounded">
                          {meal.meal_time}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-border-subtle">
                      <span className="text-xs font-bold text-text-primary font-heading">
                        {meal.total_calories ?? "—"} kcal
                      </span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Download PDF */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleDownloadPDF}
        className="w-full border border-accent-orange/40 hover:border-accent-orange text-accent-orange font-heading font-bold text-xs uppercase tracking-widest py-3.5 px-6 rounded-full transition-all active:scale-[0.99] mt-2 flex items-center justify-center gap-2 cursor-pointer bg-bg-card/80 backdrop-blur-xl"
      >
        <Download className="w-4 h-4 stroke-[2.5]" />
        Download Diet PDF
      </motion.button>
    </div>
  )
}
