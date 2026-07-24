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

async function probe() {
  // Try createUser with minimal metadata
  console.log("=== Test 1: createUser with minimal metadata ===")
  const { data, error } = await admin.auth.admin.createUser({
    email: `test-probe-${Date.now()}@test.com`,
    password: "Test1234!",
    email_confirm: true,
  })
  if (error) {
    console.log("FAILED:", error.message, error.code, error.status)
    // Check if the error has more details
    console.log("Full error:", JSON.stringify(error, null, 2))
  } else {
    console.log("SUCCESS:", data.user.id)
    await admin.auth.admin.deleteUser(data.user.id)
  }

  // Check existing coach user's profile
  console.log("\n=== Test 2: Coach profile check ===")
  const { data: coachProfile, error: cpErr } = await admin
    .from("profiles")
    .select("*")
    .eq("id", "640e5cd9-89e3-4303-9c6f-ff351276250d")
    .single()
  if (cpErr) console.log("Error:", cpErr.message)
  else console.log("Coach profile:", JSON.stringify(coachProfile, null, 2))

  // Check if we can sign in as coach
  console.log("\n=== Test 3: Coach sign-in ===")
  const { error: siErr } = await admin.auth.signInWithPassword({
    email: "coach@akfitness.in",
    password: "AmanCoach@2026",
  })
  if (siErr) console.log("Sign-in error:", siErr.message)
  else console.log("Sign-in OK")

  // Check what columns profiles actually has by selecting all
  console.log("\n=== Test 4: Profiles column check ===")
  const { data: profiles, error: pErr } = await admin.from("profiles").select("*").limit(1)
  if (pErr) console.log("Error:", pErr.message)
  else if (profiles?.[0]) console.log("Profile columns:", Object.keys(profiles[0]).join(", "))

  // Check clients table
  console.log("\n=== Test 5: Clients table check ===")
  const { data: clients, error: cErr } = await admin.from("clients").select("*").limit(1)
  if (cErr) console.log("Error:", cErr.message)
  else if (clients?.[0]) console.log("Client columns:", Object.keys(clients[0]).join(", "))
}

probe()
