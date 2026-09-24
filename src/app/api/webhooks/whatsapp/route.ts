import { sendWhatsAppText } from "@/lib/whatsapp";
import { NextResponse } from "next/server";

/**
 * Meta WhatsApp Cloud API Webhook Handler
 *
 * GET: Handles Meta's webhook verification challenge (hub.challenge)
 * POST: Handles incoming messages and message delivery status updates
 */

const VERIFY_TOKEN =
  process.env.META_WA_VERIFY_TOKEN || "akcoach_wa_verify_2026";

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

    console.warn(
      "[Meta WhatsApp Webhook] Verification failed: token mismatch",
      { token, expected: VERIFY_TOKEN },
    );
    return new Response("Forbidden", { status: 403 });
  } catch (error: any) {
    console.error("[Meta WhatsApp Webhook] GET error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || body.object !== "whatsapp_business_account") {
      return NextResponse.json({ status: "ignored" }, { status: 200 });
    }

    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field === "messages") {
          const value = change.value || {};

          // 1. Process Inbound Messages from Clients
          const messages = value.messages || [];
          for (const msg of messages) {
            const senderPhone = msg.from; // e.g. "919815690656"
            const msgType = msg.type;
            const textBody = msg.text?.body || "";
            const messageId = msg.id;
            const timestamp = msg.timestamp;

            console.log(
              `[Meta WhatsApp Webhook] Inbound from ${senderPhone} (${msgType}): ${textBody}`,
            );

            // Auto-Forwarding Pipeline:
            // Forward the client's message to Coach Aman's personal phone with a 1-tap wa.me reply link
            const coachPhone = process.env.AMAN_WHATSAPP || "+919815690656";
            const cleanedCoachPhone = coachPhone.replace(/\D/g, "");

            if (senderPhone !== cleanedCoachPhone && textBody) {
              const forwardAlert =
                `🚨 *NEW CLIENT WHATSAPP MESSAGE*\n\n` +
                `👤 *From:* +${senderPhone}\n` +
                `💬 *Message:* "${textBody}"\n\n` +
                `👉 *Tap to reply directly on personal WhatsApp:*\n` +
                `https://wa.me/${senderPhone}`;

              // Send alert to Aman's personal phone
              await sendWhatsAppText(coachPhone, forwardAlert);

              // Auto-acknowledge client so they know Aman is on it
              const clientAck =
                `👋 *Hi! Coach Aman received your message.*\n\n` +
                `Coach Aman will reply directly to you from his personal WhatsApp line (+91 98156 90656) shortly! 💪`;

              await sendWhatsAppText(senderPhone, clientAck);
            }
          }

          // 2. Process Message Delivery Statuses (sent, delivered, read)
          const statuses = value.statuses || [];
          for (const status of statuses) {
            const statusType = status.status; // "sent" | "delivered" | "read" | "failed"
            const recipientPhone = status.recipient_id;
            const messageId = status.id;

            if (statusType === "failed") {
              console.warn(
                `[Meta WhatsApp Webhook] Delivery failed for ${messageId} to ${recipientPhone}:`,
                status.errors,
              );
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
