// Plan Maker data. One JSON document per plan, shaped like Aman's own Google Docs plans.
// Text fields support two marks Aman already uses: *red text* and [label](url).

export type PlanKind = "workout" | "diet"

export interface Line { text: string }
export interface Link { label: string; url: string }

export interface HeaderRow { label: string; value: string }
export interface Measure { label: string; values: string[] }
export interface PlanHeader {
  show: boolean
  rows: HeaderRow[] // Client's Name, Height, DOB, Next Check IN Date, Coaching Week, Next Payment Due Date
  dates: string[] // measurement columns
  measures: Measure[] // Weight, Abdomen (At Navel)
}

export type RepsScheme =
  | { min: number; max: number }
  | "max"
  | { seconds: number }
  | number
  | string

export interface WorkoutRow {
  id: string
  type: "warmup" | "exercise" | "banner"
  name: string
  links: Link[]
  cues: Line[]
  sets: string // generated scheme text or custom text for backward compat
  kind?: "strength" | "cardio" | "stretch"
  warmupSets?: number
  workingSets?: number
  reps?: RepsScheme
  restSec?: number
  tempo?: string
  rir?: string | number
  side?: "each side" | boolean
  technique?: string // "drop set" | "double drop" | "pause" | "partials" etc.
  why?: string
  group?: string
  custom?: boolean
  customSets?: string
  // Cardio specific
  cardioMachine?: string // Bike, Incline walk, Elliptical, Stair, Outdoor
  cardioMinutes?: number
  cardioZone?: string // Z1 - Z5
  cardioRestHr?: number
  // Stretch specific
  stretchType?: "dynamic" | "static"
  stretchHoldSec?: number
}

export interface WorkoutDay {
  id: string
  title: string
  rest: boolean
  leftNote: string
  rightNote: string
  rows: WorkoutRow[]
  groups?: Record<string, { note: string; restAfterSec?: number }>
}

export interface WorkoutData {
  heading: string // WORKOUT
  tag: string // DELOAD (red)
  rules: string // markdown-lite rules pages
  days: WorkoutDay[]
  note: string
  closing: string
}

export interface DietRow {
  id: string
  type: "meal" | "banner"
  label: string // MEAL 1 / As you WAKE UP / banner text
  sub: string // Breakfast
  option: string // Option 1
  items: Line[]
  supplements: Line[]
}
export interface DietPlan { id: string; title: string; rows: DietRow[] }
export interface DietData {
  rules: string
  plans: DietPlan[]
  cardio: string
  closing: string
}

export interface PlanDocData {
  header: PlanHeader
  showRules: boolean
  showWhy?: boolean // whether to show scientific why notes in PDF (default on)
  markChanges: boolean // lines changed since the copied plan print in red
  base?: Record<string, string> // id -> text in the plan this was copied from
  workout?: WorkoutData
  diet?: DietData
}

export interface PlanDoc {
  id: string
  coach_id: string
  client_id: string | null
  kind: PlanKind
  title: string
  period_start: string | null
  period_end: string | null
  data: PlanDocData
  is_template: boolean
  sent_at: string | null
  document_id: string | null
  created_at: string
  updated_at: string
}

export type LibraryKind = "exercise" | "warmup" | "food" | "supplement" | "banner" | "sets"
export interface LibraryItem {
  id: string
  kind: LibraryKind
  name: string
  data: {
    links?: Link[]
    cues?: Line[]
    sets?: string
    why?: string
    muscle?: string
    kind?: "strength" | "cardio" | "stretch"
    equipment?: string
  }
  use_count: number
}

export const uid = () => Math.random().toString(36).slice(2, 10)

/** Fresh ids everywhere so a copied plan never shares row ids with its source. */
export function cloneWithNewIds<T>(v: T): T {
  return JSON.parse(JSON.stringify(v), (k, val) => (k === "id" && typeof val === "string" ? uid() : val))
}

/** Builds the legacy "sets" string from structured row fields. If custom = true, uses typed text. */
export function schemeText(row: Partial<WorkoutRow> & { sets?: string | number; workingSets?: number }): string {
  if (row.custom) {
    return row.customSets || (typeof row.sets === "string" ? row.sets : "")
  }

  // Cardio scheme
  if (row.kind === "cardio") {
    const mins = row.cardioMinutes ?? 10
    const mach = row.cardioMachine ? ` · ${row.cardioMachine}` : ""
    const zone = row.cardioZone ? ` · Zone ${row.cardioZone.replace(/^Z/i, "")}` : ""
    return `${mins} min${mach}${zone}`
  }

  // Stretch scheme
  if (row.kind === "stretch") {
    if (row.stretchType === "static") {
      const sets = row.workingSets ?? (typeof row.sets === "number" ? row.sets : 2)
      const sec = row.stretchHoldSec ?? 30
      return `${sets} sets × ${sec}s hold`
    }
    // Dynamic stretch
    let rStr = "10-15"
    if (row.reps !== undefined && row.reps !== null) {
      if (typeof row.reps === "object" && "min" in row.reps && "max" in row.reps) {
        rStr = `${row.reps.min}-${row.reps.max}`
      } else if (typeof row.reps === "string" || typeof row.reps === "number") {
        rStr = String(row.reps)
      }
    }
    const side = row.side ? " each side" : " each"
    return `${rStr} reps${side}`
  }

  // If already an existing legacy string and no structured fields specified
  if (row.warmupSets === undefined && row.workingSets === undefined && !row.reps && typeof row.sets === "string" && row.sets.trim()) {
    return row.sets
  }

  // Strength / default scheme
  const warmup = row.warmupSets ?? 0
  const warmupPart = warmup > 0 ? (warmup === 1 ? "1 warm up" : `${warmup} warm up`) : ""

  const workingCount = row.workingSets ?? (typeof row.sets === "number" ? row.sets : 3)

  let repsText = "10-15 Reps"
  if (row.reps !== undefined && row.reps !== null) {
    if (typeof row.reps === "object" && "min" in row.reps && "max" in row.reps) {
      repsText = `${row.reps.min}-${row.reps.max} Reps`
    } else if (typeof row.reps === "object" && "seconds" in row.reps) {
      repsText = `${row.reps.seconds}s hold`
    } else if (row.reps === "max") {
      repsText = "max"
    } else if (typeof row.reps === "string") {
      const lower = row.reps.toLowerCase()
      repsText = lower.includes("rep") || lower.includes("sec") || lower === "max" ? row.reps : `${row.reps} Reps`
    } else if (typeof row.reps === "number") {
      repsText = `${row.reps} Reps`
    }
  }

  if (row.side) {
    repsText += " each side"
  }

  // 0 working sets = reps only, no set count (Aman 26 Oct: "20-30 Reps total, in as many sets")
  const workingPart = workingCount > 0 ? `${workingCount} × ${repsText}` : `${repsText} total`

  if (warmupPart && workingPart) return `${warmupPart} + ${workingPart}`
  if (workingPart) return workingPart
  if (warmupPart) return warmupPart
  return "3 × 10-15 Reps"
}

/** Karvonen Heart Rate calculation: target = rest + pct * (max - rest) */
export function cardioBpm(age?: number | null, restHr?: number | null, zone?: string | null): string {
  if (!age || age <= 0 || isNaN(age)) {
    return "Average BPM 110-130"
  }
  const rest = restHr && restHr > 0 ? restHr : 60
  const max = 220 - age
  const reserve = max - rest
  if (reserve <= 0) return "Average BPM 110-130"

  let pctLow = 0.60
  let pctHigh = 0.70
  const z = (zone || "Z2").toUpperCase().replace(/[^Z1-5]/g, "")
  if (z === "Z1") { pctLow = 0.50; pctHigh = 0.60 }
  else if (z === "Z2") { pctLow = 0.60; pctHigh = 0.70 }
  else if (z === "Z3") { pctLow = 0.70; pctHigh = 0.80 }
  else if (z === "Z4") { pctLow = 0.80; pctHigh = 0.90 }
  else if (z === "Z5") { pctLow = 0.90; pctHigh = 1.00 }

  const targetLow = Math.round(rest + pctLow * reserve)
  const targetHigh = Math.round(rest + pctHigh * reserve)
  return `${targetLow}-${targetHigh} bpm`
}

/** Parses DOB string (e.g. "15/04/1990" or "1990-04-15") and returns age in years. */
export function calcAge(dobStr?: string | null): number | undefined {
  if (!dobStr) return undefined
  const s = dobStr.trim()
  if (!s) return undefined

  let birthDate: Date | null = null
  const dmy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/)
  if (dmy) {
    const day = parseInt(dmy[1], 10)
    const month = parseInt(dmy[2], 10) - 1
    const year = parseInt(dmy[3], 10)
    birthDate = new Date(year, month, day)
  } else {
    const parsed = new Date(s)
    if (!isNaN(parsed.getTime())) birthDate = parsed
  }

  if (!birthDate || isNaN(birthDate.getTime())) return undefined

  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age > 0 && age < 120 ? age : undefined
}

/** Every editable text in a plan keyed by a stable path. Used to spot changes vs the copied plan. */
export function textIndex(d: PlanDocData): Record<string, string> {
  const out: Record<string, string> = {}
  d.workout?.days.forEach((day) => {
    if (day.groups) {
      Object.entries(day.groups).forEach(([gid, g]) => {
        out[day.id + ":group:" + gid + ":note"] = g.note
        if (g.restAfterSec !== undefined) out[day.id + ":group:" + gid + ":rest"] = String(g.restAfterSec)
      })
    }
    day.rows.forEach((r) => {
      out[r.id + ":name"] = r.name
      out[r.id + ":sets"] = r.sets
      if (r.why) out[r.id + ":why"] = r.why
      if (r.kind) out[r.id + ":kind"] = r.kind
      if (r.technique) out[r.id + ":technique"] = r.technique
      if (r.tempo) out[r.id + ":tempo"] = r.tempo
      if (r.rir !== undefined) out[r.id + ":rir"] = String(r.rir)
      if (r.restSec !== undefined) out[r.id + ":restSec"] = String(r.restSec)
      if (r.group) out[r.id + ":group"] = r.group
      if (r.cardioMachine) out[r.id + ":cardioMachine"] = r.cardioMachine
      if (r.cardioZone) out[r.id + ":cardioZone"] = r.cardioZone
      r.cues.forEach((c, i) => (out[r.id + ":cue" + i] = c.text))
    })
  })
  d.diet?.plans.forEach((p) =>
    p.rows.forEach((r) => {
      out[r.id + ":label"] = r.label
      r.items.forEach((c, i) => (out[r.id + ":item" + i] = c.text))
      r.supplements.forEach((c, i) => (out[r.id + ":sup" + i] = c.text))
    }),
  )
  return out
}

/** Markdown-lite tokens: *red*, [label](url). */
export type Token = { text: string; red?: boolean; url?: string }
export function tokenize(src: string): Token[] {
  const out: Token[] = []
  const re = /\[([^\]]*)\]\(([^)\s]+)\)|\*([^*]+)\*/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) {
    if (m.index > last) out.push({ text: src.slice(last, m.index) })
    if (m[1] !== undefined) {
      // a link may itself contain red marks
      for (const t of tokenize(m[1])) out.push({ ...t, url: m[2] })
    } else out.push({ text: m[3], red: true })
    last = m.index + m[0].length
  }
  if (last < src.length) out.push({ text: src.slice(last) })
  return out
}
export const plain = (s: string) => tokenize(s).map((t) => t.text).join("")
