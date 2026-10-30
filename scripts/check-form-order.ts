// Run: npx tsx scripts/check-form-order.ts  (fails loudly if form answers come out of question order)
import assert from "node:assert"
import { orderedEntries, fieldLabel } from "../src/lib/form-fields"

// Keys in the order Postgres jsonb returns them (shortest first), not form order
const jsonbOrder = ["tel", "name", "q8_goal", "q6_age", "q6_dob", "q1_name", "q58_hips", "q55_weight", "q30_meal_bf", "q36_diet_bf",
  "q30_meal_eve", "q2_email", "q30_meal_lunch", "q30_meal_dinner", "q30_meal_midday", "q49_back_pics", "q49_front_pics", "q49_side_pics"]
const keys = orderedEntries(Object.fromEntries(jsonbOrder.map((k) => [k, "x"]))).map(([k]) => k)
assert.deepStrictEqual(keys, ["q1_name", "q2_email", "q6_dob", "q6_age", "q8_goal",
  "q30_meal_bf", "q30_meal_midday", "q30_meal_lunch", "q30_meal_eve", "q30_meal_dinner",
  "q36_diet_bf", "q49_front_pics", "q49_back_pics", "q49_side_pics", "q55_weight", "q58_hips"])

const checkin = orderedEntries({ w1_weight: 1, g2_sleep_quality: 1, t1_energy_workout: 1, d1_diet_deviation: 1 }).map(([k]) => k)
assert.deepStrictEqual(checkin, ["t1_energy_workout", "d1_diet_deviation", "g2_sleep_quality", "w1_weight"])

const enquiry = orderedEntries({ name: 1, phone: 1, goal: 1 }).map(([k]) => k)
assert.deepStrictEqual(enquiry, ["name", "phone", "goal"])

assert.strictEqual(fieldLabel("q36_diet_lunch"), "Current diet: lunch")
assert.strictEqual(fieldLabel("q99_something_new"), "Something new")
console.log("form order OK")
