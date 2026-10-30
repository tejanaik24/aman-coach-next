// Coach view of a submitted form: answers in question order with the real question text.
// Postgres jsonb stores keys sorted by length, not in form order, so the order is rebuilt from the key itself:
// "q30_meal_lunch" -> group q, number 30, then the part inside a question (breakfast before lunch before dinner).

const GROUP_RANK: Record<string, number> = { q: 0, t: 1, d: 2, g: 3, w: 4 } // joining forms, then check-in sections
const PART_ORDER = [
  "name", "email", "address", "phone", "alt_phone", "dob", "age",
  "morning", "fasting", "bf", "midday", "afternoon", "lunch", "eve", "dinner", "night",
  "wake_time", "sleep_time",
  "duration", "frequency", "blood_loss", "days_1_4",
  "front", "back", "side", "left", "right", "fav", "mandatory",
  "lowest_weight", "lowest_when", "heaviest_weight", "heaviest_when",
]

// Keyed by the part after "qN_", so the standard and AN-PN forms share one list.
const LABELS: Record<string, string> = {
  name: "Full name", email: "Email", address: "Residence address", phone: "WhatsApp number", alt_phone: "Alternate number",
  dob: "Date of birth", age: "Age", height: "Height", goal: "Goal",
  wake_time: "Wake-up time", sleep_time: "Sleep time", hired_coach: "Coach / nutritionist before? Why left?", had_coach: "Coach / nutritionist before? Why left?",
  home_equipment: "Equipment at home", work_schedule: "Work: sitting/standing, hours & timings",
  exercise_history: "Exercises currently? Type & since when", workout_routine: "Exact workout routine",
  steps_daily: "Daily steps", cardio_regular: "Cardio: type & minutes", workout_timings: "Workout time & days per week",
  injuries_pain: "Injury, pain or surgery history", health_issues: "Health issues / genetic disorders",
  prescribed_drugs: "Prescribed medicines", constipation_history: "Constipation / stool frequency", addictions: "Addictions",
  urine_color: "Urine colour", menstrual_duration: "Periods: bleeding days", menstrual_frequency: "Periods: cycle length",
  menstrual_blood_loss: "Periods: blood loss", menstrual_days_1_4: "Periods: day 1-4 symptoms",
  steroids_history: "Steroids / SARMs / peptides history", diet_preference: "Veg / Vegan / Non-veg / Egg",
  nonveg_fast_days: "Days without non-veg", lactose_intolerant: "Lactose intolerant",
  meal_bf: "Breakfast time", meal_midday: "Mid-day snack time", meal_lunch: "Lunch time", meal_eve: "Evening snack time", meal_dinner: "Dinner time",
  max_meals: "Max meals per day", preworkout_meal: "Pre-workout meal possible",
  supplements: "Supplements", supplements_link: "Supplements link", supplements_pics: "Supplement photos",
  whey_protein: "Would take whey protein", food_allergies: "Food allergies",
  allergy_reports: "Food intolerance report", allergy_reports_link: "Food intolerance report link",
  diet_morning: "Current diet: early morning", diet_bf: "Current diet: breakfast", diet_midday: "Current diet: mid-day",
  diet_lunch: "Current diet: lunch", diet_eve: "Current diet: evening", diet_dinner: "Current diet: dinner",
  water_intake: "Water per day (litres)", food_love: "Foods they LOVE", food_hate: "Foods they HATE",
  food_want: "Foods wanted in the plan", seasonal_fruits: "Seasonal fruits", palate: "Savoury or sweet tooth",
  chocolates: "Chocolates", cheat_meal: "Favourite cheat meal", overseas_links: "Grocery / supplement store links",
  bp_morning: "BP morning", bp_afternoon: "BP afternoon", bp_night: "BP night",
  blood_tests: "Blood / urine / DEXA reports", blood_tests_link: "Reports link", medical_reports: "Medical reports",
  anything_else: "Anything else", additional_notes: "Anything else",
  front_pic: "Front photo", front_pics: "Front photo", back_pic: "Back photo", back_pics: "Back photo",
  side_pics: "Side photos", left_pic: "Left side photo", right_pic: "Right side photo",
  fav_pose: "Favourite pose", mandatory_pose: "Mandatory poses", "54_progress_photos_link": "Progress photos link",
  weight: "Weight (kg)", neck: "Neck (cm)", abdomen: "Abdomen at navel (cm)", hips: "Hips (cm)",
  arm: "Right arm (cm)", thigh: "Right thigh (cm)", calf: "Right calf (cm)",
  lowest_weight: "Lowest weight (3-5 yrs)", lowest_when: "Lowest weight: when", heaviest_weight: "Heaviest weight (3-5 yrs)", heaviest_when: "Heaviest weight: when",
  gym_pics: "Gym photos", gym_photos: "Gym photos", gym_link: "Gym link",
  // AN-PN only
  gestational_weeks: "Weeks pregnant", lmp: "Last period (LMP)", edd: "Due date (EDD)", gravidity: "Pregnancy number",
  pregnancy_type: "Pregnancy type", family_history: "Family history", palpitation_dizziness: "Palpitation / dizziness",
  surgical_history: "Surgical history", sleep_quality: "Sleep quality", preconception_routine: "Routine before pregnancy",
  nausea_foods: "Foods causing nausea", glucose_fasting: "Glucose fasting", glucose_bf: "Glucose after breakfast",
  glucose_lunch: "Glucose after lunch", glucose_eve: "Glucose evening", glucose_dinner: "Glucose after dinner",
  resting_bpm: "Resting heart rate", preconception_pics: "Pre-pregnancy photos", waist_pelvic: "Waist at pelvis (cm)",
  preconception_weight: "Weight before pregnancy", preconception_weight_duration: "Held that weight for",
  weight_start_trimester1: "Weight at start of trimester 1", weight_end_trimester1: "Weight at end of trimester 1",
  equipment_photos: "Equipment photos",
  // Check-in
  energy_workout: "Energy in workouts", days_worked_out: "Days worked out", workout_deviation: "Workout changes / misses",
  exercise_issues: "Exercise issues", cardio_steps_goal: "Cardio & steps goal met", injury_pain: "Injury / pain",
  diet_deviation: "Diet changes / misses", appetite: "Appetite", digestion: "Digestion", constipation: "Constipation",
  diet_changes_wanted: "Diet changes wanted", food_add_remove: "Foods to add / remove", day_energy: "Energy through the day",
  coaching_feedback: "Feedback on coaching",
}

function parse(key: string) {
  const m = key.match(/^([a-z])(\d+)_(.+)$/)
  if (!m || !(m[1] in GROUP_RANK)) return null
  return { group: GROUP_RANK[m[1]], num: Number(m[2]), part: m[3] }
}

function partRank(part: string) {
  const i = PART_ORDER.findIndex((p) => part === p || part.endsWith("_" + p) || part.startsWith(p + "_"))
  return i === -1 ? PART_ORDER.length : i
}

export function fieldLabel(key: string): string {
  const p = parse(key)
  const part = p ? p.part : key
  return LABELS[part] ?? part.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())
}

// Stable: keys without a question number (enquiry forms, "name"/"tel") keep their order after the numbered ones.
export function orderedEntries(data: Record<string, unknown>): [string, unknown][] {
  const entries = Object.entries(data)
  // The public questionnaire also sends name/tel copies of q1_name/q4_phone.
  const hasQ = entries.some(([k]) => parse(k))
  const shown = hasQ ? entries.filter(([k]) => k !== "name" && k !== "tel") : entries
  return shown
    .map((e, i) => ({ e, i, p: parse(e[0]) }))
    .sort((a, b) => {
      if (!a.p || !b.p) return a.p ? -1 : b.p ? 1 : a.i - b.i
      return a.p.group - b.p.group || a.p.num - b.p.num || partRank(a.p.part) - partRank(b.p.part) || a.i - b.i
    })
    .map((x) => x.e)
}
