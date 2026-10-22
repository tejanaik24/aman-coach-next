"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { format } from "date-fns"
import { ArrowLeft, Check, Eye, MoreHorizontal, Plus, Send, Undo2, FileText, Play, Moon } from "lucide-react"
import { plain, uid, type DietPlan, type DietRow, type LibraryItem, type PlanDoc, type PlanDocData, type WorkoutDay, type WorkoutRow } from "@/lib/plan/types"
import { saveDoc } from "@/lib/plan/store"
import { inputCls, Label } from "./parts"
import { ActionSheet, AddRowsPicker, BannerSheet, HeaderSheet, MealSheet, RowSheet, type Action } from "./sheets"
import SendSheet from "./SendSheet"

type Open =
  | { k: "row"; day: string; row: string }
  | { k: "banner"; day: string; row: string }
  | { k: "meal"; plan: string; row: string }
  | { k: "dbanner"; plan: string; row: string }
  | { k: "add"; day: string; kind: "exercise" | "warmup" }
  | { k: "actions"; title: string; actions: Action[] }
  | { k: "header" }
  | { k: "send" }
  | null

const move = <T,>(a: T[], i: number, d: number) => {
  const j = i + d
  if (j < 0 || j >= a.length) return
  ;[a[i], a[j]] = [a[j], a[i]]
}

export default function PlanEditor({ initial, library, client, onLibraryChange }: {
  initial: PlanDoc
  library: LibraryItem[]
  client: { name: string; phone: string | null } | null
  onLibraryChange: () => void
}) {
  const router = useRouter()
  const [doc, setDoc] = useState(initial)
  const [past, setPast] = useState<PlanDoc[]>([])
  const [saved, setSaved] = useState<"saved" | "saving" | "error">("saved")
  const [open, setOpen] = useState<Open>(null)
  const [tab, setTab] = useState(0) // diet plan tab
  const first = useRef(true)

  // ---- edits with undo
  const docRef = useRef(doc)
  docRef.current = doc
  const edit = useCallback((fn: (d: PlanDoc) => void) => {
    const cur = docRef.current
    const next = structuredClone(cur)
    fn(next)
    docRef.current = next
    setPast((p) => [...p.slice(-49), cur])
    setDoc(next)
  }, [])
  const data = (fn: (d: PlanDocData) => void) => edit((d) => fn(d.data))
  const undo = () => {
    if (!past.length) return
    setDoc(past[past.length - 1])
    setPast(past.slice(0, -1))
  }

  // ---- autosave (debounced)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    setSaved("saving")
    const t = setTimeout(() => {
      saveDoc(doc.id, { title: doc.title, period_start: doc.period_start, period_end: doc.period_end, data: doc.data })
        .then(() => setSaved("saved"))
        .catch(() => setSaved("error"))
    }, 700)
    return () => clearTimeout(t)
  }, [doc])

  async function openPreview() {
    const w = window.open("", "_blank") // open now so phones don't block the popup
    try {
      const { renderPlanPdf } = await import("@/lib/plan/pdf")
      const url = URL.createObjectURL(await renderPlanPdf(doc))
      if (w) w.location.href = url
      else window.location.href = url
    } catch {
      w?.close()
      toast.error("Could not make the preview")
    }
  }

  const d = doc.data
  const changedIds = useMemo(() => {
    const set = new Set<string>()
    if (!d.markChanges || !d.base) return set
    const base = d.base
    const check = (id: string, key: string, text: string) => { if (base[id + key] !== text) set.add(id) }
    d.workout?.days.forEach((day) => day.rows.forEach((r) => { check(r.id, ":name", r.name); check(r.id, ":sets", r.sets); r.cues.forEach((c, i) => check(r.id, ":cue" + i, c.text)) }))
    d.diet?.plans.forEach((p) => p.rows.forEach((r) => { check(r.id, ":label", r.label); r.items.forEach((c, i) => check(r.id, ":item" + i, c.text)); r.supplements.forEach((c, i) => check(r.id, ":sup" + i, c.text)) }))
    return set
  }, [d])

  // ---- workout helpers
  const findDay = (pd: PlanDocData, id: string) => pd.workout!.days.find((x) => x.id === id)!
  const nextDayNo = () => (d.workout?.days.length ?? 0) + 1
  const addDay = (rest: boolean) => data((pd) => {
    const prev = pd.workout!.days.filter((x) => !x.rest).at(-1)
    pd.workout!.days.push({
      id: uid(), rest,
      title: `DAY ${nextDayNo()}: ${rest ? "REST/CARDIO" : "New Day"}`,
      leftNote: prev?.leftNote ?? "", rightNote: prev?.rightNote ?? "", rows: [],
    })
  })
  const dayActions = (day: WorkoutDay, i: number): Action[] => [
    { label: day.rest ? "Make it a training day" : "Make it a rest day", run: () => data((pd) => { findDay(pd, day.id).rest = !day.rest }) },
    { label: "Duplicate day", run: () => data((pd) => { const c = structuredClone(day); c.id = uid(); c.rows.forEach((r) => (r.id = uid())); c.title = c.title.replace(/^DAY\s*\d+/i, `DAY ${pd.workout!.days.length + 1}`); pd.workout!.days.splice(i + 1, 0, c) }) },
    { label: "Move up", run: () => data((pd) => move(pd.workout!.days, i, -1)) },
    { label: "Move down", run: () => data((pd) => move(pd.workout!.days, i, 1)) },
    { label: "Edit the red notes in the table header", run: () => setOpen({ k: "banner", day: day.id, row: "__notes" }) },
    { label: "Delete day", danger: true, run: () => { if (confirm(`Delete ${day.title}?`)) data((pd) => { pd.workout!.days.splice(i, 1) }) } },
  ]
  const rowActions = (day: WorkoutDay, r: WorkoutRow, i: number): Action[] => [
    { label: "Move up", run: () => data((pd) => move(findDay(pd, day.id).rows, i, -1)) },
    { label: "Move down", run: () => data((pd) => move(findDay(pd, day.id).rows, i, 1)) },
    { label: "Duplicate", run: () => data((pd) => { findDay(pd, day.id).rows.splice(i + 1, 0, { ...structuredClone(r), id: uid() }) }) },
    { label: "Add red line below", run: () => { const id = uid(); data((pd) => { findDay(pd, day.id).rows.splice(i + 1, 0, { id, type: "banner", name: "*Mechanical Drop SET*", links: [], cues: [], sets: "" }) }); setOpen({ k: "banner", day: day.id, row: id }) } },
    { label: "Delete", danger: true, run: () => data((pd) => { findDay(pd, day.id).rows.splice(i, 1) }) },
  ]
  const newRow = (dayId: string, type: "exercise" | "warmup") => {
    const id = uid()
    data((pd) => { findDay(pd, dayId).rows.push({ id, type, name: "", links: [], cues: [], sets: "" }) })
    setOpen({ k: "row", day: dayId, row: id })
  }

  // ---- diet helpers
  const plans = d.diet?.plans ?? []
  const plan = plans[Math.min(tab, plans.length - 1)]
  const findPlan = (pd: PlanDocData, id: string) => pd.diet!.plans.find((x) => x.id === id)!
  const mealActions = (p: DietPlan, r: DietRow, i: number): Action[] => [
    ...(r.type === "meal" ? [{ label: "Add another option of this meal", run: () => data((pd) => {
      const rows = findPlan(pd, p.id).rows
      const opts = rows.filter((x) => x.type === "meal" && x.label === r.label && x.option).length || 1
      const next = opts + 1
      const copy: DietRow = { ...structuredClone(r), id: uid(), option: `Option ${next}` }
      const orText = `*OR (Either Complete ${Array.from({ length: next }, (_, k) => `Option ${k + 1}`).join(" OR ")})*`
      if (!r.option) rows[i] = { ...rows[i], option: "Option 1" }
      let at = i + 1
      while (at < rows.length && (rows[at].type === "banner" ? /^\*?OR\b/i.test(plain(rows[at].label)) : rows[at].label === r.label)) at++
      rows.splice(at, 0, { id: uid(), type: "banner", label: orText, sub: "", option: "", items: [], supplements: [] }, copy)
    }) }] : []),
    { label: "Move up", run: () => data((pd) => move(findPlan(pd, p.id).rows, i, -1)) },
    { label: "Move down", run: () => data((pd) => move(findPlan(pd, p.id).rows, i, 1)) },
    { label: "Duplicate", run: () => data((pd) => { findPlan(pd, p.id).rows.splice(i + 1, 0, { ...structuredClone(r), id: uid() }) }) },
    { label: "Add red line below", run: () => { const id = uid(); data((pd) => { findPlan(pd, p.id).rows.splice(i + 1, 0, { id, type: "banner", label: "", sub: "", option: "", items: [], supplements: [] }) }); setOpen({ k: "dbanner", plan: p.id, row: id }) } },
    { label: "Delete", danger: true, run: () => data((pd) => { findPlan(pd, p.id).rows.splice(i, 1) }) },
  ]
  const planActions = (p: DietPlan, i: number): Action[] => [
    { label: "Copy this whole diet (e.g. Veg for Tuesdays)", run: () => { data((pd) => { const c = structuredClone(p); c.id = uid(); c.title = "VEG DIET PLAN (For Tuesdays)"; c.rows.forEach((r) => (r.id = uid())); pd.diet!.plans.splice(i + 1, 0, c) }); setTab(i + 1) } },
    { label: "Delete this diet", danger: true, run: () => { if (confirm(`Delete ${p.title}?`)) { data((pd) => { pd.diet!.plans.splice(i, 1) }); setTab(0) } } },
  ]

  // ---- sheet targets
  const openRow = open?.k === "row" ? d.workout?.days.find((x) => x.id === open.day)?.rows.find((r) => r.id === open.row) : undefined
  const openBannerDay = open?.k === "banner" ? d.workout?.days.find((x) => x.id === open.day) : undefined
  const openBanner = open?.k === "banner" ? openBannerDay?.rows.find((r) => r.id === open.row) : undefined
  const openMeal = open?.k === "meal" || open?.k === "dbanner" ? d.diet?.plans.find((x) => x.id === open.plan)?.rows.find((r) => r.id === open.row) : undefined

  const back = () => router.push(doc.client_id ? `/clients/${doc.client_id}` : "/plans/library")

  return (
    <div>
      <div className="max-w-2xl mx-auto w-full pb-40">
        {/* top bar */}
        <div className="sticky top-0 z-40 -mx-4 px-4 py-3 bg-bg-primary/90 backdrop-blur border-b border-border-subtle flex items-center gap-2">
          <button type="button" onClick={back} aria-label="Back" className="size-11 grid place-items-center rounded-full bg-white/5 cursor-pointer"><ArrowLeft className="size-5" /></button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-widest text-accent-orange font-bold truncate">
              {doc.is_template ? "Template" : client?.name ?? ""} · {doc.kind === "workout" ? "Workout" : "Diet"}
            </p>
            <p className="text-xs text-text-muted flex items-center gap-1 whitespace-nowrap">
              {saved === "saved" ? <><Check className="size-3.5 text-success" /> Saved</> : saved === "saving" ? "Saving…" : <span className="text-danger">Not saved</span>}
              {doc.sent_at && <span className="text-success">· Sent {format(new Date(doc.sent_at), "d MMM")}</span>}
            </p>
          </div>
          <button type="button" onClick={undo} disabled={!past.length} aria-label="Undo" className="size-11 grid place-items-center rounded-full bg-white/5 disabled:opacity-30 cursor-pointer"><Undo2 className="size-5" /></button>
          <button type="button" onClick={openPreview} className="h-11 px-3.5 rounded-full bg-white/10 font-semibold text-sm flex items-center gap-1.5 cursor-pointer"><Eye className="size-4" /> PDF</button>
          {!doc.is_template && <button type="button" onClick={() => setOpen({ k: "send" })} className="h-11 px-4 rounded-full bg-accent-orange text-black font-bold text-sm flex items-center gap-1.5 cursor-pointer"><Send className="size-4" /> Send</button>}
        </div>

        {/* title + period */}
        <div className="pt-5 space-y-3">
          <textarea value={doc.title} onChange={(e) => edit((x) => { x.title = e.target.value.replace(/\n/g, " ") })} rows={doc.title.length > 22 ? 2 : 1} placeholder="Plan name, e.g. High Intensity High Volume" className="w-full bg-transparent font-heading italic text-3xl leading-tight outline-none resize-none placeholder:text-white/25" />
          <div className="grid grid-cols-2 gap-2">
            <div><Label>From</Label><input type="date" value={doc.period_start ?? ""} onChange={(e) => edit((x) => { x.period_start = e.target.value || null })} className={`${inputCls} h-12 [color-scheme:dark]`} /></div>
            <div><Label>To</Label><input type="date" value={doc.period_end ?? ""} onChange={(e) => edit((x) => { x.period_end = e.target.value || null })} className={`${inputCls} h-12 [color-scheme:dark]`} /></div>
          </div>
          {doc.kind === "workout" && d.workout && (
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Heading</Label><input value={d.workout.heading} onChange={(e) => data((pd) => { pd.workout!.heading = e.target.value })} className={`${inputCls} h-12`} /></div>
              <div><Label hint="red tag">Phase</Label><input value={d.workout.tag} onChange={(e) => data((pd) => { pd.workout!.tag = e.target.value })} placeholder="DELOAD / HYPERTROPHY" className={`${inputCls} h-12`} /></div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setOpen({ k: "header" })} className="h-11 px-4 rounded-xl bg-white/5 border border-border-subtle text-sm font-semibold cursor-pointer">Client details & measurements</button>
            <Toggle on={d.showRules} label="Rules pages" onClick={() => data((pd) => { pd.showRules = !pd.showRules })} />
            {d.base && <Toggle on={d.markChanges} label="Changes in red" onClick={() => data((pd) => { pd.markChanges = !pd.markChanges })} />}
          </div>
        </div>

        {/* WORKOUT */}
        {d.workout && (
          <div className="mt-6 space-y-5">
            {d.workout.days.map((day, di) => {
              let n = 0
              return (
                <section key={day.id} className="rounded-3xl bg-bg-card border border-border-subtle overflow-hidden">
                  <div className="flex items-center gap-2 px-4 pt-4 pb-3">
                    {day.rest && <Moon className="size-5 text-text-muted shrink-0" />}
                    <input value={day.title} onChange={(e) => data((pd) => { findDay(pd, day.id).title = e.target.value })} className="min-w-0 flex-1 bg-transparent font-heading italic text-xl outline-none" />
                    <button type="button" onClick={() => setOpen({ k: "actions", title: day.title, actions: dayActions(day, di) })} aria-label="Day options" className="size-11 grid place-items-center rounded-full bg-white/5 cursor-pointer"><MoreHorizontal className="size-5" /></button>
                  </div>
                  {!day.rest && (
                    <>
                      <div className="divide-y divide-border-subtle border-t border-border-subtle">
                        {day.rows.map((r, ri) => {
                          const num = r.type === "exercise" ? ++n : 0
                          if (r.type === "banner") return (
                            <div key={r.id} className="flex items-center bg-danger/[0.07]">
                              <button type="button" onClick={() => setOpen({ k: "banner", day: day.id, row: r.id })} className="flex-1 text-left px-4 py-3 text-danger font-semibold text-sm cursor-pointer">{plain(r.name) || "Red line"}</button>
                              <More onClick={() => setOpen({ k: "actions", title: plain(r.name), actions: rowActions(day, r, ri) })} />
                            </div>
                          )
                          return (
                            <div key={r.id} className={`flex items-stretch ${r.type === "warmup" ? "bg-white/[0.025]" : ""}`}>
                              <button type="button" onClick={() => setOpen({ k: "row", day: day.id, row: r.id })} className="flex-1 min-w-0 text-left px-4 py-3 flex gap-3 cursor-pointer">
                                {num ? <span className="size-7 shrink-0 rounded-full bg-accent-orange text-black text-sm font-bold grid place-items-center">{num}</span> : <span className="size-7 shrink-0 grid place-items-center"><span className="size-2 rounded-full bg-accent-orange/70" /></span>}
                                <span className="min-w-0 flex-1">
                                  <span className="block font-semibold leading-snug">{plain(r.name) || <span className="text-text-muted">Tap to fill</span>}</span>
                                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-text-muted">
                                    {r.sets && <span className="text-white/80 font-semibold">{r.sets.replace(/\s*\n\s*/g, " ")}</span>}
                                    {r.links.length > 0 && <span className="flex items-center gap-1 text-accent-orange"><Play className="size-3 fill-current" />{r.links.length}</span>}
                                    {r.cues.length > 0 && <span>{r.cues.length} tip{r.cues.length > 1 ? "s" : ""}</span>}
                                    {changedIds.has(r.id) && <span className="text-danger font-bold">changed</span>}
                                  </span>
                                </span>
                              </button>
                              <More onClick={() => setOpen({ k: "actions", title: plain(r.name) || "Exercise", actions: rowActions(day, r, ri) })} />
                            </div>
                          )
                        })}
                      </div>
                      <div className="grid grid-cols-3 gap-2 p-3 border-t border-border-subtle">
                        <AddBtn label="Exercises" primary onClick={() => setOpen({ k: "add", day: day.id, kind: "exercise" })} />
                        <AddBtn label="Warm-up" onClick={() => setOpen({ k: "add", day: day.id, kind: "warmup" })} />
                        <AddBtn label="Red line" onClick={() => { const id = uid(); data((pd) => { findDay(pd, day.id).rows.push({ id, type: "banner", name: "", links: [], cues: [], sets: "" }) }); setOpen({ k: "banner", day: day.id, row: id }) }} />
                      </div>
                    </>
                  )}
                </section>
              )
            })}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => addDay(false)} className="h-14 rounded-2xl bg-accent-orange text-black font-bold flex items-center justify-center gap-2 cursor-pointer"><Plus className="size-5" /> Training day</button>
              <button type="button" onClick={() => addDay(true)} className="h-14 rounded-2xl bg-white/10 font-bold flex items-center justify-center gap-2 cursor-pointer"><Moon className="size-5" /> Rest day</button>
            </div>
          </div>
        )}

        {/* DIET */}
        {d.diet && (
          <div className="mt-6 space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {plans.map((p, i) => (
                <button key={p.id} type="button" onClick={() => setTab(i)} className={`h-11 px-4 rounded-full whitespace-nowrap text-sm font-bold cursor-pointer ${i === tab ? "bg-accent-orange text-black" : "bg-white/5"}`}>{plain(p.title) || `Diet ${i + 1}`}</button>
              ))}
              <button type="button" onClick={() => { data((pd) => { pd.diet!.plans.push({ id: uid(), title: "NON - VEG DIET PLAN", rows: [] }) }); setTab(plans.length) }} className="h-11 px-4 rounded-full whitespace-nowrap text-sm font-bold bg-white/5 flex items-center gap-1 cursor-pointer"><Plus className="size-4" /> Diet</button>
            </div>
            {plan && (
              <section className="rounded-3xl bg-bg-card border border-border-subtle overflow-hidden">
                <div className="flex items-center gap-2 px-4 pt-4 pb-3">
                  <input value={plan.title} onChange={(e) => data((pd) => { findPlan(pd, plan.id).title = e.target.value })} className="min-w-0 flex-1 bg-transparent font-heading italic text-xl outline-none" />
                  <button type="button" onClick={() => setOpen({ k: "actions", title: plan.title, actions: planActions(plan, tab) })} aria-label="Diet options" className="size-11 grid place-items-center rounded-full bg-white/5 cursor-pointer"><MoreHorizontal className="size-5" /></button>
                </div>
                <div className="divide-y divide-border-subtle border-t border-border-subtle">
                  {plan.rows.map((r, ri) => r.type === "banner" ? (
                    <div key={r.id} className="flex items-center bg-danger/[0.07]">
                      <button type="button" onClick={() => setOpen({ k: "dbanner", plan: plan.id, row: r.id })} className="flex-1 text-left px-4 py-3 text-danger font-semibold text-sm cursor-pointer">{plain(r.label) || "Red line"}</button>
                      <More onClick={() => setOpen({ k: "actions", title: plain(r.label), actions: mealActions(plan, r, ri) })} />
                    </div>
                  ) : (
                    <div key={r.id} className="flex items-stretch">
                      <button type="button" onClick={() => setOpen({ k: "meal", plan: plan.id, row: r.id })} className="flex-1 min-w-0 text-left px-4 py-3 cursor-pointer">
                        <span className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-bold">{r.label || "Meal"}</span>
                          {r.sub && <span className="text-text-muted text-sm italic">{r.sub}</span>}
                          {r.option && <span className="text-danger text-xs font-bold">{r.option}</span>}
                          {changedIds.has(r.id) && <span className="text-danger text-xs font-bold">changed</span>}
                        </span>
                        <span className="block mt-1.5 space-y-1">
                          {r.items.map((it, k) => <span key={k} className="block text-sm text-white/80 leading-snug">• {plain(it.text)}</span>)}
                          {r.supplements.length > 0 && <span className="block text-xs text-accent-orange mt-1">+ {r.supplements.map((x) => plain(x.text)).join(" · ")}</span>}
                        </span>
                      </button>
                      <More onClick={() => setOpen({ k: "actions", title: r.label || "Meal", actions: mealActions(plan, r, ri) })} />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 p-3 border-t border-border-subtle">
                  <AddBtn label="Meal" primary onClick={() => { const id = uid(); const count = plan.rows.filter((x) => x.type === "meal" && /^MEAL\s*\d/i.test(x.label)).length; data((pd) => { findPlan(pd, plan.id).rows.push({ id, type: "meal", label: `MEAL ${count + 1}`, sub: "", option: "", items: [], supplements: [] }) }); setOpen({ k: "meal", plan: plan.id, row: id }) }} />
                  <AddBtn label="Red line" onClick={() => { const id = uid(); data((pd) => { findPlan(pd, plan.id).rows.push({ id, type: "banner", label: "", sub: "", option: "", items: [], supplements: [] }) }); setOpen({ k: "dbanner", plan: plan.id, row: id }) }} />
                </div>
              </section>
            )}
          </div>
        )}

        {/* pages text */}
        <details className="mt-6 rounded-3xl bg-bg-card border border-border-subtle p-4 group">
          <summary className="cursor-pointer font-semibold flex items-center gap-2"><FileText className="size-5 text-accent-orange" /> Rules pages & sign-off</summary>
          <div className="mt-4 space-y-4">
            <p className="text-xs text-text-muted">“- ” makes a bullet, “1. ” a number, *stars* make text red. These pages are copied from your saved plan each time.</p>
            <div><Label>Rules</Label><textarea value={d.workout?.rules ?? d.diet?.rules ?? ""} onChange={(e) => data((pd) => { if (pd.workout) pd.workout.rules = e.target.value; else if (pd.diet) pd.diet.rules = e.target.value })} rows={12} className={`${inputCls} py-3 text-sm leading-relaxed`} /></div>
            {d.diet && <div><Label>Cardio, steps & breathing page</Label><textarea value={d.diet.cardio} onChange={(e) => data((pd) => { pd.diet!.cardio = e.target.value })} rows={8} className={`${inputCls} py-3 text-sm leading-relaxed`} /></div>}
            {d.workout && <div><Label>Note at the end</Label><textarea value={d.workout.note} onChange={(e) => data((pd) => { pd.workout!.note = e.target.value })} rows={2} className={`${inputCls} py-3 text-sm`} /></div>}
            <div><Label>Sign-off</Label><textarea value={d.workout?.closing ?? d.diet?.closing ?? ""} onChange={(e) => data((pd) => { if (pd.workout) pd.workout.closing = e.target.value; else if (pd.diet) pd.diet.closing = e.target.value })} rows={3} className={`${inputCls} py-3 text-sm`} /></div>
          </div>
        </details>
      </div>

      {/* sheets */}
      {open?.k === "row" && openRow && (
        <RowSheet row={openRow} library={library} onClose={() => setOpen(null)} onSave={(nr) => data((pd) => { const day = findDay(pd, open.day); day.rows = day.rows.map((x) => (x.id === nr.id ? nr : x)) })} />
      )}
      {open?.k === "banner" && openBannerDay && (open.row === "__notes" ? (
        <BannerSheet text={`${openBannerDay.leftNote}\n${openBannerDay.rightNote}`} library={[]} onClose={() => setOpen(null)} onSave={(t) => data((pd) => { const [l, ...rest] = t.split("\n"); const day = findDay(pd, open.day); day.leftNote = l ?? ""; day.rightNote = rest.join(" ") })} />
      ) : openBanner ? (
        <BannerSheet text={openBanner.name} library={library} onClose={() => setOpen(null)} onSave={(t) => data((pd) => { const day = findDay(pd, open.day); if (!t) day.rows = day.rows.filter((x) => x.id !== openBanner.id); else day.rows.find((x) => x.id === openBanner.id)!.name = t })} />
      ) : null)}
      {open?.k === "meal" && openMeal && (
        <MealSheet row={openMeal} library={library} onClose={() => setOpen(null)} onSave={(nr) => data((pd) => { const p = findPlan(pd, open.plan); p.rows = p.rows.map((x) => (x.id === nr.id ? nr : x)) })} />
      )}
      {open?.k === "dbanner" && openMeal && (
        <BannerSheet text={openMeal.label} library={library} onClose={() => setOpen(null)} onSave={(t) => data((pd) => { const p = findPlan(pd, open.plan); if (!t) p.rows = p.rows.filter((x) => x.id !== openMeal.id); else p.rows.find((x) => x.id === openMeal.id)!.label = t })} />
      )}
      {open?.k === "add" && (
        <AddRowsPicker
          kind={open.kind}
          library={library}
          onClose={() => setOpen(null)}
          onNew={() => newRow(open.day, open.kind)}
          onAdd={(items) => { data((pd) => { findDay(pd, open.day).rows.push(...items.map((it) => ({ id: uid(), type: open.kind, name: it.name, links: it.data.links ?? [], cues: it.data.cues ?? [], sets: it.data.sets ?? "" }))) }); setOpen(null); toast.success(`${items.length} added`) }}
        />
      )}
      {open?.k === "actions" && <ActionSheet title={open.title} actions={open.actions} onClose={() => setOpen(null)} />}
      {open?.k === "header" && <HeaderSheet header={d.header} onClose={() => setOpen(null)} onSave={(h) => data((pd) => { pd.header = h })} />}
      {open?.k === "send" && (
        <SendSheet doc={doc} client={client} onClose={() => setOpen(null)} onSent={(sent) => { setDoc(sent); onLibraryChange() }} />
      )}
    </div>
  )
}

function Toggle({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`h-11 px-4 rounded-xl text-sm font-semibold border flex items-center gap-2 cursor-pointer ${on ? "bg-accent-orange/15 border-accent-orange/50 text-accent-orange" : "bg-white/5 border-border-subtle text-text-muted"}`}>
      <span className={`size-4 rounded-full border-2 ${on ? "bg-accent-orange border-accent-orange" : "border-text-muted"}`} /> {label}
    </button>
  )
}
function More({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-label="More options" className="w-12 shrink-0 grid place-items-center text-text-muted cursor-pointer hover:text-white"><MoreHorizontal className="size-5" /></button>
}
function AddBtn({ label, onClick, primary }: { label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer ${primary ? "bg-accent-orange/15 text-accent-orange border border-accent-orange/40" : "bg-white/5"}`}>
      <Plus className="size-4" /> {label}
    </button>
  )
}
