"use client"

import { useState } from "react"
import { Plus, X } from "lucide-react"
import { Sheet, Label, LineList, Chips, LibraryPicker, inputCls, byKind } from "./parts"
import { plain, type DietRow, type LibraryItem, type Link, type PlanHeader, type WorkoutRow } from "@/lib/plan/types"

const DEFAULT_SETS = ["2 × 10-15 Reps", "1 warm up\n+\n2 × 10-15 Reps", "2 Light warm Up Sets\n+\n2 × 10-15 Reps", "3 × 8-12 Reps", "2 × max", "10-15 reps each", "10 minutes\n(Average BPM: 110-130)"]
const DEFAULT_BANNERS = [
  "*OR (Either Complete Option 1 OR Complete Option 2)*",
  "*10-15 minutes of Normal walk within 10-15 minutes of finishing Meal 1*",
  "*AFTER Minimum 30 - 60 minutes Gap*",
  "*Mechanical Drop SET*",
  "*SUPER SET*",
]
const uniq = (a: string[]) => [...new Set(a.map((s) => s.trim()).filter(Boolean))]
const Hint = () => <p className="text-xs text-text-muted">Tip: put words between *stars* to make them red in the PDF.</p>

function Done({ onClick, label = "Done" }: { onClick: () => void; label?: string }) {
  return <button type="button" onClick={onClick} className="w-full h-14 rounded-2xl bg-accent-orange text-black font-bold text-lg cursor-pointer">{label}</button>
}

/** Edit one exercise / warm-up. Typing a name offers matches from Aman's library. */
export function RowSheet({ row, library, onSave, onClose }: { row: WorkoutRow; library: LibraryItem[]; onSave: (r: WorkoutRow) => void; onClose: () => void }) {
  const [r, setR] = useState<WorkoutRow>(row)
  const kindLib = byKind(library, r.type === "warmup" ? "warmup" : "exercise")
  const q = plain(r.name).toLowerCase().trim()
  const matches = q.length >= 2 ? kindLib.filter((i) => plain(i.name).toLowerCase().includes(q) && plain(i.name) !== plain(r.name)).slice(0, 5) : []
  const sets = uniq([...byKind(library, "sets").map((i) => i.name), ...DEFAULT_SETS]).slice(0, 14)
  const setLink = (i: number, p: Partial<Link>) => setR({ ...r, links: r.links.map((l, j) => (j === i ? { ...l, ...p } : l)) })
  const save = () => { onSave({ ...r, name: r.name.trim(), links: r.links.filter((l) => l.url.trim()), cues: r.cues.filter((c) => c.text.trim()) }); onClose() }

  return (
    <Sheet title={r.type === "warmup" ? "Warm-up" : "Exercise"} onClose={save} footer={<Done onClick={save} />}>
      <div className="grid grid-cols-2 gap-2">
        {(["exercise", "warmup"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setR({ ...r, type: t })} className={`h-11 rounded-xl font-semibold text-sm cursor-pointer ${r.type === t ? "bg-accent-orange text-black" : "bg-white/5 text-white"}`}>
            {t === "exercise" ? "Numbered exercise" : "Warm-up / no number"}
          </button>
        ))}
      </div>
      <div>
        <Label>Name</Label>
        <input value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} placeholder="e.g. Seated Cable Row" className={`${inputCls} h-14 font-semibold`} />
        {matches.length > 0 && (
          <div className="mt-2 space-y-1.5">
            <p className="text-xs text-text-muted">From your list (fills videos, tips and sets):</p>
            {matches.map((m) => (
              <button key={m.id} type="button" onClick={() => setR({ ...r, name: m.name, links: m.data.links ?? [], cues: m.data.cues ?? [], sets: m.data.sets ?? r.sets })} className="w-full text-left px-3.5 py-2.5 rounded-xl bg-accent-orange/10 border border-accent-orange/30 text-sm cursor-pointer">
                {plain(m.name)}
              </button>
            ))}
          </div>
        )}
      </div>
      <div>
        <Label hint="tap a chip or type">Sets & reps</Label>
        <textarea value={r.sets} onChange={(e) => setR({ ...r, sets: e.target.value })} rows={4} className={`${inputCls} py-3 resize-none mb-2`} />
        <Chips items={sets} onPick={(v) => setR({ ...r, sets: v })} />
      </div>
      <div>
        <Label>Video links</Label>
        <div className="space-y-2">
          {r.links.map((l, i) => (
            <div key={i} className="rounded-xl border border-border-subtle p-2.5 space-y-2">
              <div className="flex gap-2">
                <input value={l.label} onChange={(e) => setLink(i, { label: e.target.value })} placeholder="Button name (Video / Technique Reference)" className={`${inputCls} h-11 text-sm`} />
                <button type="button" onClick={() => setR({ ...r, links: r.links.filter((_, j) => j !== i) })} aria-label="Remove link" className="size-11 shrink-0 grid place-items-center rounded-lg bg-danger/10 text-danger cursor-pointer"><X className="size-4" /></button>
              </div>
              <input value={l.url} onChange={(e) => setLink(i, { url: e.target.value })} placeholder="Paste YouTube / Instagram link" inputMode="url" className={`${inputCls} h-11 text-sm`} />
            </div>
          ))}
          <button type="button" onClick={() => setR({ ...r, links: [...r.links, { label: r.links.length ? "Reference " + (r.links.length + 1) : "Video", url: "" }] })} className="h-11 px-4 rounded-xl bg-white/5 text-white font-semibold text-sm flex items-center gap-1.5 cursor-pointer"><Plus className="size-4" /> Add video link</button>
        </div>
      </div>
      <div>
        <Label>Tips for the client</Label>
        <LineList lines={r.cues.map((c) => c.text)} onChange={(l) => setR({ ...r, cues: l.map((text) => ({ text })) })} placeholder="e.g. Pause at top for 2 seconds" addLabel="Pick" />
        <div className="mt-2"><Hint /></div>
      </div>
    </Sheet>
  )
}

/** Red full-width line (OR / walk / drop set). */
export function BannerSheet({ text, library, onSave, onClose }: { text: string; library: LibraryItem[]; onSave: (t: string) => void; onClose: () => void }) {
  const [t, setT] = useState(text)
  const save = () => { onSave(t.trim()); onClose() }
  return (
    <Sheet title="Red line" onClose={save} footer={<Done onClick={save} />}>
      <textarea autoFocus value={t} onChange={(e) => setT(e.target.value)} rows={3} className={`${inputCls} py-3 resize-none`} placeholder="*OR (Either Complete Option 1 OR Complete Option 2)*" />
      <Hint />
      <Label>Your usual lines</Label>
      <Chips items={uniq([...byKind(library, "banner").map((i) => i.name), ...DEFAULT_BANNERS]).slice(0, 16)} onPick={setT} />
    </Sheet>
  )
}

/** One meal (or option of a meal): name, foods, supplements. */
export function MealSheet({ row, library, onSave, onClose }: { row: DietRow; library: LibraryItem[]; onSave: (r: DietRow) => void; onClose: () => void }) {
  const [r, setR] = useState<DietRow>(row)
  const save = () => { onSave({ ...r, items: r.items.filter((i) => i.text.trim()), supplements: r.supplements.filter((i) => i.text.trim()) }); onClose() }
  return (
    <Sheet title="Meal" onClose={save} footer={<Done onClick={save} />}>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-3 sm:col-span-1"><Label>Meal</Label><input value={r.label} onChange={(e) => setR({ ...r, label: e.target.value })} placeholder="MEAL 1" className={`${inputCls} h-12 font-semibold`} /></div>
        <div className="col-span-2 sm:col-span-1"><Label>Time / name</Label><input value={r.sub} onChange={(e) => setR({ ...r, sub: e.target.value })} placeholder="Breakfast" className={`${inputCls} h-12`} /></div>
        <div><Label>Option</Label><input value={r.option} onChange={(e) => setR({ ...r, option: e.target.value })} placeholder="Option 1" className={`${inputCls} h-12`} /></div>
      </div>
      <div>
        <Label>Foods</Label>
        <LineList lines={r.items.map((i) => i.text)} onChange={(l) => setR({ ...r, items: l.map((text) => ({ text })) })} placeholder="e.g. 200ml Nestle Skimmed Milk" library={byKind(library, "food")} addLabel="Pick foods" />
      </div>
      <div>
        <Label>Supplements</Label>
        <LineList lines={r.supplements.map((i) => i.text)} onChange={(l) => setR({ ...r, supplements: l.map((text) => ({ text })) })} placeholder="e.g. 1 Omega 3 (With or After Meal)" library={byKind(library, "supplement")} addLabel="Pick supplements" />
      </div>
      <p className="text-xs text-text-muted">Tip: *4* makes the 4 red. Shop links from your old plans come along when you pick from your list.</p>
    </Sheet>
  )
}

/** Page-1 client table + measurements. Filled from the app, every cell editable. */
export function HeaderSheet({ header, onSave, onClose }: { header: PlanHeader; onSave: (h: PlanHeader) => void; onClose: () => void }) {
  const [h, setH] = useState<PlanHeader>(header)
  const save = () => { onSave(h); onClose() }
  const setRow = (i: number, p: Partial<PlanHeader["rows"][number]>) => setH({ ...h, rows: h.rows.map((r, j) => (j === i ? { ...r, ...p } : r)) })
  const setVal = (mi: number, di: number, v: string) =>
    setH({ ...h, measures: h.measures.map((m, j) => (j === mi ? { ...m, values: h.dates.map((_, k) => (k === di ? v : m.values[k] ?? "")) } : m)) })
  return (
    <Sheet title="Client details" onClose={save} footer={<Done onClick={save} />}>
      <label className="flex items-center gap-3 text-base cursor-pointer">
        <input type="checkbox" checked={h.show} onChange={(e) => setH({ ...h, show: e.target.checked })} className="size-6 accent-[#FF6A1A]" /> Show on page 1
      </label>
      <div className="space-y-2">
        {h.rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <input value={r.label} onChange={(e) => setRow(i, { label: e.target.value })} className={`${inputCls} h-11 text-sm text-text-muted`} />
            <input value={r.value} onChange={(e) => setRow(i, { value: e.target.value })} className={`${inputCls} h-11 text-sm font-semibold`} />
            <button type="button" onClick={() => setH({ ...h, rows: h.rows.filter((_, j) => j !== i) })} aria-label="Remove" className="size-11 grid place-items-center rounded-lg bg-danger/10 text-danger cursor-pointer"><X className="size-4" /></button>
          </div>
        ))}
        <button type="button" onClick={() => setH({ ...h, rows: [...h.rows, { label: "", value: "" }] })} className="h-11 px-4 rounded-xl bg-white/5 text-white font-semibold text-sm flex items-center gap-1.5 cursor-pointer"><Plus className="size-4" /> Add row</button>
      </div>
      <div>
        <Label>Measurements</Label>
        <div className="overflow-x-auto">
          <table className="text-sm">
            <thead>
              <tr>
                <th />
                {h.dates.map((d, i) => (
                  <th key={i} className="p-1"><input value={d} onChange={(e) => setH({ ...h, dates: h.dates.map((x, j) => (j === i ? e.target.value : x)) })} className={`${inputCls} h-10 w-28 text-xs text-center`} /></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {h.measures.map((m, mi) => (
                <tr key={mi}>
                  <td className="p-1"><input value={m.label} onChange={(e) => setH({ ...h, measures: h.measures.map((x, j) => (j === mi ? { ...x, label: e.target.value } : x)) })} className={`${inputCls} h-10 w-36 text-xs`} /></td>
                  {h.dates.map((_, di) => (
                    <td key={di} className="p-1"><input value={m.values[di] ?? ""} onChange={(e) => setVal(mi, di, e.target.value)} className={`${inputCls} h-10 w-28 text-center font-semibold`} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
          <button type="button" onClick={() => setH({ ...h, dates: [...h.dates, ""] })} className="h-10 px-3 rounded-xl bg-white/5 text-sm font-semibold cursor-pointer">+ Date column</button>
          <button type="button" onClick={() => setH({ ...h, measures: [...h.measures, { label: "", values: [] }] })} className="h-10 px-3 rounded-xl bg-white/5 text-sm font-semibold cursor-pointer">+ Measurement</button>
          {h.dates.length > 0 && <button type="button" onClick={() => setH({ ...h, dates: h.dates.slice(0, -1), measures: h.measures.map((m) => ({ ...m, values: m.values.slice(0, h.dates.length - 1) })) })} className="h-10 px-3 rounded-xl bg-danger/10 text-danger text-sm font-semibold cursor-pointer">Remove last date</button>}
        </div>
      </div>
    </Sheet>
  )
}

export type Action = { label: string; danger?: boolean; run: () => void }
export function ActionSheet({ title, actions, onClose }: { title: string; actions: Action[]; onClose: () => void }) {
  return (
    <Sheet title={title} onClose={onClose}>
      <div className="grid gap-2 pb-2">
        {actions.map((a) => (
          <button key={a.label} type="button" onClick={() => { a.run(); onClose() }} className={`h-13 min-h-[52px] rounded-xl font-semibold text-base text-left px-4 cursor-pointer ${a.danger ? "bg-danger/10 text-danger" : "bg-white/5 text-white"}`}>
            {a.label}
          </button>
        ))}
      </div>
    </Sheet>
  )
}

/** Pick several exercises / warm-ups at once, or type a new one. */
export function AddRowsPicker({ kind, library, onAdd, onNew, onClose }: { kind: "exercise" | "warmup"; library: LibraryItem[]; onAdd: (items: LibraryItem[]) => void; onNew: () => void; onClose: () => void }) {
  return (
    <LibraryPicker
      title={kind === "exercise" ? "Add exercises" : "Add warm-ups"}
      items={byKind(library, kind)}
      multi
      onNew={onNew}
      onPick={onAdd}
      onClose={onClose}
    />
  )
}
