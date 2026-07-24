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

async function trySQL() {
  // Try the Supabase SQL API endpoint
  const sqlPath = resolve(__dirname, "..", "supabase", "fix-trigger.sql")
  const sql = readFileSync(sqlPath, "utf-8")

  // Method 1: Try /sql endpoint
  console.log("Trying /sql endpoint...")
  const r1 = await fetch(`${URL}/sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE}`,
      "apikey": SERVICE,
    },
    body: JSON.stringify({ query: sql }),
  })
  console.log("Status:", r1.status)
  const t1 = await r1.text()
  console.log("Response:", t1.substring(0, 500))

  // Method 2: Try /rest/v1/rpc with a custom function approach
  console.log("\n--- Trying alternative approach ---")

  // Try to use postgrest to call a non-existent function and see the error
  const r2 = await fetch(`${URL}/rest/v1/rpc/handle_new_user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE}`,
      "apikey": SERVICE,
    },
    body: JSON.stringify({}),
  })
  console.log("RPC test status:", r2.status)

  // Method 3: Try the Management API
  console.log("\n--- Trying Management API ---")
  const projectRef = URL.replace("https://", "").replace(".supabase.co", "")
  const r3 = await fetch(`https://api.supabase.com/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE}`,
    },
    body: JSON.stringify({ query: sql }),
  })
  console.log("Management API status:", r3.status)
  const t3 = await r3.text()
  console.log("Response:", t3.substring(0, 500))
}

trySQL()
