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

const URL = env.NEXT_PUBLIC_SUPABASE_URL
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY

const admin = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } })

const COACH_ID = "640e5cd9-89e3-4303-9c6f-ff351276250d"
const CLIENT_USER_IDS = [
  "4920019d-6708-4011-afc4-d8b23f91902e", // Tejas
  "a27152a9-261b-4b93-8156-129e9d09c637", // Test User
]

async function fix() {
  // Fix 1: Create client records for existing profiles
  console.log("=== Creating client records ===")
  for (const userId of CLIENT_USER_IDS) {
    // Check if already exists
    const { data: existing } = await admin.from("clients").select("id").eq("user_id", userId).single()
    if (existing) {
      console.log(`Client record already exists for ${userId}: ${existing.id}`)
      continue
    }

    const { data, error } = await admin.from("clients").insert({
      user_id: userId,
      coach_id: COACH_ID,
      goal: "Muscle Building",
      package_name: "3 Month Transformation",
      fee_amount: 15000,
      fee_currency: "INR",
      fee_due_day: 1,
      start_date: "2026-07-01",
      status: "active",
    }).select("id").single()

    if (error) {
      console.log(`FAILED to create client for ${userId}:`, error.message)
    } else {
      console.log(`Created client record: ${data.id} for user ${userId}`)

      // Create first fee record
      const { error: feeErr } = await admin.from("fees").insert({
        client_id: data.id,
        amount: 15000,
        currency: "INR",
        due_date: "2026-08-01",
        status: "pending",
      })
      if (feeErr) console.log(`  Fee insert failed:`, feeErr.message)
      else console.log(`  Fee record created`)
    }
  }

  // Verify
  console.log("\n=== Verifying ===")
  const { data: clients } = await admin.from("clients").select("id, user_id, coach_id, goal, status")
  console.log("Clients:", JSON.stringify(clients, null, 2))

  const { data: fees } = await admin.from("fees").select("id, client_id, amount, status")
  console.log("Fees:", JSON.stringify(fees, null, 2))
}

fix()
