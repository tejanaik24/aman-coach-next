import { createHmac, timingSafeEqual } from "crypto";
import {
  ackOncePerDay,
  adminDb,
  applyDeliveryStatus,
  coachPhone,
  findCoachId,
  forwardToCoach,
  matchClient,
  type InboundRow,
} from "@/lib/server/whatsapp-inbox";
import { NextResponse } from "next/server";

/**
 * Meta WhatsApp Cloud API Webhook Handler
 *
 * GET: Handles Meta's webhook verification challenge (hub.challenge)
 * POST: Handles incoming messages and message delivery status updates
 */

const VERIFY_TOKEN =
  process.env.META_WA_VERIFY_TOKEN || "akcoach_wa_verify_2026";

function getMetaAppSecret(): string {
  return (
    process.env.META_WA_APP_SECRET ||
    process.env.META_APP_SECRET ||
    process.env.WHATSAPP_APP_SECRET ||
    ""
  ).trim();
}

function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }
  const providedHex = signatureHeader.slice("sha256=".length).trim();
  const expectedHex = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");
  const a = Buffer.from(providedHex, "utf8");
  const b = Buffer.from(expectedHex, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("[Meta WhatsApp Webhook] Challenge verified successfully");
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    console.warn("[Meta WhatsApp Webhook] Verification failed: token mismatch");
    return new Response("Forbidden", { status: 403 });
  } catch (error: unknown) {
    console.error("[Meta WhatsApp Webhook] GET error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const appSecret = getMetaAppSecret();

    if (!appSecret) {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: "Webhook signature secret is not configured" },
          { status: 401 },
        );
      }
    } else {
      const sigHeader = req.headers.get("x-hub-signature-256");
      if (!verifyMetaSignature(rawBody, sigHeader, appSecret)) {
        return NextResponse.json(
          { error: "Invalid webhook signature" },
          { status: 401 },
        );
      }
    }

    let body: Record<string, unknown> | null = null;
    try {
      body = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : null;
    } catch {
      body = null;
    }
    if (!body || body.object !== "whatsapp_business_account") {
      return NextResponse.json({ status: "ignored" }, { status: 200 });
    }

    const entries = Array.isArray(body.entry) ? body.entry : [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field === "messages") {
          const value = change.value || {};

          // 1. Process Inbound Messages from Clients:
          //    save first (so nothing is lost), then forward to Aman, then ack the client.
          const messages = value.messages || [];
          for (const msg of messages) {
            const senderPhone = String(msg.from || ""); // e.g. "919815690656"
            const msgType = String(msg.type || "text");
            const messageId = String(msg.id || "");
            const cleanedCoachPhone = coachPhone().replace(/\D/g, "");

            console.log(
              `[Meta WhatsApp Webhook] Inbound from ${senderPhone} (${msgType}) id=${messageId}`,
            );

            if (!senderPhone || !messageId || senderPhone === cleanedCoachPhone) continue;

            try {
              const db = adminDb();
              const coachId = await findCoachId(db);
              if (!coachId) {
                console.error("[Meta WhatsApp Webhook] No coach profile found; message not saved");
                continue;
              }
              const { clientId, name } = await matchClient(db, coachId, senderPhone);
              const bodyText: string | null =
                msg.text?.body ?? msg.button?.text ?? msg.interactive?.button_reply?.title ?? null;
              const mediaId: string | null =
                msg.image?.id ?? msg.audio?.id ?? msg.video?.id ?? msg.document?.id ?? msg.sticker?.id ?? null;
              const receivedAt = msg.timestamp
                ? new Date(Number(msg.timestamp) * 1000).toISOString()
                : new Date().toISOString();

              // wa_message_id is UNIQUE: if Meta retries this webhook, the insert fails and we stop (no duplicates).
              const { data: saved, error: saveErr } = await db
                .from("whatsapp_inbound")
                .insert({
                  coach_id: coachId,
                  wa_message_id: messageId,
                  from_phone: senderPhone,
                  client_id: clientId,
                  msg_type: msgType,
                  body: bodyText,
                  media_id: mediaId,
                  received_at: receivedAt,
                })
                .select("*")
                .single();
              if (saveErr || !saved) {
                if (saveErr?.code !== "23505") {
                  console.error("[Meta WhatsApp Webhook] Could not save inbound:", saveErr?.message);
                }
                continue;
              }

              const row = saved as InboundRow;
              await forwardToCoach(db, row, name);
              await ackOncePerDay(db, row);
            } catch (err) {
              console.error("[Meta WhatsApp Webhook] Inbound handling failed:", err);
            }
          }

          // 2. Process Message Delivery Statuses (sent, delivered, read, failed)
          const statuses = value.statuses || [];
          for (const status of statuses) {
            if (!status?.id) continue;
            if (status.status === "failed") {
              console.warn(
                `[Meta WhatsApp Webhook] Delivery failed for ${status.id} to ${status.recipient_id}:`,
                status.errors,
              );
            }
            try {
              await applyDeliveryStatus(adminDb(), String(status.id), String(status.status), status.errors);
            } catch (err) {
              console.error("[Meta WhatsApp Webhook] Status update failed:", err);
            }
          }
        }
      }
    }

    // Always respond with 200 OK immediately as required by Meta
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("[Meta WhatsApp Webhook] POST error:", error);
    // Still return 200 so Meta doesn't continuously hammer retries on application errors
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 200 },
    );
  }
}
