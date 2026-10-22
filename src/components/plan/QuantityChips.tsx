"use client"

import { Plus, Minus } from "lucide-react"

interface Props {
  text: string
  onChange: (newText: string) => void
  className?: string
}

export function detectUnitAndChips(text: string): {
  unit: "g" | "ml" | "scoop" | "egg" | "piece" | "nut"
  chips: string[]
} {
  const lower = text.toLowerCase()
  if (/egg|white/i.test(lower)) {
    return { unit: "egg", chips: ["1", "2", "3", "4", "5", "6"] }
  }
  if (/ml\b|milk|curd|oil|water|shake|juice/i.test(lower)) {
    return { unit: "ml", chips: ["100ml", "150ml", "200ml", "250ml", "300ml"] }
  }
  if (/scoop|whey|isolate|casein/i.test(lower)) {
    return { unit: "scoop", chips: ["0.5 scoop", "1 scoop", "1.5 scoop", "2 scoop"] }
  }
  if (/roti|bread|slice|banana|apple|chapat/i.test(lower)) {
    return { unit: "piece", chips: ["1", "2", "3", "4"] }
  }
  if (/almond|walnut|cashew|peanut/i.test(lower) && !/butter/i.test(lower)) {
    return { unit: "nut", chips: ["5", "10", "15", "20"] }
  }
  return { unit: "g", chips: ["50g", "100g", "150g", "200g", "250g"] }
}

export function replaceQty(text: string, newQty: string): string {
  const regex =
    /^(\d+(\.\d+)?\s*(g|ml|scoop|scoops|egg|eggs|white|whites|slice|slices|tbsp|tsp|tablet|capsule|halves)?\s*)/i
  if (regex.test(text)) {
    return text.replace(regex, newQty + " ")
  }
  return newQty + " " + text
}

export function stepQty(text: string, delta: number): string {
  const match = text.match(
    /^(\d+(\.\d+)?)\s*(g|ml|scoops?|eggs?|whites?|slices?|tbsp|tsp)?\s*(.*)$/i,
  )
  if (!match) {
    // If no leading number, default to 50g or 1
    const { unit } = detectUnitAndChips(text)
    if (unit === "g") return "50g " + text
    if (unit === "ml") return "100ml " + text
    if (unit === "scoop") return "1 scoop " + text
    return "1 " + text
  }

  const num = parseFloat(match[1])
  const rawUnit = (match[3] || "").trim()
  const rest = match[4] || ""

  const { unit } = detectUnitAndChips(text)
  let step = delta
  if (unit === "g" || rawUnit.toLowerCase() === "g") {
    step = delta * 25
  } else if (unit === "ml" || rawUnit.toLowerCase() === "ml") {
    step = delta * 50
  } else if (unit === "scoop" || /scoop/i.test(rawUnit)) {
    step = delta * 0.5
  } else {
    step = delta * 1
  }

  const nextNum = Math.max(0, num + step)
  const formatted = Number.isInteger(nextNum) ? nextNum.toString() : nextNum.toFixed(1)

  let unitSuffix = rawUnit
  if (!unitSuffix) {
    if (unit === "g") unitSuffix = "g"
    else if (unit === "ml") unitSuffix = "ml"
    else if (unit === "scoop") unitSuffix = "scoop"
  }

  const space = unitSuffix && unitSuffix !== "g" && unitSuffix !== "ml" ? " " : ""
  return unitSuffix
    ? `${formatted}${unitSuffix}${space}${rest}`.trim()
    : `${formatted} ${rest}`.trim()
}

export default function QuantityChips({ text, onChange, className = "" }: Props) {
  const { chips } = detectUnitAndChips(text)

  return (
    <div className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 ${className}`}>
      {/* Stepper - / + */}
      <div className="flex items-center gap-1 shrink-0 bg-white/5 border border-border-subtle rounded-lg p-0.5">
        <button
          type="button"
          onClick={() => onChange(stepQty(text, -1))}
          aria-label="Decrease quantity"
          className="size-7 grid place-items-center rounded-md hover:bg-white/10 text-white/70 active:scale-95 cursor-pointer"
        >
          <Minus className="size-3" />
        </button>
        <button
          type="button"
          onClick={() => onChange(stepQty(text, 1))}
          aria-label="Increase quantity"
          className="size-7 grid place-items-center rounded-md hover:bg-white/10 text-white/70 active:scale-95 cursor-pointer"
        >
          <Plus className="size-3" />
        </button>
      </div>

      {/* Quick Stepper Chips */}
      {chips.map((chip) => {
        const isCurrent =
          text.startsWith(chip + " ") ||
          text.startsWith(chip + "g ") ||
          text.toLowerCase().startsWith(chip.toLowerCase() + " ")

        return (
          <button
            key={chip}
            type="button"
            onClick={() => onChange(replaceQty(text, chip))}
            className={`h-7 px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all shrink-0 active:scale-95 ${
              isCurrent
                ? "bg-accent-orange text-black font-bold"
                : "bg-white/5 text-white/75 hover:bg-white/10 border border-white/10"
            }`}
          >
            {chip}
          </button>
        )
      })}
    </div>
  )
}
