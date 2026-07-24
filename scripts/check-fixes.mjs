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
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY

const admin = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } })

async function fix() {
  // Try to add must_reset_password column by selecting it first to see if it exists
  console.log("=== Checking must_reset_password column ===")
  const { error: checkErr } = await admin.from("profiles").select("must_reset_password").limit(1)
  if (checkErr && checkErr.message.includes("does not exist")) {
    console.log("Column must_reset_password does NOT exist — need to add via SQL")
    console.log("SUPABASE_FIX_NEEDED=true")
  } else {
    console.log("Column must_reset_password exists")
    console.log("SUPABASE_FIX_NEEDED=false")
  }

  // Try to create a user to test the trigger
  console.log("\n=== Testing auth trigger ===")
  const testEmail = `trigger-test-${Date.now()}@test.com`
  const { data, error } = await admin.auth.admin.createUser({
    email: testEmail,
    password: "Test1234!",
    email_confirm: true,
    user_metadata: { name: "Trigger Test", role: "client" },
  })
  if (error) {
    console.log("Trigger BROKEN:", error.message)
    console.log("TRIGGER_FIX_NEEDED=true")
  } else {
    console.log("Trigger WORKS — user created:", data.user.id)
    await admin.auth.admin.deleteUser(data.user.id)
    console.log("Cleaned up test user")
    console.log("TRIGGER_FIX_NEEDED=false")
  }
}

fix()
