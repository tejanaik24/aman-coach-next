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

export interface WorkoutRow {
  id: string
  type: "warmup" | "exercise" | "banner"
  name: string
  links: Link[]
  cues: Line[]
  sets: string
}
export interface WorkoutDay {
  id: string
  title: string
  rest: boolean
  leftNote: string
  rightNote: string
  rows: WorkoutRow[]
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
  data: { links?: Link[]; cues?: Line[]; sets?: string }
  use_count: number
}

export const uid = () => Math.random().toString(36).slice(2, 10)

/** Fresh ids everywhere so a copied plan never shares row ids with its source. */
export function cloneWithNewIds<T>(v: T): T {
  return JSON.parse(JSON.stringify(v), (k, val) => (k === "id" && typeof val === "string" ? uid() : val))
}

/** Every editable text in a plan keyed by a stable path. Used to spot changes vs the copied plan. */
export function textIndex(d: PlanDocData): Record<string, string> {
  const out: Record<string, string> = {}
  d.workout?.days.forEach((day) =>
    day.rows.forEach((r) => {
      out[r.id + ":name"] = r.name
      out[r.id + ":sets"] = r.sets
      r.cues.forEach((c, i) => (out[r.id + ":cue" + i] = c.text))
    }),
  )
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
