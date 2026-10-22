import { createClient } from "@/lib/supabase/client"

export const PLAN_BUCKET = "client-documents"

/** Upload a plan file to the private bucket via a signed URL. Returns the storage path. */
export async function uploadPlanFile(file: Blob, filename: string): Promise<string> {
  const res = await fetch("/api/coach/documents/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename }),
  })
  const { path, token, error } = await res.json()
  if (!res.ok) throw new Error(error ?? "Upload failed")
  const up = await createClient().storage.from(PLAN_BUCKET).uploadToSignedUrl(path, token, file)
  if (up.error) throw up.error
  return path as string
}

/** Coach-only reminder to update this client's plan. One open reminder per client + kind. */
export async function schedulePlanUpdateReminder(coachId: string, clientId: string, kind: string, dueDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return
  const supabase = createClient()
  const noteText = `Update ${kind} plan`
  const { data: existing } = await supabase
    .from("followups")
    .select("id, note")
    .eq("coach_id", coachId)
    .eq("client_id", clientId)
    .eq("type", "plan_update")
    .is("done_at", null)
  const match = ((existing ?? []) as { id: string; note: string | null }[]).find((f) => (f.note ?? "").toLowerCase().includes(kind))
  if (match) {
    await supabase.from("followups").update({ due_date: dueDate, note: noteText, auto_created: false }).eq("id", match.id)
  } else {
    await supabase.from("followups").insert({ coach_id: coachId, client_id: clientId, type: "plan_update", due_date: dueDate, note: noteText, auto_created: false })
  }
}
