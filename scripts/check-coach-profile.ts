import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"
import * as path from "path"

function loadEnv() {
  const envPath = path.resolve(__dirname, "..", ".env.local")
  if (!fs.existsSync(envPath)) {
    console.error(".env.local not found.")
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

const EMAIL = "coach@akfitness.in"

async function main() {
  // 1. Find auth user
  const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) { console.error("Failed to list auth users:", listError.message); process.exit(1) }

  const authUser = authUsers.users.find((u) => u.email === EMAIL)
  if (!authUser) {
    console.error(`No auth user found with email ${EMAIL}`)
    process.exit(1)
  }
  console.log(`Found auth user: ${authUser.id} (${authUser.email})`)

  // 2. Check profiles table
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .single()

  if (profileError || !profile) {
    console.log(`No profile found for ${authUser.id}. Creating one with role=coach...`)
    const { error: insertError } = await supabase.from("profiles").insert({
      id: authUser.id,
      name: authUser.user_metadata?.display_name || "Coach",
      phone: null,
      role: "coach",
      avatar_url: null,
    })
    if (insertError) { console.error("Failed to insert profile:", insertError.message); process.exit(1) }
    console.log("Profile created with role=coach")
    return
  }

  console.log(`Current profile: role=${profile.role}, name=${profile.name}`)
  if (profile.role === "coach") {
    console.log("Role is already 'coach' — no changes needed.")
    return
  }

  // 3. Fix role
  console.log(`Role is '${profile.role}', updating to 'coach'...`)
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role: "coach" })
    .eq("id", authUser.id)
  if (updateError) { console.error("Failed to update role:", updateError.message); process.exit(1) }
  console.log("Role updated to 'coach'")
}

main().catch((err) => { console.error(err); process.exit(1) })
