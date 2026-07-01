"use client"

import { useState, useEffect } from "react"
import { motion } from "motion/react"
import { Apple } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Client, NutritionPlan } from "@/types"

function MacroBar({
  label,
  grams,
  totalCalories,
  color,
  calsPerGram,
}: {
  label: string
  grams: number | null
  totalCalories: number | null
  color: string
  calsPerGram: number
}) {
  const pct =
    grams !== null && totalCalories && totalCalories > 0
      ? Math.min(Math.round(((grams * calsPerGram) / totalCalories) * 100), 100)
      : 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[#A0A0A0]">{label}</span>
        <span className="font-semibold" style={{ color }}>
          {grams ?? "—"}g
          {pct > 0 && <span className="text-[#555555] font-normal ml-1">({pct}%)</span>}
        </span>
      </div>
      <div className="h-2 rounded-full bg-[#222222] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function NutritionSkeleton() {
  return (
    <div className="p-4 space-y-5 animate-pulse">
      <div className="h-7 w-40 bg-[#222222] rounded-xl" />
      <div className="bg-[#161616] border border-[#222222] rounded-2xl p-5 space-y-5">
        <div className="h-16 w-32 bg-[#222222] rounded-xl mx-auto" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <div className="h-3 w-16 bg-[#222222] rounded" />
                <div className="h-3 w-12 bg-[#222222] rounded" />
              </div>
              <div className="h-2 w-full bg-[#222222] rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function NutritionPage() {
  const supabase = createClient()

  const [plan, setPlan] = useState<NutritionPlan | null>(null)
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
        setPlan(planData as NutritionPlan)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  if (isLoading) return <NutritionSkeleton />

  if (hasNoPlan || !plan) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="size-16 rounded-full bg-[#C9A84C]/10 flex items-center justify-center">
          <Apple className="size-8 text-[#C9A84C]" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-white font-semibold text-lg">No nutrition plan assigned</p>
          <p className="text-sm text-[#C9A84C]">Your coach will set your nutrition targets soon</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-5">
      {/* Header */}
      <div className="pt-2 flex items-center gap-2">
        <Apple className="size-5 text-[#C9A84C]" />
        <h1
          className="text-xl font-bold text-white"
          style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}
        >
          Nutrition Plan
        </h1>
      </div>

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#161616] border border-[#222222] rounded-2xl p-5 space-y-5"
      >
        {/* Total calories */}
        <div className="text-center py-2">
          <p className="text-xs text-[#555555] uppercase tracking-widest mb-1">Daily Target</p>
          <p className="text-5xl font-bold text-white">
            {plan.total_calories ?? "—"}
          </p>
          <p className="text-sm text-[#A0A0A0] mt-1">calories</p>
        </div>

        {/* Divider */}
        <div className="border-t border-[#222222]" />

        {/* Macro bars */}
        <div className="space-y-1">
          <p className="text-xs text-[#555555] uppercase tracking-widest mb-3">
            Today&apos;s Targets
          </p>
          <div className="space-y-4">
            <MacroBar
              label="Protein"
              grams={plan.protein_g}
              totalCalories={plan.total_calories}
              color="#C9A84C"
              calsPerGram={4}
            />
            <MacroBar
              label="Carbohydrates"
              grams={plan.carbs_g}
              totalCalories={plan.total_calories}
              color="#3b82f6"
              calsPerGram={4}
            />
            <MacroBar
              label="Fats"
              grams={plan.fats_g}
              totalCalories={plan.total_calories}
              color="#f97316"
              calsPerGram={9}
            />
          </div>
        </div>

        {/* Macro summary pills */}
        <div className="flex gap-2">
          <div className="flex-1 bg-[#111111] border border-[#222222] rounded-xl p-3 text-center">
            <p className="text-[#C9A84C] font-bold">{plan.protein_g ?? "—"}g</p>
            <p className="text-[#555555] text-xs mt-0.5">Protein</p>
          </div>
          <div className="flex-1 bg-[#111111] border border-[#222222] rounded-xl p-3 text-center">
            <p className="text-[#3b82f6] font-bold">{plan.carbs_g ?? "—"}g</p>
            <p className="text-[#555555] text-xs mt-0.5">Carbs</p>
          </div>
          <div className="flex-1 bg-[#111111] border border-[#222222] rounded-xl p-3 text-center">
            <p className="text-[#f97316] font-bold">{plan.fats_g ?? "—"}g</p>
            <p className="text-[#555555] text-xs mt-0.5">Fats</p>
          </div>
        </div>
      </motion.div>

      {/* Coach notes */}
      {plan.notes && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#161616] border border-[#222222] rounded-2xl p-5 space-y-2"
        >
          <p className="text-xs text-[#555555] uppercase tracking-widest">Coach Notes</p>
          <p className="text-sm text-[#A0A0A0] leading-relaxed">{plan.notes}</p>
        </motion.div>
      )}
    </div>
  )
}
