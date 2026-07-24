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

const SQL = `
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
`

async function main() {
  console.log("Attempting SQL via multiple methods...\n")

  // Method 1: exec_sql RPC (won't exist, but try)
  try {
    const { data, error } = await admin.rpc("exec_sql", { query: SQL })
    console.log("Method 1 (exec_sql RPC):", error ? `FAIL: ${error.message}` : `OK: ${JSON.stringify(data)}`)
    if (!error) return true
  } catch (e) {
    console.log("Method 1 (exec_sql RPC): FAIL -", e.message)
  }

  // Method 2: Try via PostgREST raw SQL endpoint
  try {
    const resp = await fetch(`${URL}/pg`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SERVICE}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: SQL }),
    })
    console.log("Method 2 (pg endpoint):", resp.status, (await resp.text()).substring(0, 200))
  } catch (e) {
    console.log("Method 2 (pg endpoint): FAIL -", e.message)
  }

  // Method 3: Check current state
  console.log("\n--- Current trigger state ---")
  try {
    // Check profiles columns
    const { data: profiles } = await admin.from("profiles").select("*").limit(1)
    if (profiles?.[0]) {
      console.log("Profiles columns:", Object.keys(profiles[0]).join(", "))
    }

    // Check if we can at least see auth users
    const { data: users } = await admin.auth.admin.listUsers()
    console.log("Auth users count:", users?.users?.length || 0)

    // Try creating a user to see the exact error
    const ts = Date.now()
    const { data: u, error: e } = await admin.auth.admin.createUser({
      email: `trigger-test-${ts}@diagnostic.test`,
      password: "Diagnostic123!",
      email_confirm: true,
      user_metadata: { name: "Diagnostic Test", role: "client" },
    })
    if (e) {
      console.log("\ncreateUser error:", e.message)
      console.log("Status:", e.status)
      console.log("This confirms the trigger is broken.")
      console.log("You MUST run the SQL fix manually in the Supabase Dashboard SQL Editor.")
      console.log("URL: https://supabase.com/dashboard/project/muuegtbyaehlrfqjluqz/sql/new")
    } else {
      console.log("\ncreateUser SUCCESS:", u.user.id)
      // Check if profile was created
      await new Promise(r => setTimeout(r, 1000))
      const { data: profile } = await admin.from("profiles").select("*").eq("id", u.user.id).single()
      if (profile) {
        console.log("Profile auto-created:", JSON.stringify(profile))
      } else {
        console.log("WARNING: User created but profile NOT auto-created by trigger")
      }
    }
  } catch (e) {
    console.log("Diagnostic error:", e.message)
  }

  return false
}

main()
