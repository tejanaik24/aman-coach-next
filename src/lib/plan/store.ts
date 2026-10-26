import { format, addDays } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import {
  cloneWithNewIds, plain, schemeText, textIndex, uid,
  type DietData, type LibraryItem, type LibraryKind, type PlanDoc, type PlanDocData, type PlanHeader, type PlanKind, type WorkoutData,
} from "./types"

const dmy = (d?: string | null) => (d ? format(new Date(d.length === 10 ? d + "T00:00:00" : d), "dd/MM/yyyy") : "")

/** Header Aman puts on page 1, filled from what the app already knows. Every value stays editable. */
export async function loadHeader(clientId: string): Promise<PlanHeader> {
  const sb = createClient()
  const today = format(new Date(), "yyyy-MM-dd")
  const [c, joining, checkins, nextCheckin, nextFee] = await Promise.all([
    sb.from("clients").select("start_date, end_date, profile:profiles!user_id(name)").eq("id", clientId).single(),
    sb.from("form_submissions").select("form_data, submitted_at").eq("client_id", clientId).in("form_type", ["standard_joining", "antenatal_joining"]).order("submitted_at", { ascending: false }).limit(1),
    sb.from("checkins").select("weight, form_data, submitted_at").eq("client_id", clientId).order("submitted_at", { ascending: false }).limit(3),
    sb.from("followups").select("due_date").eq("client_id", clientId).eq("type", "checkin").is("done_at", null).gte("due_date", today).order("due_date").limit(1),
    sb.from("fees").select("due_date, status").eq("client_id", clientId).neq("status", "paid").order("due_date").limit(1),
  ])
  const client = c.data as unknown as { start_date: string | null; end_date: string | null; profile: { name: string } | { name: string }[] | null } | null
  const prof = Array.isArray(client?.profile) ? client?.profile[0] : client?.profile
  const jf = ((joining.data?.[0]?.form_data ?? {}) as Record<string, unknown>)
  const str = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v) : "")

  // measurement columns: joining form first, then check-ins oldest -> newest
  const cols: { date: string; weight: string; abdomen: string }[] = []
  if (joining.data?.[0]) cols.push({ date: dmy(joining.data[0].submitted_at), weight: str(jf.q8_weight ?? jf.q55_weight ?? jf.q59_weight), abdomen: str(jf.q57_abdomen ?? jf.q60_abdomen) })
  for (const ci of [...(checkins.data ?? [])].reverse()) {
    const f = (ci.form_data ?? {}) as Record<string, unknown>
    cols.push({ date: dmy(ci.submitted_at), weight: str(ci.weight ?? f.w1_weight), abdomen: str(f.w2_abdomen) })
  }
  const shown = cols.filter((c) => c.weight || c.abdomen).slice(-4)

  return {
    show: true,
    rows: [
      { label: "Client's Name", value: prof?.name ?? "" },
      { label: "Height", value: str(jf.q7_height) },
      { label: "Date of Birth", value: str(jf.q6_dob) },
      { label: "Next Check IN Date", value: dmy(nextCheckin.data?.[0]?.due_date) },
      { label: "Next Payment Due Date", value: dmy(nextFee.data?.[0]?.due_date ?? client?.end_date) },
    ],
    dates: shown.map((c) => c.date),
    measures: [
      { label: "Weight (kg)", values: shown.map((c) => c.weight) },
      { label: "Abdomen (At Navel)", values: shown.map((c) => c.abdomen) },
    ],
  }
}

export async function blankData(kind: PlanKind, header: PlanHeader): Promise<PlanDocData> {
  const seed = (await import("./seed-aman.json")).default
  const s = seed as unknown as { workout: WorkoutData; diet: DietData }
  return kind === "workout"
    ? {
        header,
        showRules: true,
        showWhy: true,
        markChanges: false,
        workout: {
          ...cloneWithNewIds(s.workout),
          days: [
            {
              id: uid(),
              rest: false,
              title: "DAY 1: New Day",
              leftNote: "",
              rightNote: "",
              rows: [],
              groups: {},
            },
          ],
        },
      }
    : { header, showRules: true, markChanges: false, diet: { ...cloneWithNewIds(s.diet), plans: [] } }
}

/** Aman's two real plans (from his 20 Oct PDFs) become his first templates, once. */
export async function ensureStarterTemplates() {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return
  const { count } = await sb.from("plan_docs").select("id", { count: "exact", head: true }).eq("coach_id", user.id).eq("is_template", true)
  if (count) return
  const seed = (await import("./seed-aman.json")).default
  const s = seed as unknown as { workout: WorkoutData; diet: DietData }
  const header: PlanHeader = { show: true, rows: [], dates: [], measures: [] }
  const docs = [
    { kind: "workout", title: "Upper/Lower 4 day (Deload)", data: { header, showRules: true, showWhy: true, markChanges: false, workout: cloneWithNewIds(s.workout) } },
    { kind: "diet", title: "Non-veg + Veg Tuesday", data: { header, showRules: true, markChanges: false, diet: cloneWithNewIds(s.diet) } },
  ] as const
  await sb.from("plan_docs").insert(docs.map((d) => ({ ...d, coach_id: user.id, is_template: true })))
  await saveToLibrary(docs[0].data as PlanDocData)
  await saveToLibrary(docs[1].data as PlanDocData)
}

/** Start a plan for a client: copy their last plan ("next block"), a template, or blank. */
export async function createPlan(opts: { clientId: string | null; kind: PlanKind; from?: PlanDoc | null; asTemplate?: boolean }): Promise<string> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error("Not signed in")
  const header = opts.clientId ? await loadHeader(opts.clientId) : { show: true, rows: [], dates: [], measures: [] }
  let data: PlanDocData
  let title = opts.kind === "workout" ? "Workout plan" : "Diet plan"
  if (opts.from) {
    data = cloneWithNewIds(opts.from.data)
    data.header = header
    data.buildSeconds = 0
    // only a copy of this client's own last plan highlights what changed
    const sameClient = !!opts.clientId && opts.from.client_id === opts.clientId
    data.markChanges = sameClient
    data.base = sameClient ? textIndex(data) : undefined
    title = opts.from.title
  } else data = await blankData(opts.kind, header)

  const start = new Date()
  const { data: row, error } = await sb.from("plan_docs").insert({
    coach_id: user.id,
    client_id: opts.clientId,
    kind: opts.kind,
    title,
    period_start: format(start, "yyyy-MM-dd"),
    period_end: format(addDays(start, 13), "yyyy-MM-dd"),
    data,
    is_template: !!opts.asTemplate,
  }).select("id").single()
  if (error) throw error
  return row.id as string
}

export async function saveDoc(id: string, patch: Partial<Pick<PlanDoc, "title" | "period_start" | "period_end" | "data" | "is_template">>) {
  const { error } = await createClient().from("plan_docs").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id)
  if (error) throw error
}

/** Everything Aman writes goes into his library, so next time it is one tap. */
export async function saveToLibrary(d: PlanDocData) {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return
  const rows = new Map<string, { kind: LibraryKind; name: string; data: LibraryItem["data"] }>()
  const put = (kind: LibraryKind, name: string, data: LibraryItem["data"] = {}) => {
    const n = name.trim()
    if (n.length < 2 || n.length > 400) return
    rows.set(kind + "|" + n.toLowerCase(), { kind, name: n, data })
  }
  d.workout?.days.forEach((day) =>
    day.rows.forEach((r) => {
      if (r.type === "banner") put("banner", r.name)
      else put(r.type, plain(r.name), {
        links: r.links,
        cues: r.cues,
        sets: r.sets,
        why: r.why,
        kind: r.kind,
        rx: {
          warmupSets: r.warmupSets, workingSets: r.workingSets, reps: r.reps, restSec: r.restSec, tempo: r.tempo,
          rir: r.rir, side: r.side, technique: r.technique, custom: r.custom, customSets: r.customSets,
        },
      })
      if (r.sets.trim()) put("sets", r.sets.trim())
    }),
  )
  d.diet?.plans.forEach((p) =>
    p.rows.forEach((r) => {
      if (r.type === "banner") put("banner", r.label)
      r.items.forEach((i) => put("food", i.text))
      r.supplements.forEach((i) => put("supplement", i.text))
    }),
  )
  // Each sent plan counts once per name, so the most used exercises rank first in search
  const { data: old } = await sb.from("coach_library").select("kind, name, use_count").eq("coach_id", user.id).limit(5000)
  const count = new Map(((old ?? []) as { kind: string; name: string; use_count: number | null }[]).map((o) => [o.kind + "|" + o.name.toLowerCase(), o.use_count ?? 0]))
  const list = [...rows.entries()].map(([k, r]) => ({ ...r, coach_id: user.id, use_count: (count.get(k) ?? 0) + 1, updated_at: new Date().toISOString() }))
  for (let i = 0; i < list.length; i += 200) {
    await sb.from("coach_library").upsert(list.slice(i, i + 200), { onConflict: "coach_id,kind,name" })
  }
}

/**
 * One-time catch-up: use_count was never filled, so count how often each saved exercise appears in
 * Aman's client workout plans. Runs only while every count is still 0; only updates rows that exist
 * (a new empty row would hide its built-in twin's videos and tips).
 */
export async function backfillUsage(items: LibraryItem[]): Promise<boolean> {
  const own = items.filter((i) => !i.id.startsWith("builtin_") && (i.kind === "exercise" || i.kind === "warmup"))
  if (!own.length || own.some((i) => i.use_count > 0)) return false
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return false
  const { data: docs } = await sb.from("plan_docs").select("data").eq("coach_id", user.id).eq("kind", "workout").eq("is_template", false).limit(500)
  const seen = new Map<string, number>()
  for (const d of (docs ?? []) as { data: PlanDocData }[]) {
    const names = new Set<string>()
    d.data?.workout?.days.forEach((day) => day.rows.forEach((r) => r.type !== "banner" && names.add(plain(r.name).toLowerCase().trim())))
    names.forEach((n) => seen.set(n, (seen.get(n) ?? 0) + 1))
  }
  const updates = own.filter((i) => seen.has(i.name.toLowerCase().trim()))
  if (!updates.length) return false
  const rows = updates.map((i) => ({ coach_id: user.id, kind: i.kind, name: i.name, use_count: seen.get(i.name.toLowerCase().trim())! }))
  for (let i = 0; i < rows.length; i += 200) {
    await sb.from("coach_library").upsert(rows.slice(i, i + 200), { onConflict: "coach_id,kind,name" })
  }
  return true
}

/**
 * Loads library items: Aman's library items come FIRST (they have his custom links and cues),
 * followed by built-in database items. If Aman edited why/muscle, his edit wins.
 */
export async function loadLibrary(): Promise<LibraryItem[]> {
  const { data } = await createClient().from("coach_library").select("id, kind, name, data, use_count").order("updated_at", { ascending: false }).limit(3000)
  const allUser = ((data ?? []) as LibraryItem[]).map((it) => ({
    ...it,
    data: it.data ?? {},
  }))

  // Create lookup for fast matching (hidden rows still block their built-in twin)
  const userMap = new Map<string, LibraryItem>()
  allUser.forEach((i) => {
    userMap.set(plain(i.name).toLowerCase().trim(), i)
  })
  const userItems = allUser.filter((i) => !(i.data as { hidden?: boolean }).hidden)

  // Built-in database items
  const exerciseDb = (await import("./exercise-db.json")).default
  const dbExercises = (exerciseDb.exercises ?? []) as Array<{
    name: string
    muscle: string
    equipment: string
    kind: "strength" | "cardio" | "stretch"
    defaultScheme?: { warmupSets?: number; sets?: number; reps?: string; restSec?: number }
    why?: string
    cues?: string[]
    links?: { label: string; url: string }[]
  }>

  // Enrich user items with why / muscle from DB if user item is missing them
  userItems.forEach((it) => {
    const matched = dbExercises.find((e) => plain(e.name).toLowerCase() === plain(it.name).toLowerCase().trim())
    if (matched) {
      if (!it.data.why && matched.why) it.data.why = matched.why
      if (!it.data.muscle && matched.muscle) it.data.muscle = matched.muscle
      if (!it.data.kind && matched.kind) it.data.kind = matched.kind
      if (!it.data.equipment && matched.equipment) it.data.equipment = matched.equipment
    }
  })

  // Built-in items not yet saved in coach_library
  const builtinItems: LibraryItem[] = []
  dbExercises.forEach((ex) => {
    const key = plain(ex.name).toLowerCase().trim()
    if (!userMap.has(key)) {
      const libKind: LibraryKind = ex.kind === "stretch" || ex.kind === "cardio" ? "warmup" : "exercise"
      builtinItems.push({
        id: "builtin_" + ex.name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase(),
        kind: libKind,
        name: ex.name,
        data: {
          links: ex.links ?? [],
          cues: (ex.cues ?? []).map((t) => ({ text: t })),
          sets: schemeText({
            warmupSets: ex.defaultScheme?.warmupSets,
            workingSets: ex.defaultScheme?.sets,
            reps: ex.defaultScheme?.reps,
            kind: ex.kind,
          }),
          why: ex.why,
          muscle: ex.muscle,
          kind: ex.kind,
          equipment: ex.equipment,
        },
        use_count: 0,
      })
    }
  })

  // Aman's items first, then built-in database items
  return [...userItems, ...builtinItems]
}
