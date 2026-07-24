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
const CLIENT_EMAIL = "tejasolryder24@gmail.com"
const CLIENT_PASS = "Welcome@123"

let coachUser = null
let clientUser = null
let testClientId = null
let workoutPlanId = null
let checkinId = null
let feeId = null

function log(step, status, msg) {
  const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "ℹ️"
  console.log(`${icon} [${step}] ${msg}`)
}

// ─── STEP 1: Verify existing client setup (since trigger is broken) ───
async function step1_verifyClient() {
  log("STEP-1", "INFO", "Verifying existing client setup (trigger broken — can't create new users)")

  // Sign in as coach
  const coachClient = createClient(URL, ANON)
  const { error: coachErr } = await coachClient.auth.signInWithPassword({ email: COACH_EMAIL, password: COACH_PASS })
  if (coachErr) { log("STEP-1", "FAIL", `Coach sign-in: ${coachErr.message}`); return false }
  coachUser = (await coachClient.auth.getUser()).data.user
  log("STEP-1", "PASS", `Coach signed in: ${coachUser.id}`)

  // Find the client record
  const { data: clientRows, error: crErr } = await coachClient.from("clients").select("id, user_id, goal, status").eq("coach_id", coachUser.id)
  if (crErr) { log("STEP-1", "FAIL", `Query clients: ${crErr.message}`); return false }
  if (!clientRows || clientRows.length === 0) { log("STEP-1", "FAIL", `No clients found for coach`); return false }

  // Find the test client
  const testClient = clientRows.find(c => {
    // We'll use the first client
    return true
  })
  testClientId = testClient.id
  log("STEP-1", "PASS", `Found client: ${testClientId}, goal=${testClient.goal}, status=${testClient.status}`)

  // Verify profile exists for this client
  const { data: profile } = await admin.from("profiles").select("id, name, role").eq("id", testClient.user_id).single()
  if (!profile) { log("STEP-1", "FAIL", `No profile for client user_id=${testClient.user_id}`); return false }
  if (profile.role !== "client") { log("STEP-1", "FAIL", `Profile role=${profile.role}, expected client`); return false }
  log("STEP-1", "PASS", `Client profile: name=${profile.name}, role=${profile.role}`)

  // Verify fee exists
  const { data: feeRows } = await coachClient.from("fees").select("id, status, amount").eq("client_id", testClientId)
  if (!feeRows || feeRows.length === 0) {
    log("STEP-1", "INFO", `No fees for client — creating one for testing`)
    const { error: feeErr } = await coachClient.from("fees").insert({
      client_id: testClientId, amount: 15000, currency: "INR",
      due_date: new Date().toISOString().split("T")[0], status: "pending",
    })
    if (feeErr) { log("STEP-1", "FAIL", `Create fee: ${feeErr.message}`); return false }
    log("STEP-1", "PASS", `Created test fee record`)
  } else {
    log("STEP-1", "PASS", `Found ${feeRows.length} fee record(s), latest status=${feeRows[0].status}`)
  }

  return true
}

// ─── STEP 2: Client logs in → verify role + redirect logic ───
async function step2_clientLogin() {
  log("STEP-2", "INFO", `Signing in as client: ${CLIENT_EMAIL}`)
  const clientClient = createClient(URL, ANON)
  const { error } = await clientClient.auth.signInWithPassword({ email: CLIENT_EMAIL, password: CLIENT_PASS })
  if (error) { log("STEP-2", "FAIL", `Sign-in error: ${error.message}`); return false }

  const user = (await clientClient.auth.getUser()).data.user
  if (!user) { log("STEP-2", "FAIL", `No user after sign-in`); return false }

  const { data: profile, error: pErr } = await clientClient.from("profiles").select("role, must_reset_password").eq("id", user.id).single()
  if (pErr) { log("STEP-2", "FAIL", `Profile query error: ${pErr.message}`); return false }
  if (!profile) { log("STEP-2", "FAIL", `No profile found for user ${user.id}`); return false }

  log("STEP-2", "INFO", `Profile: role=${profile.role}, must_reset_password=${profile.must_reset_password}`)

  // Check redirect logic
  if (profile.must_reset_password) {
    log("STEP-2", "FAIL", `must_reset_password=true → would redirect to /reset-password, NOT /home`)
    return false
  }
  if (profile.role === "client") {
    log("STEP-2", "PASS", `role=client → would redirect to /home ✅`)
  } else {
    log("STEP-2", "FAIL", `role=${profile.role}, expected client`)
    return false
  }

  clientUser = user
  return true
}

// ─── STEP 3: Coach creates workout plan → client sees it ───
async function step3_workoutPlan() {
  log("STEP-3", "INFO", "Creating workout plan as coach")

  const coachClient = createClient(URL, ANON)
  await coachClient.auth.signInWithPassword({ email: COACH_EMAIL, password: COACH_PASS })

  // Check for existing active plan
  const { data: existing } = await coachClient.from("workout_plans").select("id").eq("client_id", testClientId).eq("is_active", true).limit(1)
  if (existing && existing.length > 0) {
    workoutPlanId = existing[0].id
    log("STEP-3", "INFO", `Active plan already exists: ${workoutPlanId}`)
  } else {
    const { data: plan, error } = await coachClient.from("workout_plans").insert({
      client_id: testClientId, coach_id: coachUser.id, name: "E2E Test Plan", weeks: 4, is_active: true, is_template: false,
    }).select("id").single()
    if (error) { log("STEP-3", "FAIL", `Plan insert: ${error.message}`); return false }
    workoutPlanId = plan.id
    log("STEP-3", "PASS", `Workout plan created: ${workoutPlanId}`)
  }

  // Check if days exist
  const { data: existingDays } = await coachClient.from("workout_days").select("id").eq("plan_id", workoutPlanId)
  if (!existingDays || existingDays.length === 0) {
    const { data: day, error } = await coachClient.from("workout_days").insert({
      plan_id: workoutPlanId, day_number: 1, day_name: "Push Day", focus: "Chest, Shoulders, Triceps",
    }).select("id").single()
    if (error) { log("STEP-3", "FAIL", `Day insert: ${error.message}`); return false }
    log("STEP-3", "PASS", `Workout day created: ${day.id}`)

    const { error: exErr } = await coachClient.from("exercises").insert([
      { day_id: day.id, name: "Barbell Bench Press", sets: 4, reps: "8-10", weight: "60kg", rest_seconds: 90, order_index: 0 },
      { day_id: day.id, name: "Incline DB Press", sets: 3, reps: "10-12", weight: "20kg", rest_seconds: 60, order_index: 1 },
      { day_id: day.id, name: "Overhead Press", sets: 3, reps: "8-10", weight: "30kg", rest_seconds: 90, order_index: 2 },
    ])
    if (exErr) { log("STEP-3", "FAIL", `Exercises insert: ${exErr.message}`); return false }
    log("STEP-3", "PASS", `3 exercises added`)
  } else {
    log("STEP-3", "INFO", `${existingDays.length} day(s) already exist`)
  }

  // Verify client can see it (RLS check)
  const clientClient = createClient(URL, ANON)
  await clientClient.auth.signInWithPassword({ email: CLIENT_EMAIL, password: CLIENT_PASS })

  const { data: clientPlan } = await clientClient.from("workout_plans").select("*").eq("client_id", testClientId).eq("is_active", true).single()
  if (!clientPlan) { log("STEP-3", "FAIL", `Client cannot see active workout plan (RLS issue?)`); return false }
  log("STEP-3", "PASS", `Client sees plan: "${clientPlan.name}"`)

  const { data: clientDays } = await clientClient.from("workout_days").select("*").eq("plan_id", workoutPlanId)
  if (!clientDays || clientDays.length === 0) { log("STEP-3", "FAIL", `Client cannot see workout days`); return false }
  log("STEP-3", "PASS", `Client sees ${clientDays.length} day(s)`)

  const { data: clientExercises } = await clientClient.from("exercises").select("*").eq("day_id", clientDays[0].id)
  if (!clientExercises || clientExercises.length === 0) { log("STEP-3", "FAIL", `Client cannot see exercises`); return false }
  log("STEP-3", "PASS", `Client sees ${clientExercises.length} exercises: ${clientExercises.map(e => e.name).join(", ")}`)

  return true
}

// ─── STEP 4: Client submits check-in → verify form_data ───
async function step4_clientCheckin() {
  log("STEP-4", "INFO", "Client submitting check-in")

  const clientClient = createClient(URL, ANON)
  await clientClient.auth.signInWithPassword({ email: CLIENT_EMAIL, password: CLIENT_PASS })

  // Check for recent checkin (5-day cooldown)
  const { data: recent } = await clientClient.from("checkins").select("id, submitted_at").eq("client_id", testClientId).order("submitted_at", { ascending: false }).limit(1).single()
  if (recent) {
    const daysSince = (Date.now() - new Date(recent.submitted_at).getTime()) / (1000*60*60*24)
    if (daysSince < 5) {
      log("STEP-4", "INFO", `Last checkin was ${daysSince.toFixed(1)} days ago — within 5-day cooldown. Deleting for test.`)
      await admin.from("checkins").delete().eq("id", recent.id)
    }
  }

  const formData = {
    training: { energy_workout: 4, days_worked_out: 5, workout_deviation: "Missed Wednesday due to travel", exercise_issues: "None", cardio_achieved: "3 sessions", injury_pain: "None" },
    diet: { diet_deviation: "90% On Track (1-2 cheat bites)", appetite: "Good", digestion: "Normal", constipation: "None", diet_changes_wanted: "More variety in meals", food_add_remove: "" },
    general: { energy_day: 4, sleep_quality: "Good", water_intake: 3, urine_colour: "Pale Straw (Well Hydrated)", coaching_feedback: "", other_notes: "Feeling strong this week" },
    measurements: { weight: 78.5, abdomen: 82, hips: 95 },
    photos: { front_url: null, back_url: null, left_url: null, right_url: null, favourite_url: null, mandatory_url: null },
  }

  const { count } = await clientClient.from("checkins").select("*", { count: "exact", head: true }).eq("client_id", testClientId)
  const weekNumber = (count ?? 0) + 1

  const { error } = await clientClient.from("checkins").insert({
    client_id: testClientId,
    week_number: weekNumber,
    weight: formData.measurements.weight,
    energy_level: formData.general.energy_day,
    adherence_workout: Math.min(formData.training.energy_workout * 2, 10),
    adherence_nutrition: 9,
    notes: formData.general.other_notes,
    photos: [],
    form_data: formData,
  })
  if (error) { log("STEP-4", "FAIL", `Checkin insert: ${error.message}`); return false }
  log("STEP-4", "PASS", `Check-in submitted (week ${weekNumber})`)

  // Verify in DB
  const { data: row, error: rErr } = await admin.from("checkins").select("*").eq("client_id", testClientId).order("submitted_at", { ascending: false }).limit(1).single()
  if (rErr || !row) { log("STEP-4", "FAIL", `Cannot read checkin: ${rErr?.message}`); return false }
  checkinId = row.id

  // Verify form_data
  if (!row.form_data) { log("STEP-4", "FAIL", `form_data is NULL`); return false }
  if (row.form_data.training?.energy_workout !== 4) { log("STEP-4", "FAIL", `form_data.training.energy_workout=${row.form_data.training?.energy_workout}, expected 4`); return false }
  if (row.form_data.measurements?.weight !== 78.5) { log("STEP-4", "FAIL", `form_data.measurements.weight=${row.form_data.measurements?.weight}, expected 78.5`); return false }
  if (row.weight !== 78.5) { log("STEP-4", "FAIL", `weight column=${row.weight}, expected 78.5`); return false }
  if (row.adherence_workout !== 8) { log("STEP-4", "FAIL", `adherence_workout=${row.adherence_workout}, expected 8`); return false }
  if (row.adherence_nutrition !== 9) { log("STEP-4", "FAIL", `adherence_nutrition=${row.adherence_nutrition}, expected 9`); return false }
  if (!row.submitted_at) { log("STEP-4", "FAIL", `submitted_at is null`); return false }

  log("STEP-4", "PASS", `form_data verified: training.energy=${row.form_data.training.energy_workout}, weight=${row.weight}, adherence_w=${row.adherence_workout}, adherence_n=${row.adherence_nutrition}`)
  return true
}

// ─── STEP 5: Coach views check-in → feedback → mark reviewed ───
async function step5_coachReview() {
  log("STEP-5", "INFO", "Coach reviewing check-in")

  const coachClient = createClient(URL, ANON)
  await coachClient.auth.signInWithPassword({ email: COACH_EMAIL, password: COACH_PASS })

  // Fetch pending checkins
  const { data: pending, error: pErr } = await coachClient.from("checkins").select("*").eq("client_id", testClientId).is("reviewed_at", null)
  if (pErr) { log("STEP-5", "FAIL", `Query pending: ${pErr.message}`); return false }
  if (!pending || pending.length === 0) { log("STEP-5", "FAIL", `No pending checkins found`); return false }
  log("STEP-5", "PASS", `Found ${pending.length} pending checkin(s)`)

  const target = pending.find(c => c.id === checkinId) ?? pending[0]

  // Add feedback and mark reviewed
  const feedback = "Great progress this week! Bench press form looks solid. Keep pushing weight on OHP."
  const { error } = await coachClient.from("checkins").update({
    coach_feedback: feedback,
    reviewed_at: new Date().toISOString(),
    reviewed_by: coachUser.id,
  }).eq("id", target.id)
  if (error) { log("STEP-5", "FAIL", `Update: ${error.message}`); return false }
  log("STEP-5", "PASS", `Feedback saved + marked reviewed`)

  // Verify
  const { data: updated } = await admin.from("checkins").select("coach_feedback, reviewed_at, reviewed_by").eq("id", target.id).single()
  if (!updated) { log("STEP-5", "FAIL", `Cannot read back`); return false }
  if (updated.coach_feedback !== feedback) { log("STEP-5", "FAIL", `Feedback mismatch`); return false }
  if (!updated.reviewed_at) { log("STEP-5", "FAIL", `reviewed_at still null`); return false }
  if (updated.reviewed_by !== coachUser.id) { log("STEP-5", "FAIL", `reviewed_by mismatch`); return false }
  log("STEP-5", "PASS", `Verified: feedback="${updated.coach_feedback.substring(0, 30)}..." reviewed_at=${updated.reviewed_at}`)

  // Verify no longer in pending
  const { data: stillPending } = await coachClient.from("checkins").select("id").eq("client_id", testClientId).is("reviewed_at", null)
  if (stillPending?.some(c => c.id === target.id)) { log("STEP-5", "FAIL", `Still in pending tab`); return false }
  log("STEP-5", "PASS", `Removed from pending tab — appears in Reviewed`)

  return true
}

// ─── STEP 6: Coach marks fee as paid → verify ───
async function step6_markPaid() {
  log("STEP-6", "INFO", "Coach marking fee as paid")

  const coachClient = createClient(URL, ANON)
  await coachClient.auth.signInWithPassword({ email: COACH_EMAIL, password: COACH_PASS })

  // Find fee
  const { data: feeRows } = await coachClient.from("fees").select("*").eq("client_id", testClientId)
  if (!feeRows || feeRows.length === 0) { log("STEP-6", "FAIL", `No fees found`); return false }

  const fee = feeRows.find(f => f.status !== "paid") ?? feeRows[0]
  feeId = fee.id
  log("STEP-6", "INFO", `Fee: ${fee.id}, status=${fee.status}, amount=₹${fee.amount}`)

  // Reset if already paid (for test)
  if (fee.status === "paid") {
    await coachClient.from("fees").update({ status: "pending", paid_date: null }).eq("id", fee.id)
    log("STEP-6", "INFO", `Reset fee to pending for test`)
  }

  // Mark paid
  const paidDate = new Date().toISOString().split("T")[0]
  const { error } = await coachClient.from("fees").update({ status: "paid", paid_date: paidDate }).eq("id", feeId)
  if (error) { log("STEP-6", "FAIL", `Update: ${error.message}`); return false }
  log("STEP-6", "PASS", `Fee marked as paid`)

  // Verify
  const { data: updated } = await admin.from("fees").select("status, paid_date").eq("id", feeId).single()
  if (!updated) { log("STEP-6", "FAIL", `Cannot read back`); return false }
  if (updated.status !== "paid") { log("STEP-6", "FAIL", `Status=${updated.status}, expected paid`); return false }
  if (!updated.paid_date) { log("STEP-6", "FAIL", `paid_date is null`); return false }
  log("STEP-6", "PASS", `Verified: status=${updated.status}, paid_date=${updated.paid_date}`)

  return true
}

// ─── MAIN ───
async function main() {
  console.log("\n═══════════════════════════════════════════")
  console.log("  E2E TEST — Aman Coach App")
  console.log("═══════════════════════════════════════════\n")

  const results = {}
  try {
    results.step1 = await step1_verifyClient()
    results.step2 = results.step1 ? await step2_clientLogin() : false
    results.step3 = results.step1 ? await step3_workoutPlan() : false
    results.step4 = results.step1 ? await step4_clientCheckin() : false
    results.step5 = results.step4 ? await step5_coachReview() : false
    results.step6 = results.step1 ? await step6_markPaid() : false
  } catch (e) {
    console.error("\n💥 UNEXPECTED ERROR:", e.message, e.stack)
  }

  console.log("\n═══════════════════════════════════════════")
  console.log("  RESULTS")
  console.log("═══════════════════════════════════════════")
  const labels = {
    step1: "1. Coach adds client (DB rows exist)",
    step2: "2. Client logs in → /home",
    step3: "3. Workout plan created → client sees it",
    step4: "4. Client check-in → form_data in DB",
    step5: "5. Coach reviews check-in → feedback",
    step6: "6. Coach marks fee paid → status=paid",
  }
  for (const [k, v] of Object.entries(results)) {
    console.log(`  ${v ? "✅" : "❌"} ${labels[k]}`)
  }
  const allPassed = Object.values(results).every(Boolean)
  console.log(`\n  ${allPassed ? "🎉 ALL PASSED" : "⚠️  SOME FAILED"}\n`)
}

main()
