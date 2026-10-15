import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import {
  sendClientMessageAlert,
  sendWhatsAppText,
  type WhatsAppSendResult,
} from "@/lib/whatsapp"
import { SITE_URL } from "@/lib/site"

/**
 * Server-only. Saves every inbound WhatsApp message and forwards it to Coach Aman,
 * recording whether the forward really reached him.
 */

export type ForwardStatus = "pending" | "sent" | "delivered" | "read" | "failed"

export interface InboundRow {
  id: string
  coach_id: string
  wa_message_id: string
  from_phone: string
  client_id: string | null
  msg_type: string
  body: string | null
  forward_status: ForwardStatus
  forward_method: "text" | "template" | null
  forward_wamid: string | null
  forward_error: string | null
  ack_sent_at: string | null
}

const RANK: Record<ForwardStatus, number> = { pending: 0, failed: 1, sent: 2, delivered: 3, read: 4 }

export function adminDb(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export function coachPhone(): string {
  return process.env.AMAN_WHATSAPP || "+919815690656"
}

export async function findCoachId(db: SupabaseClient): Promise<string | null> {
  const { data } = await db.from("profiles").select("id").eq("role", "coach").limit(1).maybeSingle()
  return (data?.id as string | undefined) ?? null
}

/** Match the sender to a client by the last 10 digits of their phone. */
export async function matchClient(
  db: SupabaseClient,
  coachId: string,
  fromPhone: string,
): Promise<{ clientId: string | null; name: string | null }> {
  const last10 = fromPhone.replace(/\D/g, "").slice(-10)
  if (last10.length < 10) return { clientId: null, name: null }
  const { data: profs } = await db
    .from("profiles")
    .select("id, name")
    .ilike("phone", `%${last10}`)
    .limit(5)
  const ids = (profs ?? []).map((p) => p.id as string)
  if (!ids.length) return { clientId: null, name: null }
  const { data: client } = await db
    .from("clients")
    .select("id, user_id")
    .eq("coach_id", coachId)
    .in("user_id", ids)
    .limit(1)
    .maybeSingle()
  if (!client) return { clientId: null, name: null }
  const name = (profs ?? []).find((p) => p.id === client.user_id)?.name as string | undefined
  return { clientId: client.id as string, name: name ?? null }
}

function describe(row: Pick<InboundRow, "msg_type" | "body">): string {
  if (row.body) return row.body
  const t = row.msg_type
  return t === "text" ? "(empty message)" : `[${t}] — open the app to see it`
}

function errText(r: WhatsAppSendResult): string {
  return (r.error || "unknown error").slice(0, 300)
}

async function save(db: SupabaseClient, id: string, patch: Record<string, unknown>) {
  const { error } = await db.from("whatsapp_inbound").update(patch).eq("id", id)
  if (error) console.error("[WA inbox] could not save status:", error.message)
}

/** Send the approved template when plain text is not allowed (Aman's 24h window closed). */
async function forwardByTemplate(db: SupabaseClient, row: InboundRow, clientName: string | null, priorError?: string) {
  const r = await sendClientMessageAlert(coachPhone(), clientName || "New contact", `+${row.from_phone}`, describe(row))
  if (r.success) {
    await save(db, row.id, {
      forward_status: "sent",
      forward_method: "template",
      forward_wamid: r.messageId ?? null,
      forward_error: null,
    })
    return
  }
  await save(db, row.id, {
    forward_status: "failed",
    forward_method: "template",
    forward_error: [priorError, `template: ${errText(r)}`].filter(Boolean).join(" | ").slice(0, 500),
  })
}

/** First try plain text (free). If Meta refuses, fall back to the template. */
export async function forwardToCoach(db: SupabaseClient, row: InboundRow, clientName: string | null) {
  const who = clientName ? `${clientName} (+${row.from_phone})` : `+${row.from_phone}`
  const text =
    `🚨 *NEW WHATSAPP MESSAGE*\n\n` +
    `👤 *From:* ${who}\n` +
    `💬 "${describe(row)}"\n\n` +
    `👉 Reply on your WhatsApp:\nhttps://wa.me/${row.from_phone}\n` +
    `📥 All messages: ${SITE_URL}/messages`
  const r = await sendWhatsAppText(coachPhone(), text)
  if (r.success) {
    await save(db, row.id, {
      forward_status: "sent",
      forward_method: "text",
      forward_wamid: r.messageId ?? null,
      forward_error: null,
    })
    return
  }
  await forwardByTemplate(db, row, clientName, `text: ${errText(r)}`)
}

/**
 * Meta says what happened to a message we sent. Only our forward to Aman is tracked.
 * Text that is accepted but later fails (window closed) is retried as a template.
 */
export async function applyDeliveryStatus(
  db: SupabaseClient,
  wamid: string,
  status: string,
  errors: unknown,
) {
  const { data } = await db.from("whatsapp_inbound").select("*").eq("forward_wamid", wamid).maybeSingle()
  if (!data) return
  const row = data as InboundRow

  if (status === "sent" || status === "delivered" || status === "read") {
    if (RANK[status] > RANK[row.forward_status]) await save(db, row.id, { forward_status: status })
    return
  }
  if (status !== "failed" || row.forward_status === "delivered" || row.forward_status === "read") return

  const first = Array.isArray(errors) ? (errors[0] as { code?: number; title?: string } | undefined) : undefined
  const why = `${first?.code ?? ""} ${first?.title ?? "failed"}`.trim()
  if (row.forward_method === "text") {
    const { name } = await matchClient(db, row.coach_id, row.from_phone)
    await forwardByTemplate(db, row, name, `text: ${why}`)
  } else {
    await save(db, row.id, { forward_status: "failed", forward_error: `${row.forward_method ?? ""}: ${why}`.slice(0, 500) })
  }
}

/** Tell the client once per 24h that Aman has it. */
export async function ackOncePerDay(db: SupabaseClient, row: InboundRow) {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const { data: recent } = await db
    .from("whatsapp_inbound")
    .select("id")
    .eq("from_phone", row.from_phone)
    .gte("ack_sent_at", since)
    .limit(1)
  if (recent && recent.length) return
  const r = await sendWhatsAppText(
    row.from_phone,
    `👋 *Hi! Coach Aman received your message.*\n\n` +
      `Coach Aman will reply directly to you from his personal WhatsApp line (+91 98156 90656) shortly! 💪`,
  )
  if (r.success) await save(db, row.id, { ack_sent_at: new Date().toISOString() })
}
