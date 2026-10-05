import type { SupabaseClient } from "@supabase/supabase-js"
import { format, differenceInCalendarDays } from "date-fns"

// Aman's own words (from his old app's "Quick Manage" panel).
export type TileKey = "followups" | "payments" | "renewals" | "enquiries" | "checkins" | "silent" | "calls" | "birthdays"

export const TILE_LABELS: Record<TileKey, string> = {
  followups: "Follow-ups",
  payments: "Pending payments",
  renewals: "Upcoming renewals",
  enquiries: "New enquiries",
  checkins: "Check-ins to review",
  silent: "Not active lately",
  calls: "Today's calls",
  birthdays: "Birthdays",
}

export const TILE_ORDER: TileKey[] = ["followups", "payments", "renewals", "enquiries", "checkins", "silent", "calls", "birthdays"]

export type RowAction =
  | { kind: "followup"; followupId: string; clientId: string }
  | { kind: "paid"; feeId: string; amount: number }
  | { kind: "enquiry"; submissionId: string }
  | { kind: "none" }

export interface QMRow {
  id: string
  tile: TileKey
  name: string
  phone: string | null
  reason: string
  clientId: string | null
  waText: string
  action: RowAction
}

const SILENT_DAYS = 10
const RENEWAL_WINDOW_DAYS = 14
const PAYMENT_WINDOW_DAYS = 7

export function waLink(phone: string | null, text: string): string | null {
  if (!phone) return null
  let digits = phone.replace(/\D/g, "")
  if (digits.length === 10) digits = "91" + digits
  if (digits.length < 11) return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there"
}

function relDay(d: Date, today: Date) {
  const n = differenceInCalendarDays(d, today)
  if (n === 0) return "today"
  if (n === 1) return "tomorrow"
  if (n === -1) return "yesterday"
  return n > 0 ? `in ${n} days` : `${-n} days ago`
}

interface ClientRow {
  id: string
  end_date: string | null
  start_date: string | null
  profile: { name: string | null; phone: string | null } | { name: string | null; phone: string | null }[] | null
}

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v
}

/** One parallel batch, narrow columns. RLS limits every table to this coach. */
export async function fetchQuickManage(supabase: SupabaseClient, coachId: string): Promise<QMRow[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = format(today, "yyyy-MM-dd")
  const plus = (n: number) => format(new Date(today.getTime() + n * 86400000), "yyyy-MM-dd")
  const silentCutoff = new Date(today.getTime() - SILENT_DAYS * 86400000).toISOString()

  const [clientsRes, feesRes, unreviewedRes, recentRes, enquiriesRes, callsRes, followupsRes, dobRes] = await Promise.all([
    supabase
      .from("clients")
      .select("id, end_date, start_date, profile:profiles!user_id(name, phone)")
      .eq("coach_id", coachId)
      .eq("status", "active"),
    supabase
      .from("fees")
      .select("id, client_id, amount, due_date")
      .in("status", ["pending", "overdue"])
      .lte("due_date", plus(PAYMENT_WINDOW_DAYS)),
    supabase.from("checkins").select("id, client_id, submitted_at").is("reviewed_at", null),
    supabase.from("checkins").select("client_id").gte("submitted_at", silentCutoff),
    supabase
      .from("form_submissions")
      .select("id, form_data, submitted_at")
      .eq("form_type", "enquiry")
      .eq("status", "submitted")
      .order("submitted_at", { ascending: false })
      .limit(30),
    supabase
      .from("bookings")
      .select("id, client_id, start_time")
      .eq("booking_date", todayStr)
      .eq("status", "confirmed"),
    // The followups table is new; if it isn't created yet this just returns an error and we show none.
    supabase
      .from("followups")
      .select("id, client_id, type, due_date, note")
      .eq("coach_id", coachId)
      .is("done_at", null)
      .lte("due_date", todayStr)
      .order("due_date"),
    // date of birth comes from the joining questionnaire (form_data.q6_dob)
    supabase
      .from("form_submissions")
      .select("client_id, dob:form_data->>q6_dob")
      .in("form_type", ["standard_joining", "antenatal_joining"])
      .not("client_id", "is", null),
  ])

  const clients = new Map<string, { name: string; phone: string | null; end: string | null; start: string | null }>()
  for (const c of (clientsRes.data ?? []) as unknown as ClientRow[]) {
    const p = one(c.profile)
    clients.set(c.id, { name: p?.name ?? "Client", phone: p?.phone ?? null, end: c.end_date, start: c.start_date })
  }

  const rows: QMRow[] = []

  for (const f of (followupsRes.data ?? []) as { id: string; client_id: string; type: string; due_date: string; note: string | null }[]) {
    const c = clients.get(f.client_id)
    if (!c) continue
    const label = { checkin: "Check-in", payment: "Payment", renewal: "Renewal", feedback: "Feedback", birthday: "Birthday", other: "Follow-up" }[f.type] ?? "Follow-up"
    rows.push({
      id: `fu-${f.id}`, tile: "followups", name: c.name, phone: c.phone, clientId: f.client_id,
      reason: `${label}${f.note ? ` · ${f.note}` : ""} · due ${relDay(new Date(f.due_date + "T00:00:00"), today)}`,
      waText: `Hi ${firstName(c.name)}, this is Aman. Just checking in with you 🙂`,
      action: { kind: "followup", followupId: f.id, clientId: f.client_id },
    })
  }

  for (const f of (feesRes.data ?? []) as { id: string; client_id: string; amount: number; due_date: string }[]) {
    const c = clients.get(f.client_id)
    if (!c) continue
    const amt = `₹${Number(f.amount).toLocaleString("en-IN")}`
    rows.push({
      id: `fee-${f.id}`, tile: "payments", name: c.name, phone: c.phone, clientId: f.client_id,
      reason: `${amt} · due ${relDay(new Date(f.due_date + "T00:00:00"), today)}`,
      waText: `Hi ${firstName(c.name)}, a gentle reminder: your coaching fee of ${amt} is due. Kindly pay when convenient. Thank you! — Aman`,
      action: { kind: "paid", feeId: f.id, amount: Number(f.amount) },
    })
  }

  for (const [id, c] of clients) {
    if (!c.end) continue
    const end = new Date(c.end + "T00:00:00")
    if (differenceInCalendarDays(end, today) > RENEWAL_WINDOW_DAYS) continue
    rows.push({
      id: `ren-${id}`, tile: "renewals", name: c.name, phone: c.phone, clientId: id,
      reason: `Plan ends ${format(end, "d MMM")} (${relDay(end, today)})`,
      waText: `Hi ${firstName(c.name)}, your coaching plan ends on ${format(end, "d MMM")}. Shall we continue your journey? — Aman`,
      action: { kind: "none" },
    })
  }

  for (const e of (enquiriesRes.data ?? []) as { id: string; form_data: Record<string, string> }[]) {
    const d = e.form_data ?? {}
    const phone = d.phone ? `${(d.countryCode || "+91")}${d.phone}` : null
    rows.push({
      id: `enq-${e.id}`, tile: "enquiries", name: d.name || "New enquiry", phone, clientId: null,
      reason: d.interest ? `Interested in: ${d.interest}` : "Enquiry from website",
      waText: `Hi ${firstName(d.name || "")}, thanks for your enquiry at Aman Khurana Fitness. How can I help you with your goals?`,
      action: { kind: "enquiry", submissionId: e.id },
    })
  }

  const seen = new Set<string>()
  for (const k of (unreviewedRes.data ?? []) as { id: string; client_id: string; submitted_at: string }[]) {
    if (seen.has(k.client_id)) continue
    const c = clients.get(k.client_id)
    if (!c) continue
    seen.add(k.client_id)
    rows.push({
      id: `chk-${k.id}`, tile: "checkins", name: c.name, phone: c.phone, clientId: k.client_id,
      reason: `Sent a check-in ${relDay(new Date(k.submitted_at), new Date())}`,
      waText: `Hi ${firstName(c.name)}, I've seen your check-in. Great work, keep going! — Aman`,
      action: { kind: "none" },
    })
  }

  const recent = new Set(((recentRes.data ?? []) as { client_id: string }[]).map((r) => r.client_id))
  for (const [id, c] of clients) {
    if (recent.has(id)) continue
    // brand-new clients haven't had time to check in yet
    if (c.start && differenceInCalendarDays(today, new Date(c.start + "T00:00:00")) < SILENT_DAYS) continue
    rows.push({
      id: `sil-${id}`, tile: "silent", name: c.name, phone: c.phone, clientId: id,
      reason: `No check-in for ${SILENT_DAYS}+ days`,
      waText: `Hi ${firstName(c.name)}, haven't heard from you in a while. How is everything going? Please send your check-in 🙂 — Aman`,
      action: { kind: "none" },
    })
  }

  for (const b of (callsRes.data ?? []) as { id: string; client_id: string; start_time: string }[]) {
    const c = clients.get(b.client_id)
    if (!c) continue
    rows.push({
      id: `call-${b.id}`, tile: "calls", name: c.name, phone: c.phone, clientId: b.client_id,
      reason: `Call at ${b.start_time.slice(0, 5)}`,
      waText: `Hi ${firstName(c.name)}, looking forward to our call today. — Aman`,
      action: { kind: "none" },
    })
  }

  // Birthdays today and in the next 3 days
  const seenBirthday = new Set<string>()
  for (const d of (dobRes.data ?? []) as unknown as { client_id: string; dob: string | null }[]) {
    const c = clients.get(d.client_id)
    if (!c || !d.dob || seenBirthday.has(d.client_id) || !/^\d{4}-\d{2}-\d{2}$/.test(d.dob)) continue
    const [, m, day] = d.dob.split("-").map(Number)
    const next = new Date(today.getFullYear(), m - 1, day)
    if (next < today) next.setFullYear(today.getFullYear() + 1)
    const away = differenceInCalendarDays(next, today)
    if (away > 3) continue
    seenBirthday.add(d.client_id)
    rows.push({
      id: `bday-${d.client_id}`, tile: "birthdays", name: c.name, phone: c.phone, clientId: d.client_id,
      reason: away === 0 ? "Birthday today 🎂" : `Birthday ${relDay(next, today)} 🎂`,
      waText: `Happy Birthday ${firstName(c.name)}! 🎉 Wishing you great health and a strong year ahead. — Aman`,
      action: { kind: "none" },
    })
  }

  return rows
}
