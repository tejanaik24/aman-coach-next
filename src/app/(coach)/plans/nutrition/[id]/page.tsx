"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { Apple, Plus, X, ArrowLeft, Trash2, Coffee, Soup, Flame } from "lucide-react"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"
import type { NutritionPlan, Meal } from "@/types"

interface FoodItem {
  name: string
  quantity?: string
  calories?: number
}

const inputClass =
  "w-full bg-cream focus:bg-white border-2 border-transparent focus:border-lime-electric rounded-input h-14 px-4 text-charcoal-deep outline-none transition-all placeholder:text-charcoal-muted/50 text-sm font-semibold shadow-inner"

const smallInputClass =
  "w-full bg-cream focus:bg-white border-2 border-transparent focus:border-lime-electric rounded-input h-11 px-3 text-charcoal-deep outline-none transition-all placeholder:text-charcoal-muted/50 text-xs font-semibold shadow-inner"

function mealIcon(mealName: string) {
  const n = mealName.toLowerCase()
  if (n.includes("breakfast")) return Coffee
  if (n.includes("dinner")) return Flame
  return Soup
}

function Skeleton() {
  return (
    <div className="px-5 pt-2 space-y-4 bg-cream min-h-full">
      <div className="h-6 w-40 bg-white rounded-card-mobile animate-pulse" />
      <div className="grid grid-cols-4 gap-2.5">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-[85px] bg-white rounded-2xl shadow-bento animate-pulse" />)}</div>
      <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-white rounded-card-mobile shadow-bento animate-pulse" />)}</div>
    </div>
  )
}

export default function NutritionPlanBuilderPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [plan, setPlan] = useState<NutritionPlan | null>(null)
  const [clientName, setClientName] = useState("")
  const [meals, setMeals] = useState<Meal[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Add/edit meal modal
  const [showMealModal, setShowMealModal] = useState(false)
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null)
  const [mealName, setMealName] = useState("")
  const [mealTime, setMealTime] = useState("")
  const [mealCalories, setMealCalories] = useState("")
  const [foods, setFoods] = useState<FoodItem[]>([])

  const fetchData = useCallback(async () => {
    try {
      const { data: planData, error: planErr } = await supabase
        .from("nutrition_plans")
        .select("*")
        .eq("id", id)
        .single()
      if (planErr || !planData) { toast.error("Plan not found"); router.replace("/plans"); return }
      setPlan(planData as NutritionPlan)

      const { data: clientData } = await supabase
        .from("clients")
        .select("user_id")
        .eq("id", planData.client_id)
        .single()
      if (clientData?.user_id) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", clientData.user_id)
          .single()
        if (profileData) setClientName(profileData.name)
      }

      const { data: mealsData } = await supabase
        .from("meals")
        .select("*")
        .eq("plan_id", id)
        .order("order_index", { ascending: true })
      setMeals((mealsData ?? []) as Meal[])
    } finally {
      setIsLoading(false)
    }
  }, [id, supabase, router])

  useEffect(() => { fetchData() }, [fetchData])

  function openAddMeal() {
    setEditingMeal(null)
    setMealName("")
    setMealTime("")
    setMealCalories("")
    setFoods([{ name: "", quantity: "", calories: undefined }])
    setShowMealModal(true)
  }

  function openEditMeal(meal: Meal) {
    setEditingMeal(meal)
    setMealName(meal.meal_name)
    setMealTime(meal.meal_time ?? "")
    setMealCalories(meal.total_calories?.toString() ?? "")
    const parsed = (meal.foods as unknown as FoodItem[]) ?? []
    setFoods(parsed.length > 0 ? parsed : [{ name: "", quantity: "", calories: undefined }])
    setShowMealModal(true)
  }

  function updateFood(index: number, field: keyof FoodItem, value: string | number | undefined) {
    setFoods((prev) => prev.map((f, i) => i === index ? { ...f, [field]: value } : f))
  }

  function addFoodRow() {
    setFoods((prev) => [...prev, { name: "", quantity: "", calories: undefined }])
  }

  function removeFoodRow(index: number) {
    setFoods((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSaveMeal() {
    if (!mealName.trim()) { toast.error("Enter a meal name"); return }
    const validFoods = foods.filter((f) => f.name.trim())
    const totalCals = mealCalories ? Number(mealCalories) : validFoods.reduce((sum, f) => sum + (f.calories ?? 0), 0)

    const payload = {
      plan_id: id,
      meal_name: mealName.trim(),
      meal_time: mealTime.trim() || null,
      foods: validFoods,
      total_calories: totalCals || null,
      order_index: editingMeal ? editingMeal.order_index : meals.length,
    }

    if (editingMeal) {
      const { error } = await supabase.from("meals").update(payload).eq("id", editingMeal.id)
      if (error) { toast.error("Failed to update meal"); return }
      toast.success("Meal updated")
    } else {
      const { error } = await supabase.from("meals").insert(payload)
      if (error) { toast.error("Failed to add meal"); return }
      toast.success("Meal added")
    }
    setShowMealModal(false)
    fetchData()
  }

  async function handleDeleteMeal(mealId: string) {
    if (!confirm("Delete this meal?")) return
    const { error } = await supabase.from("meals").delete().eq("id", mealId)
    if (error) { toast.error("Failed to delete meal"); return }
    toast.success("Meal deleted")
    fetchData()
  }

  if (isLoading) return <Skeleton />

  const macros = [
    { label: "Calories", value: plan?.total_calories ?? "—", unit: "kcal", highlight: false },
    { label: "Protein", value: plan?.protein_g ?? "—", unit: "g", highlight: true },
    { label: "Carbs", value: plan?.carbs_g ?? "—", unit: "g", highlight: false },
    { label: "Fats", value: plan?.fats_g ?? "—", unit: "g", highlight: false },
  ]

  return (
    <div className="px-5 pt-2 flex flex-col gap-6 bg-cream min-h-full pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/plans")} className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0">
          <ArrowLeft className="w-4 h-4 text-charcoal-deep" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="font-montserrat font-black text-lg text-charcoal-deep leading-tight truncate">Diet Plan</h2>
          <p className="text-[10px] text-charcoal-muted font-semibold mt-0.5">{clientName || "Unknown"}</p>
        </div>
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

      {/* Add Meal button */}
      <button onClick={openAddMeal}
        className="w-full h-12 rounded-full bg-lime-tint border border-lime-electric/30 text-charcoal-deep font-montserrat font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm">
        <Plus className="w-4 h-4" /> Add Meal
      </button>

      {/* Meals List */}
      <div className="flex flex-col gap-4">
        {meals.length === 0 ? (
          <div className="bg-white rounded-card-mobile shadow-bento py-16 flex flex-col items-center gap-3">
            <Apple className="size-10 text-charcoal-muted/30" />
            <p className="text-charcoal-muted text-xs font-medium">No meals yet. Add one above.</p>
          </div>
        ) : (
          meals.map((meal) => {
            const MealIcon = mealIcon(meal.meal_name)
            const foodsList = (meal.foods as unknown as FoodItem[]) ?? []
            return (
              <motion.div key={meal.id} whileTap={{ scale: 0.98 }} className="bg-white rounded-card-mobile p-4 shadow-bento flex gap-3">
                <div className="w-14 h-14 rounded-xl bg-lime-tint flex items-center justify-center shrink-0">
                  <MealIcon className="w-5 h-5 text-charcoal-deep" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-montserrat font-bold text-xs text-charcoal-deep capitalize truncate">{meal.meal_name}</h4>
                      {foodsList.length > 0 && (
                        <p className="text-[10px] text-charcoal-muted font-medium mt-0.5 leading-tight truncate">
                          {foodsList.map((f) => f.name).filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {meal.meal_time && <span className="text-[9px] font-bold text-charcoal-muted bg-cream px-2 py-0.5 rounded">{meal.meal_time}</span>}
                      <button onClick={() => openEditMeal(meal)} className="w-7 h-7 rounded-full bg-cream flex items-center justify-center text-charcoal-muted">
                        <span className="text-[9px] font-bold">Edit</span>
                      </button>
                      <button onClick={() => handleDeleteMeal(meal.id)} className="w-7 h-7 rounded-full bg-cream flex items-center justify-center text-red-400">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-cream">
                    <span className="text-[10px] font-bold text-charcoal-deep">{meal.total_calories ?? "—"} kcal</span>
                    <span className="text-[9px] text-charcoal-muted">{foodsList.length} food{foodsList.length === 1 ? "" : "s"}</span>
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {/* Add/Edit Meal Modal */}
      <AnimatePresence>
        {showMealModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-charcoal-deep/60 z-50" onClick={() => setShowMealModal(false)} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-cream rounded-t-3xl z-50 max-h-[85vh] flex flex-col"
            >
              <div className="flex justify-center pt-3 pb-1"><div className="w-12 h-1 rounded-full bg-charcoal-deep/20" /></div>
              <div className="flex items-center justify-between px-5 py-3">
                <h3 className="font-montserrat font-black text-lg text-charcoal-deep">{editingMeal ? "Edit Meal" : "Add Meal"}</h3>
                <button onClick={() => setShowMealModal(false)} className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-charcoal-muted shadow-sm"><X className="size-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-charcoal-deep uppercase tracking-wide mb-1.5 block">Meal Name *</label>
                  <input value={mealName} onChange={(e) => setMealName(e.target.value)} placeholder="e.g. Breakfast" className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[9px] font-bold text-charcoal-deep uppercase tracking-wide mb-1 block">Time</label>
                    <input value={mealTime} onChange={(e) => setMealTime(e.target.value)} placeholder="e.g. 8:00 AM" className={smallInputClass} />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-charcoal-deep uppercase tracking-wide mb-1 block">Total Calories</label>
                    <input type="number" value={mealCalories} onChange={(e) => setMealCalories(e.target.value)} placeholder="auto-calc if blank" className={smallInputClass} />
                  </div>
                </div>

                {/* Food items */}
                <div>
                  <label className="text-[10px] font-bold text-charcoal-deep uppercase tracking-wide mb-2 block">Food Items</label>
                  <div className="space-y-2.5">
                    {foods.map((food, i) => (
                      <div key={i} className="bg-white rounded-card-mobile p-3 shadow-sm space-y-2">
                        <div className="flex items-center gap-2">
                          <input value={food.name} onChange={(e) => updateFood(i, "name", e.target.value)} placeholder="Food name" className="flex-1 bg-cream focus:bg-white border-2 border-transparent focus:border-lime-electric rounded-lg h-10 px-3 text-xs font-semibold outline-none" />
                          {foods.length > 1 && (
                            <button onClick={() => removeFoodRow(i)} className="w-8 h-8 rounded-full bg-cream flex items-center justify-center text-red-400 shrink-0">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input value={food.quantity ?? ""} onChange={(e) => updateFood(i, "quantity", e.target.value)} placeholder="Qty (e.g. 100g)" className="bg-cream focus:bg-white border-2 border-transparent focus:border-lime-electric rounded-lg h-9 px-3 text-[10px] font-semibold outline-none" />
                          <input type="number" value={food.calories ?? ""} onChange={(e) => updateFood(i, "calories", e.target.value ? Number(e.target.value) : undefined)} placeholder="kcal" className="bg-cream focus:bg-white border-2 border-transparent focus:border-lime-electric rounded-lg h-9 px-3 text-[10px] font-semibold outline-none" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={addFoodRow} className="mt-2 text-[10px] font-bold text-lime-electric uppercase tracking-wider">+ Add Food</button>
                </div>

                <motion.button whileTap={{ scale: 0.97 }} onClick={handleSaveMeal}
                  className="w-full h-14 rounded-full bg-lime-electric text-charcoal-deep font-montserrat font-black text-xs uppercase tracking-widest shadow-bento mt-2">
                  {editingMeal ? "Update Meal" : "Add Meal"}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
