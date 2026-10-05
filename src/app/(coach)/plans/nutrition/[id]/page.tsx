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
  "w-full bg-[#1A1A1A] focus:bg-[#222222] border border-[#333333] focus:border-[#FFB800] rounded-xl h-14 px-4 text-white outline-none transition-all placeholder:text-zinc-500 text-sm font-semibold shadow-inner"

const smallInputClass =
  "w-full bg-[#1A1A1A] focus:bg-[#222222] border border-[#333333] focus:border-[#FFB800] rounded-xl h-11 px-3 text-white outline-none transition-all placeholder:text-zinc-500 text-xs font-semibold shadow-inner"

function mealIcon(mealName: string) {
  const n = mealName.toLowerCase()
  if (n.includes("breakfast")) return Coffee
  if (n.includes("dinner")) return Flame
  return Soup
}

function Skeleton() {
  return (
    <div className="px-5 pt-4 space-y-4 bg-bg-primary min-h-screen">
      <div className="h-6 w-40 bg-zinc-800 rounded-lg animate-pulse" />
      <div className="grid grid-cols-4 gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[85px] bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse" />
        ))}
      </div>
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
      if (id === "demo" || id.startsWith("demo")) {
        setPlan({
          id: "demo",
          client_id: "demo-client",
          coach_id: "coach-demo",
          total_calories: 2400,
          protein_g: 190,
          carbs_g: 250,
          fats_g: 65,
          is_active: true,
          notes: "High protein, moderate carb timing around workouts",
          created_at: new Date().toISOString(),
        })
        setClientName("Rahul Sharma")
        setMeals([
          {
            id: "meal-1",
            plan_id: "demo",
            meal_name: "Meal 1: Breakfast / Pre-Workout",
            meal_time: "08:30 AM",
            total_calories: 650,
            order_index: 0,
            foods: [
              { name: "Oats with Whey Isolate", amount: "80g + 1 Scoop", protein: 35, carbs: 55, fats: 8 },
              { name: "Whole Eggs (Omelette)", amount: "2 whole + 2 whites", protein: 18, carbs: 2, fats: 10 },
            ]
          },
          {
            id: "meal-2",
            plan_id: "demo",
            meal_name: "Meal 2: Post-Workout Lunch",
            meal_time: "01:30 PM",
            total_calories: 750,
            order_index: 1,
            foods: [
              { name: "Grilled Chicken Breast", amount: "200g", protein: 52, carbs: 0, fats: 5 },
              { name: "Steamed White Basmati Rice", amount: "150g (cooked)", protein: 4, carbs: 42, fats: 1 },
              { name: "Mixed Green Salad with Olive Oil", amount: "1 bowl + 5ml oil", protein: 2, carbs: 6, fats: 5 },
            ]
          }
        ])
        return
      }

      const { data: planData, error: planErr } = await supabase
        .from("nutrition_plans")
        .select("*")
        .eq("id", id)
        .single()
      if (planErr || !planData) { toast.error("Plan not found"); router.replace("/plans/builder"); return }
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
    <div className="px-5 pt-4 flex flex-col gap-6 bg-bg-primary min-h-screen pb-32 text-white">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/plans/builder")}
          className="w-9 h-9 rounded-full bg-zinc-850 hover:bg-zinc-800 border border-zinc-700/60 flex items-center justify-center shrink-0 text-white cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading font-bold text-xl text-white leading-tight truncate">Diet Plan</h2>
          <p className="text-xs text-zinc-400 font-semibold mt-0.5">{clientName || "Unknown"}</p>
        </div>
      </div>

      {/* Macro Bento Grid */}
      <div className="grid grid-cols-4 gap-2.5 select-none">
        {macros.map((macro) => (
          <div
            key={macro.label}
            className={`p-3 rounded-2xl border flex flex-col justify-between h-[85px] transition-all ${
              macro.highlight
                ? "bg-[#FFB800]/15 border-[#FFB800]/40 text-[#FFB800]"
                : "bg-zinc-900/90 border-zinc-800 text-white"
            }`}
          >
            <span className={`text-[9px] font-bold uppercase tracking-wider ${macro.highlight ? "text-[#FFB800]" : "text-zinc-400"}`}>
              {macro.label}
            </span>
            <div className="flex flex-col mt-1">
              <span className="font-heading font-bold text-xl leading-none text-white">{macro.value}</span>
              <span className="text-[9px] font-bold uppercase mt-0.5 text-zinc-400">{macro.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Meal button */}
      <button
        onClick={openAddMeal}
        className="w-full h-12 rounded-full bg-[#FFB800] hover:bg-[#E5A600] text-black font-heading font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-md cursor-pointer transition-colors"
      >
        <Plus className="w-4 h-4" /> Add Meal
      </button>

      {/* Meals List */}
      <div className="flex flex-col gap-4">
        {meals.length === 0 ? (
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl py-16 flex flex-col items-center gap-3">
            <Apple className="size-10 text-zinc-600" />
            <p className="text-zinc-400 text-xs font-medium">No meals yet. Add one above.</p>
          </div>
        ) : (
          meals.map((meal) => {
            const MealIcon = mealIcon(meal.meal_name)
            const foodsList = (meal.foods as unknown as FoodItem[]) ?? []
            return (
              <motion.div key={meal.id} whileTap={{ scale: 0.98 }} className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-4 flex gap-3 shadow-lg">
                <div className="w-14 h-14 rounded-xl bg-[#FFB800]/15 border border-[#FFB800]/30 flex items-center justify-center shrink-0">
                  <MealIcon className="w-6 h-6 text-[#FFB800]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-heading font-bold text-sm text-white capitalize truncate">{meal.meal_name}</h4>
                      {foodsList.length > 0 && (
                        <p className="text-[11px] text-zinc-400 font-medium mt-0.5 leading-tight truncate">
                          {foodsList.map((f) => f.name).filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {meal.meal_time && <span className="text-[10px] font-bold text-[#FFB800] bg-[#FFB800]/10 border border-[#FFB800]/25 px-2 py-0.5 rounded-full">{meal.meal_time}</span>}
                      <button onClick={() => openEditMeal(meal)} className="px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold cursor-pointer transition-colors">
                        Edit
                      </button>
                      <button onClick={() => handleDeleteMeal(meal.id)} className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-red-950/60 flex items-center justify-center text-red-400 cursor-pointer transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-zinc-800/80">
                    <span className="text-xs font-bold text-[#FFB800]">{meal.total_calories ?? "—"} kcal</span>
                    <span className="text-[10px] text-zinc-400">{foodsList.length} food{foodsList.length === 1 ? "" : "s"}</span>
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm" onClick={() => setShowMealModal(false)} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#141414] border-t border-zinc-800 rounded-t-3xl z-50 max-h-[85vh] flex flex-col text-white shadow-2xl"
            >
              <div className="flex justify-center pt-3 pb-1"><div className="w-12 h-1 rounded-full bg-zinc-700" /></div>
              <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/80">
                <h3 className="font-heading font-bold text-lg text-white">{editingMeal ? "Edit Meal" : "Add Meal"}</h3>
                <button onClick={() => setShowMealModal(false)} className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 cursor-pointer"><X className="size-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 pb-32 space-y-4 pt-3">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1.5 block">Meal Name *</label>
                  <input value={mealName} onChange={(e) => setMealName(e.target.value)} placeholder="e.g. Breakfast" className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide mb-1 block">Time</label>
                    <input value={mealTime} onChange={(e) => setMealTime(e.target.value)} placeholder="e.g. 8:00 AM" className={smallInputClass} />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide mb-1 block">Total Calories</label>
                    <input type="number" value={mealCalories} onChange={(e) => setMealCalories(e.target.value)} placeholder="auto-calc if blank" className={smallInputClass} />
                  </div>
                </div>

                {/* Food items */}
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-2 block">Food Items</label>
                  <div className="space-y-2.5">
                    {foods.map((food, i) => (
                      <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <input value={food.name} onChange={(e) => updateFood(i, "name", e.target.value)} placeholder="Food name" className="flex-1 bg-[#1A1A1A] focus:bg-[#222222] border border-zinc-700 focus:border-[#FFB800] rounded-lg h-10 px-3 text-xs font-semibold text-white outline-none" />
                          {foods.length > 1 && (
                            <button onClick={() => removeFoodRow(i)} className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-red-950 flex items-center justify-center text-red-400 shrink-0 cursor-pointer">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input value={food.quantity ?? ""} onChange={(e) => updateFood(i, "quantity", e.target.value)} placeholder="Qty (e.g. 100g)" className="bg-[#1A1A1A] focus:bg-[#222222] border border-zinc-700 focus:border-[#FFB800] rounded-lg h-9 px-3 text-[11px] font-semibold text-white outline-none" />
                          <input type="number" value={food.calories ?? ""} onChange={(e) => updateFood(i, "calories", e.target.value ? Number(e.target.value) : undefined)} placeholder="kcal" className="bg-[#1A1A1A] focus:bg-[#222222] border border-zinc-700 focus:border-[#FFB800] rounded-lg h-9 px-3 text-[11px] font-semibold text-white outline-none" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={addFoodRow} className="mt-2 text-xs font-bold text-[#FFB800] hover:text-[#E5A600] uppercase tracking-wider cursor-pointer">+ Add Food</button>
                </div>

                <motion.button whileTap={{ scale: 0.97 }} onClick={handleSaveMeal}
                  className="w-full h-14 rounded-full bg-[#FFB800] hover:bg-[#E5A600] text-black font-heading font-bold text-xs uppercase tracking-widest shadow-lg mt-4 cursor-pointer">
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
