import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, "..", ".env.local")
const envText = readFileSync(envPath, "utf-8")
const env = Object.fromEntries(
  envText.split("\n").filter(l => l.includes("=") && !l.startsWith("#")).map(l => {
    const [k, ...v] = l.split("=")
    return [k.trim(), v.join("=").trim()]
  })
)

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function dump() {
  console.log("=== PROFILES ===")
  const { data: profiles } = await admin.from("profiles").select("id, name, role")
  console.log(profiles)

  console.log("\n=== CLIENTS ===")
  const { data: clients, error } = await admin.from("clients").select("id, user_id, coach_id, goal, status")
  if (error) console.log("ERROR:", error.message)
  else console.log(clients)

  console.log("\n=== WORKOUT PLANS ===")
  const { data: plans } = await admin.from("workout_plans").select("id, client_id, coach_id, name, is_active")
  console.log(plans)

  console.log("\n=== FEES ===")
  const { data: fees } = await admin.from("fees").select("id, client_id, amount, status")
  console.log(fees)

  console.log("\n=== CHECKINS ===")
  const { data: checkins } = await admin.from("checkins").select("id, client_id, week_number, reviewed_at")
  console.log(checkins)

  console.log("\n=== WORKOUT DAYS ===")
  const { data: days } = await admin.from("workout_days").select("id, plan_id, day_name")
  console.log(days)

  console.log("\n=== EXERCISES ===")
  const { data: exercises } = await admin.from("exercises").select("id, day_id, name")
  console.log(exercises)

  console.log("\n=== MEALS ===")
  const { data: meals } = await admin.from("meals").select("id, plan_id, meal_name")
  console.log(meals)
}

dump()
