// Rotates deterministically by day-of-year so every client sees the same tip on a given day.

const DIET_TIPS = [
  "Hit your protein target first — everything else in the plan follows from that.",
  "Drink a glass of water before every meal. Half the 'hunger' is dehydration.",
  "Prep tomorrow's meals tonight. Willpower runs out by evening, planning doesn't.",
  "Fiber before carbs at every meal — it blunts the sugar spike.",
  "Don't fear fat. Fear the sugar hiding in your 'healthy' snacks.",
]

const WORKOUT_TIPS = [
  "Progressive overload beats a perfect program. Add one rep before you add a new exercise.",
  "Your warm-up is part of the workout, not a delay before it.",
  "Sleep is when the muscle actually grows. The gym just gives it a reason to.",
  "Track your lifts. What gets measured gets improved.",
  "A missed rep with good form beats a completed one with bad form.",
]

export function getDailyTip(): { label: string; text: string } {
  const start = new Date(new Date().getFullYear(), 0, 0)
  const dayOfYear = Math.floor((Date.now() - start.getTime()) / 86400000)
  const isDiet = dayOfYear % 2 === 0
  const pool = isDiet ? DIET_TIPS : WORKOUT_TIPS
  return {
    label: isDiet ? "Diet Tip" : "Workout Tip",
    text: pool[dayOfYear % pool.length],
  }
}

// Set this when running a promo — it replaces the daily tip in the hero until cleared back to null.
export const ACTIVE_OFFER: { label: string; text: string } | null = null
