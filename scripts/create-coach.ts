import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"
import * as path from "path"

function loadEnv() {
  const envPath = path.resolve(__dirname, "..", ".env.local")
  if (!fs.existsSync(envPath)) {
    console.error(".env.local not found. Make sure it exists with SUPABASE_* vars.")
    process.exit(1)
  }
  const lines = fs.readFileSync(envPath, "utf-8").split("\n")
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eqIdx = trimmed.indexOf("=")
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    let value = trimmed.slice(eqIdx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[key] = process.env[key] || value
  }
}

loadEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local")
  console.error("Add: SUPABASE_SERVICE_ROLE_KEY=your-service-role-key")
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

async function main() {
  const email = "aman@akfitness.in"
  const password = "AmanCoach@2024"
  const displayName = "Aman Khurana"

  console.log(`Creating coach account: ${email}...`)

  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle()

  if (lookupError) {
    console.error("Lookup error:", lookupError.message)
    process.exit(1)
  }

  if (existing) {
    console.log("Coach account already exists (id: " + existing.id + ")")
    return
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName, role: "coach" },
  })

  if (authError) {
    console.error("Failed to create auth user:", authError.message)
    process.exit(1)
  }

  const { error: insertError } = await supabaseAdmin.from("users").insert({
    id: authData.user.id,
    email,
    display_name: displayName,
    role: "coach",
    status: "active",
    plan: "elite",
  })

  if (insertError) {
    console.error("Failed to insert user row:", insertError.message)
    process.exit(1)
  }

  console.log(`Coach account created successfully!`)
  console.log(`Email: ${email}`)
  console.log(`Password: ${password}`)
}

main().catch((err) => {
  console.error("Script failed:", err)
  process.exit(1)
})
