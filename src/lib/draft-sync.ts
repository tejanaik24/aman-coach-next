import { createClient } from "@/lib/supabase/client"

// Form drafts already live in localStorage (per phone). This mirrors them to the server so a
// client can start a long form on one phone and finish it on another, or after clearing the browser.
type FormType = "standard_joining" | "antenatal_joining" | "checkin"

const timers = new Map<string, ReturnType<typeof setTimeout>>()
const localKey = (userId: string, formType: FormType) => `draft_${formType}_${userId}`

/** Save to the server 2 seconds after the last change. Never throws: local draft still works. */
export function queueDraftUpload(userId: string, formType: FormType, data: unknown) {
  const key = localKey(userId, formType)
  clearTimeout(timers.get(key))
  timers.set(
    key,
    setTimeout(async () => {
      try {
        await createClient()
          .from("form_drafts")
          .upsert({ user_id: userId, form_type: formType, data, updated_at: new Date().toISOString() }, { onConflict: "user_id,form_type" })
      } catch {
        // offline or table missing: ignore
      }
    }, 2000)
  )
}

/** If this phone has no local draft but the server does, copy it down. Returns true when it did. */
export async function hydrateDraft(userId: string, formType: FormType): Promise<boolean> {
  try {
    if (localStorage.getItem(localKey(userId, formType))) return false
    const { data } = await createClient()
      .from("form_drafts")
      .select("data")
      .eq("user_id", userId)
      .eq("form_type", formType)
      .maybeSingle()
    if (data?.data) {
      localStorage.setItem(localKey(userId, formType), JSON.stringify(data.data))
      return true
    }
  } catch {
    // ignore
  }
  return false
}

export function clearServerDraft(userId: string | undefined, formType: FormType) {
  if (!userId) return
  clearTimeout(timers.get(localKey(userId, formType)))
  void (async () => {
    try {
      await createClient().from("form_drafts").delete().eq("user_id", userId).eq("form_type", formType)
    } catch {
      // ignore
    }
  })()
}
