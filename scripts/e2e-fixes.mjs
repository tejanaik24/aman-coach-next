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

const COACH_EMAIL = "coach@akfitness.in"
const COACH_PASS = "AmanCoach@2026"
const TIMESTAMP = Date.now()
const NEW_CLIENT_EMAIL = `e2e-fix-${TIMESTAMP}@akfitness.in`
const NEW_CLIENT_PASS = "Welcome@123"

function log(step, status, msg) {
  const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "ℹ️"
  console.log(`${icon} [${step}] ${msg}`)
}

// ─── STEP 1: Coach creates new client via API (simulates FAB) ───
async function step1_createClient() {
  log("STEP-1", "INFO", `Creating new client: ${NEW_CLIENT_EMAIL}`)

  // Sign in as coach
  const coachClient = createClient(URL, ANON)
  const { error: coachErr } = await coachClient.auth.signInWithPassword({ email: COACH_EMAIL, password: COACH_PASS })
  if (coachErr) { log("STEP-1", "FAIL", `Coach sign-in: ${coachErr.message}`); return false }

  const coachUser = (await coachClient.auth.getUser()).data.user

  // Create auth user via admin API (simulates what the FAB does)
  const { data: authUser, error: createErr } = await admin.auth.admin.createUser({
    email: NEW_CLIENT_EMAIL,
    password: NEW_CLIENT_PASS,
    email_confirm: true,
    user_metadata: { name: "E2E Fix Test", role: "client" },
  })
  if (createErr) { log("STEP-1", "FAIL", `createUser: ${createErr.message}`); return false }
  log("STEP-1", "PASS", `Auth user created: ${authUser.user.id}`)

  // Wait for trigger to fire (profile should be auto-created)
  await new Promise(r => setTimeout(r, 2000))

  // Check if profile was auto-created by trigger
  const { data: profile, error: pErr } = await admin.from("profiles").select("id, name, role, must_reset_password").eq("id", authUser.user.id).single()
  if (pErr || !profile) {
    log("STEP-1", "FAIL", `Profile NOT auto-created by trigger: ${pErr?.message || "not found"}`)
    return false
  }

  log("STEP-1", "PASS", `Profile auto-created: role=${profile.role}, name=${profile.name}`)

  if (profile.role !== "client") {
    log("STEP-1", "FAIL", `Profile role=${profile.role}, expected client`)
    return false
  }
  log("STEP-1", "PASS", `Role is client`)

  // Create client record linking to coach
  const { error: clientErr } = await coachClient.from("clients").insert({
    coach_id: coachUser.id,
    user_id: authUser.user.id,
    goal: "E2E test verification",
    status: "active",
  })
  if (clientErr) { log("STEP-1", "FAIL", `Client record: ${clientErr.message}`); return false }
  log("STEP-1", "PASS", `Client record created linking to coach`)

  return authUser.user.id
}

// ─── STEP 2: Verify must_reset_password=true on new profile ───
async function step2_verifyResetFlag(userId) {
  log("STEP-2", "INFO", `Checking must_reset_password on profile: ${userId}`)

  const { data: profile, error } = await admin.from("profiles").select("must_reset_password, role").eq("id", userId).single()
  if (error || !profile) { log("STEP-2", "FAIL", `Cannot read profile: ${error?.message}`); return false }

  if (profile.must_reset_password !== true) {
    log("STEP-2", "FAIL", `must_reset_password=${profile.must_reset_password}, expected true`)
    return false
  }

  log("STEP-2", "PASS", `must_reset_password=${profile.must_reset_password} ✅`)
  return true
}

// ─── STEP 3: Client logs in → should see must_reset_password → redirect to /reset-password ───
async function step3_clientLoginRedirect() {
  log("STEP-3", "INFO", `Signing in as new client: ${NEW_CLIENT_EMAIL}`)

  const clientClient = createClient(URL, ANON)
  const { error } = await clientClient.auth.signInWithPassword({ email: NEW_CLIENT_EMAIL, password: NEW_CLIENT_PASS })
  if (error) { log("STEP-3", "FAIL", `Sign-in: ${error.message}`); return false }

  const user = (await clientClient.auth.getUser()).data.user
  if (!user) { log("STEP-3", "FAIL", `No user after sign-in`); return false }

  const { data: profile, error: pErr } = await clientClient.from("profiles").select("role, must_reset_password").eq("id", user.id).single()
  if (pErr) { log("STEP-3", "FAIL", `Profile query: ${pErr.message}`); return false }

  log("STEP-3", "INFO", `Profile: role=${profile.role}, must_reset_password=${profile.must_reset_password}`)

  // proxy.ts would check must_reset_password and redirect to /reset-password
  if (profile.must_reset_password === true) {
    log("STEP-3", "PASS", `must_reset_password=true → proxy.ts would redirect to /reset-password ✅`)
  } else {
    log("STEP-3", "FAIL", `must_reset_password=${profile.must_reset_password}, expected true (would NOT redirect to /reset-password)`)
    return false
  }

  return true
}

// ─── STEP 4: Client resets password → must_reset_password flips to false → should redirect to /home ───
async function step4_resetPassword() {
  log("STEP-4", "INFO", `Resetting password for: ${NEW_CLIENT_EMAIL}`)

  const clientClient = createClient(URL, ANON)
  const { error } = await clientClient.auth.signInWithPassword({ email: NEW_CLIENT_EMAIL, password: NEW_CLIENT_PASS })
  if (error) { log("STEP-4", "FAIL", `Sign-in: ${error.message}`); return false }

  const user = (await clientClient.auth.getUser()).data.user

  // Simulate what /reset-password page does: update password then flip must_reset_password
  const NEW_PASS = "E2E_Fixed@2026"
  const { error: updErr } = await clientClient.auth.updateUser({ password: NEW_PASS })
  if (updErr) { log("STEP-4", "FAIL", `Password update: ${updErr.message}`); return false }
  log("STEP-4", "PASS", `Password updated`)

  // Flip must_reset_password to false (what reset-password page does)
  const { error: flagErr } = await clientClient.from("profiles").update({ must_reset_password: false }).eq("id", user.id)
  if (flagErr) { log("STEP-4", "FAIL", `Flag update: ${flagErr.message}`); return false }
  log("STEP-4", "PASS", `must_reset_password set to false`)

  // Verify flag is false now
  const { data: profile } = await admin.from("profiles").select("must_reset_password").eq("id", user.id).single()
  if (profile.must_reset_password !== false) {
    log("STEP-4", "FAIL", `must_reset_password still ${profile.must_reset_password}`)
    return false
  }
  log("STEP-4", "PASS", `must_reset_password=false ✅ → proxy.ts would redirect to /home`)

  // Verify new password works
  const verifyClient = createClient(URL, ANON)
  const { error: verifyErr } = await verifyClient.auth.signInWithPassword({ email: NEW_CLIENT_EMAIL, password: NEW_PASS })
  if (verifyErr) { log("STEP-4", "FAIL", `New password login failed: ${verifyErr.message}`); return false }
  log("STEP-4", "PASS", `New password works ✅`)

  return true
}

// ─── MAIN ───
async function main() {
  console.log("\n═══════════════════════════════════════════")
  console.log("  E2E FIX VERIFICATION — Trigger + Reset Password")
  console.log("═══════════════════════════════════════════\n")

  const results = {}
  let userId = null

  try {
    userId = await step1_createClient()
    results.step1 = !!userId
    results.step2 = userId ? await step2_verifyResetFlag(userId) : false
    results.step3 = await step3_clientLoginRedirect()
    results.step4 = results.step3 ? await step4_resetPassword() : false
  } catch (e) {
    console.error("\n💥 UNEXPECTED ERROR:", e.message, e.stack)
  }

  console.log("\n═══════════════════════════════════════════")
  console.log("  RESULTS")
  console.log("═══════════════════════════════════════════")
  const labels = {
    step1: "1. Coach creates client → profile auto-created by trigger",
    step2: "2. Profile has must_reset_password=true",
    step3: "3. Client login → would redirect to /reset-password",
    step4: "4. Reset password → flag flips → would redirect to /home",
  }
  for (const [k, v] of Object.entries(results)) {
    console.log(`  ${v ? "✅" : "❌"} ${labels[k]}`)
  }
  const allPassed = Object.values(results).every(Boolean)
  console.log(`\n  ${allPassed ? "🎉 ALL PASSED" : "⚠️  SOME FAILED"}`)
  console.log(`  Test client: ${NEW_CLIENT_EMAIL} / E2E_Fixed@2026\n`)
}

main()
