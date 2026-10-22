"use client"

import { useState, useMemo } from "react"
import { Search, Plus, X, Check, Utensils, Sparkles } from "lucide-react"
import { plain, type LibraryItem } from "@/lib/plan/types"

interface Props {
  isOpen: boolean
  onClose: () => void
  library: LibraryItem[]
  onPickFood: (foodText: string) => void
  onSaveToLibrary?: (name: string) => void
}

const STARTER_FOODS = [
  // Proteins
  { name: "Chicken Breast (Raw Weight)", cat: "protein", defaultQty: "150g" },
  { name: "Whole Eggs", cat: "protein", defaultQty: "2" },
  { name: "Egg Whites", cat: "protein", defaultQty: "5" },
  { name: "Whey Protein Isolate", cat: "protein", defaultQty: "1 scoop" },
  { name: "Low Fat Paneer", cat: "protein", defaultQty: "100g" },
  { name: "Fish / Rohu / Tilapia", cat: "protein", defaultQty: "150g" },
  { name: "Soya Chunks", cat: "protein", defaultQty: "50g" },
  { name: "Tofu", cat: "protein", defaultQty: "100g" },
  // Carbs
  { name: "Rolled Oats", cat: "carbs", defaultQty: "50g" },
  { name: "Boiled White Rice", cat: "carbs", defaultQty: "150g" },
  { name: "Boiled Brown Rice", cat: "carbs", defaultQty: "150g" },
  { name: "Boiled Sweet Potato", cat: "carbs", defaultQty: "150g" },
  { name: "Whole Wheat Roti", cat: "carbs", defaultQty: "2" },
  { name: "Multigrain Bread Slice", cat: "carbs", defaultQty: "2 slices" },
  { name: "Banana", cat: "carbs", defaultQty: "1 medium" },
  { name: "Cream of Rice", cat: "carbs", defaultQty: "50g" },
  // Fats & Dairy
  { name: "Almonds", cat: "fats", defaultQty: "10" },
  { name: "Walnuts", cat: "fats", defaultQty: "4 halves" },
  { name: "Peanut Butter", cat: "fats", defaultQty: "1 tbsp" },
  { name: "Extra Virgin Olive Oil", cat: "fats", defaultQty: "1 tsp" },
  { name: "Desi Ghee", cat: "fats", defaultQty: "1 tsp" },
  { name: "Skimmed Milk", cat: "dairy", defaultQty: "200ml" },
  { name: "Low Fat Curd / Dahi", cat: "dairy", defaultQty: "150g" },
  { name: "Greek Yogurt", cat: "dairy", defaultQty: "100g" },
  // Supplements
  { name: "Omega 3 Fish Oil", cat: "supplements", defaultQty: "1 capsule" },
  { name: "Multivitamin", cat: "supplements", defaultQty: "1 tablet" },
  { name: "Vitamin D3", cat: "supplements", defaultQty: "1 capsule" },
  { name: "Creatine Monohydrate", cat: "supplements", defaultQty: "5g" },
]

const CATEGORIES = [
  { k: "all", label: "All" },
  { k: "protein", label: "Proteins" },
  { k: "carbs", label: "Carbs" },
  { k: "fats", label: "Fats" },
  { k: "dairy", label: "Dairy" },
  { k: "supplements", label: "Supplements" },
]

export default function QuickFoodPickerSheet({
  isOpen,
  onClose,
  library,
  onPickFood,
  onSaveToLibrary,
}: Props) {
  const [search, setSearch] = useState("")
  const [cat, setCat] = useState("all")
  const [customName, setCustomName] = useState("")

  const foods = useMemo(() => {
    // Combine Aman's library items + starter foods
    const libFoods = library
      .filter((i) => i.kind === "food" || i.kind === "supplement")
      .map((i) => ({
        name: i.name,
        cat: i.kind === "supplement" ? "supplements" : "all",
        defaultQty: "",
      }))

    const combined = [...STARTER_FOODS]
    for (const lf of libFoods) {
      if (!combined.some((c) => c.name.toLowerCase() === lf.name.toLowerCase())) {
        combined.push(lf)
      }
    }

    const q = search.toLowerCase().trim()
    return combined.filter((f) => {
      if (cat !== "all" && f.cat !== cat && f.cat !== "all") return false
      if (!q) return true
      return f.name.toLowerCase().includes(q)
    })
  }, [library, search, cat])

  if (!isOpen) return null

  function handleSelect(f: { name: string; defaultQty: string }) {
    const text = f.defaultQty ? `${f.defaultQty} ${f.name}` : f.name
    onPickFood(text)
    onClose()
  }

  function handleAddCustom() {
    const trimmed = customName.trim()
    if (!trimmed) return
    onPickFood(trimmed)
    onSaveToLibrary?.(trimmed)
    setCustomName("")
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-bg-card border-t sm:border border-border-subtle p-5 pb-8 space-y-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-heading italic text-2xl">Pick Food</h3>
            <p className="text-text-muted text-xs">Tap any food to add with standard portion</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="size-10 rounded-full bg-white/5 flex items-center justify-center text-text-muted hover:text-white cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative shrink-0">
          <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chicken, eggs, rice, oats..."
            autoFocus
            className="w-full h-12 pl-10 pr-4 rounded-2xl bg-[#1A1A1A] border border-[#333333] text-white text-sm outline-none focus:border-[#C9A84C]"
          />
        </div>

        {/* Category Chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar shrink-0 pb-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.k}
              type="button"
              onClick={() => setCat(c.k)}
              className={`h-9 px-3.5 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                cat === c.k ? "bg-accent-orange text-black" : "bg-white/5 text-white/80 border border-border-subtle"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-[220px] max-h-[350px] pr-1">
          {foods.length === 0 ? (
            <div className="p-6 text-center space-y-3">
              <p className="text-text-muted text-sm">No food found for &quot;{search}&quot;</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customName || search}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Type new food name"
                  className="flex-1 h-11 px-3 rounded-xl bg-[#1A1A1A] border border-[#333333] text-white text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCustom}
                  className="h-11 px-4 rounded-xl bg-accent-orange text-black font-bold text-sm cursor-pointer whitespace-nowrap"
                >
                  Add custom
                </button>
              </div>
            </div>
          ) : (
            foods.map((f, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(f)}
                className="w-full p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-border-subtle flex items-center justify-between text-left cursor-pointer transition-colors group"
              >
                <div className="min-w-0 pr-2">
                  <p className="font-bold text-sm text-white group-hover:text-accent-orange transition-colors">
                    {f.name}
                  </p>
                  {f.defaultQty && (
                    <p className="text-xs text-text-muted mt-0.5">Portion: {f.defaultQty}</p>
                  )}
                </div>
                <div className="size-8 rounded-lg bg-accent-orange/15 text-accent-orange flex items-center justify-center shrink-0">
                  <Plus className="size-4" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
