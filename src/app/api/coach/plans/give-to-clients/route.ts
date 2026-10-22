import { NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { automationSupabase as admin } from "@/lib/automation"
import { schedulePlanUpdateReminder } from "@/lib/plan/send"

export async function POST(request: Request) {
  try {
    const authSupabase = await createServerClient()
    const { data: { user } } = await authSupabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: coachProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    if (coachProfile?.role !== "coach") {
      return NextResponse.json({ error: "Forbidden: Coach access required" }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const planId = typeof body.planId === "string" ? body.planId : ""
    const planType = body.planType === "maker" ? "maker" : "pdf"
    const clientIds: string[] = Array.isArray(body.clientIds) ? body.clientIds : []
    const reminderDate = typeof body.reminderDate === "string" ? body.reminderDate : ""

    if (!planId) {
      return NextResponse.json({ error: "Plan ID is required" }, { status: 400 })
    }
    if (clientIds.length === 0) {
      return NextResponse.json({ error: "Select at least one client" }, { status: 400 })
    }

    // Fetch target clients with their profiles
    const { data: targetClients, error: clientsErr } = await admin
      .from("clients")
      .select("id, user_id, package, start_date, end_date, profile:profiles!user_id(name, phone)")
      .in("id", clientIds)

    if (clientsErr || !targetClients || targetClients.length === 0) {
      return NextResponse.json({ error: "No valid clients found" }, { status: 404 })
    }

    const results: { clientId: string; name: string; success: boolean }[] = []

    if (planType === "maker") {
      // 1. Plan Maker document (from plan_docs)
      const { data: srcDoc, error: docErr } = await admin
        .from("plan_docs")
        .select("*")
        .eq("id", planId)
        .single()

      if (docErr || !srcDoc) {
        return NextResponse.json({ error: "Source plan document not found" }, { status: 404 })
      }

      for (const tc of targetClients) {
        const rawProf = tc.profile as unknown
        const prof = Array.isArray(rawProf) ? rawProf[0] : (rawProf as { name?: string; phone?: string } | null)
        const clientName = prof?.name?.trim() || "Client"

        // Clone the plan data and update header with client name & dates
        const clonedData = JSON.parse(JSON.stringify(srcDoc.data || {}))
        if (clonedData.header && Array.isArray(clonedData.header.rows)) {
          for (const row of clonedData.header.rows) {
            if (row.label && row.label.toLowerCase().includes("name")) {
              row.value = clientName
            }
          }
        }

        // Insert new plan_doc for this client
        const { data: newDoc, error: insErr } = await admin
          .from("plan_docs")
          .insert({
            coach_id: user.id,
            client_id: tc.id,
            kind: srcDoc.kind,
            title: srcDoc.title,
            is_template: false,
            data: clonedData,
            period_start: tc.start_date || new Date().toISOString().slice(0, 10),
            period_end: tc.end_date || null,
          })
          .select("id")
          .single()

        if (!insErr && newDoc) {
          // If a rendered client_document also existed for the source doc, copy/link it
          const { data: existingDoc } = await admin
            .from("client_documents")
            .select("file_path, note")
            .eq("kind", srcDoc.kind)
            .or(`id.eq.${planId},title.eq.${srcDoc.title}`)
            .limit(1)
            .maybeSingle()

          if (existingDoc?.file_path) {
            await admin.from("client_documents").insert({
              coach_id: user.id,
              client_id: tc.id,
              kind: srcDoc.kind,
              title: srcDoc.title,
              file_path: existingDoc.file_path,
              note: existingDoc.note ?? null,
              is_template: false,
            })
          }

          // Schedule reminder
          if (reminderDate) {
            await schedulePlanUpdateReminder(user.id, tc.id, srcDoc.kind, reminderDate)
          }

          results.push({ clientId: tc.id, name: clientName, success: true })
        } else {
          results.push({ clientId: tc.id, name: clientName, success: false })
        }
      }
    } else {
      // 2. Uploaded PDF plan (from client_documents)
      const { data: srcDoc, error: docErr } = await admin
        .from("client_documents")
        .select("*")
        .eq("id", planId)
        .single()

      if (docErr || !srcDoc) {
        return NextResponse.json({ error: "Source PDF document not found" }, { status: 404 })
      }

      for (const tc of targetClients) {
        const rawProf = tc.profile as unknown
        const prof = Array.isArray(rawProf) ? rawProf[0] : (rawProf as { name?: string; phone?: string } | null)
        const clientName = prof?.name?.trim() || "Client"

        const { error: insErr } = await admin.from("client_documents").insert({
          coach_id: user.id,
          client_id: tc.id,
          kind: srcDoc.kind,
          title: srcDoc.title,
          file_path: srcDoc.file_path,
          note: srcDoc.note ?? null,
          is_template: false,
        })

        if (!insErr) {
          if (reminderDate) {
            await schedulePlanUpdateReminder(user.id, tc.id, srcDoc.kind, reminderDate)
          }
          results.push({ clientId: tc.id, name: clientName, success: true })
        } else {
          results.push({ clientId: tc.id, name: clientName, success: false })
        }
      }
    }

    const successCount = results.filter((r) => r.success).length
    return NextResponse.json({
      success: true,
      count: successCount,
      total: clientIds.length,
      results,
    })
  } catch (error: unknown) {
    const err = error as { message?: string }
    return NextResponse.json({ error: err.message || "Failed to give plan to clients" }, { status: 500 })
  }
}
