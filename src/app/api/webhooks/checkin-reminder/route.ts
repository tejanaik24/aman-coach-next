import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendCheckinReminder } from "@/lib/whatsapp"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(req: Request) {
  return handleReminderTrigger(req)
}

export async function POST(req: Request) {
  return handleReminderTrigger(req)
}

async function handleReminderTrigger(req: Request) {
  try {
    const authHeader = req.headers.get("authorization")
    const secretParam = new URL(req.url).searchParams.get("secret")
    const expectedSecret = process.env.AUTOMATION_SECRET || "akcoach-webhook-2026"

    if (secretParam !== expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Unauthorized automation request" }, { status: 401 })
    }

    // 1. Fetch active clients with profile phone numbers
    const { data: clients, error: clientErr } = await supabase
      .from("clients")
      .select("id, user_id, profiles!inner(name, phone)")
      .eq("status", "active")

    if (clientErr) {
      console.error("Error fetching active clients for reminder:", clientErr)
      return NextResponse.json({ error: clientErr.message }, { status: 500 })
    }

    if (!clients || clients.length === 0) {
      return NextResponse.json({ message: "No active clients found", reminded: 0 })
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const results = []

    for (const client of clients) {
      const profile = client.profiles as any
      const clientName = profile?.name || "Client"
      const phone = profile?.phone

      if (!phone) continue

      // Check if client submitted check-in in past 7 days
      const { data: recentCheckin } = await supabase
        .from("checkins")
        .select("id, submitted_at")
        .eq("client_id", client.id)
        .gte("submitted_at", sevenDaysAgo)
        .maybeSingle()

      if (!recentCheckin) {
        // Send WhatsApp check-in reminder
        const res = await sendCheckinReminder(phone, clientName)
        results.push({
          clientId: client.id,
          clientName,
          phone,
          status: res.success ? "reminder_sent" : "failed",
          error: res.error
        })
      } else {
        results.push({
          clientId: client.id,
          clientName,
          status: "up_to_date"
        })
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalActiveClients: clients.length,
        remindersSent: results.filter(r => r.status === "reminder_sent").length
      },
      details: results
    })
  } catch (err: any) {
    console.error("Check-in reminder handler error:", err)
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
