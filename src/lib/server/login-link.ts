import { createHmac, timingSafeEqual } from "node:crypto"
import { SITE_URL } from "@/lib/site"

// Login links sent on WhatsApp. Supabase's own one-time tokens die after ~1 hour, so a client who
// opened WhatsApp later saw "link expired" (Aman 26 Oct). Instead we send a signed link that lasts
// some days; the one-time Supabase token is only made at the moment the client taps it (/auth/start).
type Kind = "setup" | "login"
const DAYS: Record<Kind, number> = { setup: 7, login: 2 }

function secret(): string {
  const s = process.env.LOGIN_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!s) throw new Error("LOGIN_LINK_SECRET is not set")
  return s
}

const sign = (body: string) => createHmac("sha256", secret()).update(body).digest("base64url")

export function makeLoginLink(userId: string, kind: Kind): string {
  const body = Buffer.from(JSON.stringify({ u: userId, k: kind, e: Date.now() + DAYS[kind] * 86400_000 })).toString("base64url")
  return `${SITE_URL}/auth/start?t=${body}.${sign(body)}`
}

/** Returns the user id and kind when the link is genuine and not past its date, else null. */
export function readLoginLink(t: string | null | undefined): { userId: string; kind: Kind } | null {
  const [body, sig] = String(t ?? "").split(".")
  if (!body || !sig) return null
  const want = Buffer.from(sign(body))
  const got = Buffer.from(sig)
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as { u?: string; k?: Kind; e?: number }
    if (!p.u || (p.k !== "setup" && p.k !== "login") || !p.e || p.e < Date.now()) return null
    return { userId: p.u, kind: p.k }
  } catch {
    return null
  }
}
