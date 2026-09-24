import { createClient } from "@supabase/supabase-js"

export const automationSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
)

export function isAuthorizedAutomationRequest(request: Request): boolean {
  const secrets = [process.env.AUTOMATION_SECRET, process.env.CRON_SECRET].filter(Boolean) as string[]
  if (!secrets.length) return false
  const header = request.headers.get("x-automation-secret")
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  return secrets.some((secret) => header === secret || bearer === secret)
}

export function todayInIndia(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

export function daysBetween(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`)
  const end = Date.parse(`${to}T00:00:00Z`)
  return Math.floor((end - start) / 86_400_000)
}

export async function getUserEmailMap(userIds: Array<string | null>): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(userIds.filter((id): id is string => Boolean(id)))]
  const results = await Promise.allSettled(
    uniqueIds.map(async (id) => {
      const { data, error } = await automationSupabase.auth.admin.getUserById(id)
      if (error || !data.user.email) return null
      return [id, data.user.email] as const
    })
  )
  return new Map(
    results.flatMap((result) => result.status === "fulfilled" && result.value ? [result.value] : [])
  )
}
