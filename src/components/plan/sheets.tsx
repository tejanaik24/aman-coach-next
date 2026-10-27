"use client"

import { useMemo, useState } from "react"
import { ChevronDown, Plus, Sparkles, X, Heart, Dumbbell, Activity, Check } from "lucide-react"
import { Sheet, Label, LineList, LibraryPicker, inputCls, byKind } from "./parts"
import {
  cardioBpm,
  plain,
  schemeText,
  type DietRow,
  type LibraryItem,
  type Link,
  type PlanHeader,
  type WorkoutRow,
} from "@/lib/plan/types"
import exerciseDb from "@/lib/plan/exercise-db.json"

const uniq = (a: string[]) => [...new Set(a.map((s) => s.trim()).filter(Boolean))]
const Hint = () => <p className="text-xs text-text-muted">Tip: put words between *stars* to make them red in the PDF.</p>

function Done({ onClick, label = "Done" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full h-14 min-h-[56px] rounded-2xl bg-accent-orange text-black font-bold text-lg cursor-pointer active:scale-[0.99] transition-transform"
    >
      {label}
    </button>
  )
}

function Stepper({
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix = "",
}: {
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  suffix?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - step))}
        className="size-12 min-h-[48px] rounded-xl bg-white/10 text-white font-bold text-2xl grid place-items-center disabled:opacity-25 cursor-pointer active:scale-95"
      >
        −
      </button>
      <span className="min-w-16 text-center font-bold text-xl text-white">
        {value}
        {suffix && <span className="text-sm font-normal text-text-muted ml-1">{suffix}</span>}
      </span>
      <button
        type="button"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + step))}
        className="size-12 min-h-[48px] rounded-xl bg-white/10 text-white font-bold text-2xl grid place-items-center disabled:opacity-25 cursor-pointer active:scale-95"
      >
        +
      </button>
    </div>
  )
}

const libName = (s: string) => plain(s).replace(/\s*\([^)]*\breference\b[^)]*\)?/gi, "").trim()

// Short forms Aman types -> words in exercise names
const SHORT: Record<string, string> = {
  db: "dumbbell", bb: "barbell", kb: "kettlebell", sm: "smith", inc: "incline", dec: "decline",
  ext: "extension", ohp: "overhead", rdl: "romanian", bw: "bodyweight",
}
const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean)

// Exercises picked in this visit rank up straight away (the saved count updates when the plan is sent)
const sessionPicks = new Map<string, number>()

// Names and words worked out once per library load, not on every tap (measured 0.3s per tap on a phone)
type Prepared = { item: LibraryItem; key: string; words: string[]; i: number }
const prepared = new WeakMap<LibraryItem[], Prepared[]>()
function prepare(library: LibraryItem[]): Prepared[] {
  let list = prepared.get(library)
  if (!list) {
    list = library
      .filter((item) => item.kind === "exercise" || item.kind === "warmup")
      .map((item, i) => {
        const name = libName(item.name)
        return { item, key: name.toLowerCase(), words: words(name), i }
      })
    prepared.set(library, list)
  }
  return list
}

/**
 * Every library exercise whose words start with each typed word, in any order
 * ("inc db" finds "Incline Dumbbell Press"). Most used first, then most recently saved.
 */
export function searchLibrary(library: LibraryItem[], query: string): LibraryItem[] {
  const q = words(query).map((w) => SHORT[w] ?? w)
  if (!q.length || q.join("").length < 2) return []
  const typed = words(query).join(" ")
  const seen = new Set<string>()
  const hits: { item: LibraryItem; score: number; i: number }[] = []
  for (const { item, key, words: w, i } of prepare(library)) {
    if (seen.has(key) || w.join(" ") === typed || !q.every((p) => w.some((x) => x.startsWith(p)))) continue
    seen.add(key)
    hits.push({ item, i, score: (item.use_count ?? 0) + (sessionPicks.get(key) ?? 0) * 100 })
  }
  return hits.sort((a, b) => b.score - a.score || a.i - b.i).slice(0, 50).map((h) => h.item)
}

function ChipSelect<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[]
  value?: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`h-11 min-h-[44px] px-4 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              active
                ? "bg-accent-orange text-black font-bold shadow-sm"
                : "bg-white/5 text-white/80 border border-border-subtle hover:bg-white/10"
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

/** Edit one exercise / cardio / stretch row. Steppers & chips only. Tap, don't type. */
function cleanRow(r: WorkoutRow): WorkoutRow {
  return {
    ...r,
    name: r.name.trim(),
    why: r.why?.trim() || undefined,
    links: r.links.filter((l) => l.url.trim()),
    cues: r.cues.filter((c) => c.text.trim()),
    sets: r.custom ? (r.customSets || r.sets) : schemeText(r),
  }
}

/** The parts of an exercise the library keeps: video links, tips, why, sets. */
function libFingerprint(x: { links?: Link[]; cues?: { text: string }[]; why?: string; sets?: string }) {
  return JSON.stringify([
    (x.links ?? []).map((l) => l.url.trim()),
    (x.cues ?? []).map((c) => c.text.trim()),
    (x.why ?? "").trim(),
    (x.sets ?? "").trim(),
  ])
}

const libraryTwin = (library: LibraryItem[], name: string) => {
  const n = plain(name).toLowerCase().trim()
  return n ? library.find((i) => (i.kind === "exercise" || i.kind === "warmup") && plain(i.name).toLowerCase().trim() === n) : undefined
}

export function RowSheet({
  row,
  library,
  clientAge,
  onSave,
  onSaveForAll,
  onClose,
}: {
  row: WorkoutRow
  library: LibraryItem[]
  clientAge?: number
  onSave: (r: WorkoutRow) => void
  onSaveForAll?: (r: WorkoutRow) => void
  onClose: () => void
}) {
  // Infer kind if not explicitly saved
  const initialKind =
    row.kind ??
    (row.stretchType || row.name.toLowerCase().includes("stretch")
      ? "stretch"
      : row.cardioMachine || row.name.toLowerCase().includes("cardio") || row.name.toLowerCase().includes("cycling") || row.name.toLowerCase().includes("bike")
      ? "cardio"
      : "strength")

  const [r, setR] = useState<WorkoutRow>({
    ...row,
    kind: initialKind,
    warmupSets: row.warmupSets ?? 0,
    workingSets: row.workingSets ?? (initialKind === "stretch" ? 2 : initialKind === "cardio" ? 1 : 3),
    reps: row.reps ?? "10-15",
    restSec: row.restSec ?? 60,
    why: row.why ?? "",
    cardioMachine: row.cardioMachine ?? "Incline walk",
    cardioMinutes: row.cardioMinutes ?? 10,
    cardioZone: row.cardioZone ?? "Z2",
    cardioRestHr: row.cardioRestHr ?? 60,
    stretchType: row.stretchType ?? (row.name.toLowerCase().includes("dynamic") ? "dynamic" : "static"),
    stretchHoldSec: row.stretchHoldSec ?? 30,
  })

  // Lookup matches from library. Names imported from Aman's docs carry "(Reference 1)" etc. (that was the
  // video label), so it is dropped from the name; once the typed name equals a library name, no suggestion.
  const matches = useMemo(() => searchLibrary(library, plain(r.name)), [library, r.name])

  const updateState = (patch: Partial<WorkoutRow>) => {
    const next = { ...r, ...patch }
    if (!next.custom) {
      next.sets = schemeText(next)
    }
    setR(next)
  }

  const pickLibraryItem = (m: LibraryItem) => {
    const k = m.data.kind ?? (m.kind === "warmup" && m.name.toLowerCase().includes("stretch") ? "stretch" : "strength")
    sessionPicks.set(libName(m.name).toLowerCase(), (sessionPicks.get(libName(m.name).toLowerCase()) ?? 0) + 1)
    // His last sets for this exercise come back too (only fields he actually set)
    const rx = Object.fromEntries(Object.entries(m.data.rx ?? {}).filter(([, v]) => v !== undefined && v !== null))
    const next: WorkoutRow = {
      ...r,
      ...rx,
      name: libName(m.name),
      kind: k,
      links: m.data.links?.length ? m.data.links : r.links,
      cues: m.data.cues?.length ? m.data.cues : r.cues,
      why: m.data.why || r.why,
    }
    if (!next.custom) {
      next.sets = schemeText(next)
    }
    setR(next)
  }

  const setLink = (i: number, p: Partial<Link>) =>
    setR({ ...r, links: r.links.map((l, j) => (j === i ? { ...l, ...p } : l)) })

  // Aman 27 Oct: editing a library exercise asks "Save for all" (library) or "Only this client" (this plan)
  const [ask, setAsk] = useState<WorkoutRow | null>(null)
  const [startFp] = useState(() => libFingerprint(cleanRow(r)))
  const finish = (row: WorkoutRow, forAll?: boolean) => {
    if (ask) row = { ...row, libSkip: !forAll } // libSkip: Send leaves the library alone for this row
    onSave(row)
    if (forAll) onSaveForAll?.(row)
    onClose()
  }
  const save = () => {
    if (ask) return // choice still open
    const clean = cleanRow(r)
    const lib = libraryTwin(library, clean.name)
    // Ask only if he changed something in this sheet AND it now differs from the library
    if (lib && onSaveForAll && libFingerprint(clean) !== startFp && libFingerprint(clean) !== libFingerprint(lib.data))
      return setAsk(clean)
    finish(clean)
  }

  // Active cardio bpm string
  const activeBpm = cardioBpm(clientAge, r.cardioRestHr, r.cardioZone)

  return (
    <Sheet
      title={r.kind === "cardio" ? "Cardio" : r.kind === "stretch" ? "Stretch" : "Exercise"}
      onClose={save}
      footer={<Done onClick={save} />}
    >
      {/* Exercise Kind Selector */}
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            { id: "strength", label: "Strength", icon: Dumbbell },
            { id: "cardio", label: "Cardio", icon: Heart },
            { id: "stretch", label: "Stretch", icon: Activity },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => updateState({ kind: id })}
            className={`h-12 min-h-[48px] rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors ${
              r.kind === id
                ? "bg-accent-orange text-black"
                : "bg-white/5 text-white/80 border border-border-subtle"
            }`}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>

      {/* Name Input with Autocomplete */}
      <div>
        <Label>Name</Label>
        <input
          value={r.name}
          onChange={(e) => updateState({ name: e.target.value })}
          placeholder={
            r.kind === "cardio"
              ? "e.g. Incline Treadmill Walk"
              : r.kind === "stretch"
              ? "e.g. Worlds Greatest Stretch"
              : "e.g. Seated Cable Row"
          }
          className={`${inputCls} h-14 font-semibold text-base`}
        />
        {matches.length > 0 && (
          <div className="mt-2 space-y-1.5">
            <p className="text-xs text-text-muted">
              {matches.length} from library · most used first · tap fills videos, tips & your last sets
            </p>
            <div className="max-h-72 overflow-y-auto overscroll-contain space-y-1.5 pr-1">
              {matches.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => pickLibraryItem(m)}
                  className="w-full text-left px-4 py-3 rounded-xl bg-accent-orange/10 border border-accent-orange/30 text-sm font-semibold cursor-pointer hover:bg-accent-orange/20"
                >
                  <span className="flex items-start justify-between gap-2">
                    <span>{libName(m.name)}</span>
                    {m.use_count > 0 && <span className="shrink-0 text-[11px] font-bold text-accent-orange">{m.use_count}×</span>}
                  </span>
                  {m.data.rx && m.data.sets ? (
                    <span className="block text-xs font-normal text-text-muted mt-0.5 line-clamp-1">{m.data.sets}</span>
                  ) : m.data.why ? (
                    <span className="block text-xs font-normal text-text-muted mt-0.5 line-clamp-1">{m.data.why}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ================= STRENGTH SECTION ================= */}
      {r.kind === "strength" && (
        <div className="space-y-4">
          {/* Steppers: Warm-up sets & Working sets */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-white/[0.03] border border-border-subtle">
            <div>
              <Label hint="0 to 3">Warm-up sets</Label>
              <Stepper
                value={r.warmupSets ?? 0}
                min={0}
                max={3}
                onChange={(v) => updateState({ warmupSets: v })}
              />
            </div>
            <div>
              <Label hint="0 = reps only">Working sets</Label>
              <Stepper
                value={r.workingSets ?? 3}
                min={0}
                max={6}
                onChange={(v) => updateState({ workingSets: v })}
              />
            </div>
          </div>

          {/* Reps Chips */}
          <div>
            <Label hint="tap to pick">Target reps</Label>
            <ChipSelect
              value={typeof r.reps === "string" ? r.reps : "10-15"}
              options={[
                { label: "6-8", value: "6-8" },
                { label: "8-12", value: "8-12" },
                { label: "10-15", value: "10-15" },
                { label: "12-15", value: "12-15" },
                { label: "15-20", value: "15-20" },
                { label: "20-30", value: "20-30" },
                { label: "Max", value: "max" },
                { label: "Time (Hold)", value: "30s hold" },
              ]}
              onChange={(v) => updateState({ reps: v })}
            />
          </div>

          {/* Rest Chips */}
          <div>
            <Label>Rest between sets</Label>
            <ChipSelect
              value={r.restSec ?? 60}
              options={[
                { label: "30s", value: 30 },
                { label: "45s", value: 45 },
                { label: "60s", value: 60 },
                { label: "90s", value: 90 },
                { label: "2 min", value: 120 },
                { label: "3 min", value: 180 },
              ]}
              onChange={(v) => updateState({ restSec: v })}
            />
          </div>

          {/* Scheme Preview */}
          <div className="p-3 rounded-xl bg-accent-orange/10 border border-accent-orange/20 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-text-muted">{r.custom ? "Your own text:" : "Generated sets:"}</span>
              {!r.custom && <span className="text-sm font-bold text-accent-orange text-right">{schemeText(r)}</span>}
              <button
                type="button"
                onClick={() => updateState({ custom: !r.custom, customSets: r.customSets ?? schemeText(r) })}
                className="shrink-0 text-xs px-3 py-1.5 rounded-lg font-bold cursor-pointer bg-white/10 text-white"
              >
                {r.custom ? "Use buttons" : "Type my own"}
              </button>
            </div>
            {r.custom && (
              <textarea
                value={r.customSets ?? r.sets}
                onChange={(e) => setR({ ...r, customSets: e.target.value, sets: e.target.value })}
                rows={2}
                placeholder="e.g. 20-30 Reps total (in as many sets)"
                className={`${inputCls} py-2.5 text-sm resize-none`}
              />
            )}
          </div>

          {/* Scientific Why Note */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label>Science note (Why this works)</Label>
              <span className="text-[11px] text-text-muted">Printed on PDF</span>
            </div>
            <textarea
              value={r.why ?? ""}
              onChange={(e) => updateState({ why: e.target.value })}
              rows={2}
              placeholder="e.g. Targets the upper clavicular pec fibers at a 30° incline to reduce shoulder impingement."
              className={`${inputCls} py-3 text-sm resize-none`}
            />
          </div>
        </div>
      )}

      {/* ================= CARDIO SECTION ================= */}
      {r.kind === "cardio" && (
        <div className="space-y-4">
          <div>
            <Label>Machine</Label>
            <ChipSelect
              value={r.cardioMachine ?? "Incline walk"}
              options={[
                { label: "Incline walk", value: "Incline walk" },
                { label: "Bike", value: "Bike" },
                { label: "Elliptical", value: "Elliptical" },
                { label: "Stair", value: "Stair" },
                { label: "Outdoor", value: "Outdoor" },
              ]}
              onChange={(v) => updateState({ cardioMachine: v })}
            />
          </div>

          {/* Steppers: Minutes & Resting HR */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-white/[0.03] border border-border-subtle">
            <div>
              <Label>Minutes</Label>
              <Stepper
                value={r.cardioMinutes ?? 10}
                min={5}
                max={90}
                step={5}
                onChange={(v) => updateState({ cardioMinutes: v })}
                suffix="min"
              />
            </div>
            <div>
              <Label hint="pulse at rest">Resting heart rate</Label>
              <Stepper
                value={r.cardioRestHr ?? 60}
                min={40}
                max={100}
                step={2}
                onChange={(v) => updateState({ cardioRestHr: v })}
                suffix="bpm"
              />
            </div>
          </div>

          {/* Intensity Zone Chips */}
          <div>
            <Label>How hard (zone)</Label>
            <ChipSelect
              value={r.cardioZone ?? "Z2"}
              options={[
                { label: "Z1 (50-60%) Recovery", value: "Z1" },
                { label: "Z2 (60-70%) Fat burn", value: "Z2" },
                { label: "Z3 (70-80%) Aerobic", value: "Z3" },
                { label: "Z4 (80-90%) Threshold", value: "Z4" },
                { label: "Z5 (90-100%) Max", value: "Z5" },
              ]}
              onChange={(v) => updateState({ cardioZone: v })}
            />
          </div>

          {/* Karvonen BPM target banner */}
          <div className="p-3.5 rounded-2xl bg-accent-orange/15 border border-accent-orange/40 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-accent-orange">Target Heart Rate</p>
              <p className="text-lg font-bold text-white mt-0.5">{activeBpm}</p>
            </div>
            <span className="text-xs text-text-muted text-right">
              {clientAge ? `Age: ${clientAge} yrs` : "No DOB in header"}
            </span>
          </div>

          {/* Scientific Why Note */}
          <div>
            <Label>Why this cardio</Label>
            <textarea
              value={r.why ?? ""}
              onChange={(e) => updateState({ why: e.target.value })}
              rows={2}
              placeholder="e.g. Zone 2 aerobic stimulus preserves muscle while promoting fat oxidation and cardiovascular health."
              className={`${inputCls} py-3 text-sm resize-none`}
            />
          </div>
        </div>
      )}

      {/* ================= STRETCH SECTION ================= */}
      {r.kind === "stretch" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(["dynamic", "static"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => updateState({ stretchType: st })}
                className={`h-12 min-h-[48px] rounded-xl font-bold text-sm cursor-pointer ${
                  r.stretchType === st
                    ? "bg-accent-orange text-black"
                    : "bg-white/5 text-white/80 border border-border-subtle"
                }`}
              >
                {st === "dynamic" ? "Dynamic (Warm-up)" : "Static (Cool-down)"}
              </button>
            ))}
          </div>

          {r.stretchType === "dynamic" ? (
            <div className="space-y-4">
              <div>
                <Label hint="movement reps">Reps</Label>
                <ChipSelect
                  value={typeof r.reps === "string" ? r.reps : "10-15"}
                  options={[
                    { label: "8-10 reps", value: "8-10" },
                    { label: "10-15 reps", value: "10-15" },
                    { label: "12-15 reps", value: "12-15" },
                    { label: "15-20 reps", value: "15-20" },
                  ]}
                  onChange={(v) => updateState({ reps: v })}
                />
              </div>
              <button
                type="button"
                onClick={() => updateState({ side: !r.side })}
                className={`h-12 min-h-[48px] w-full rounded-xl text-sm font-semibold border flex items-center justify-center gap-2 cursor-pointer ${
                  r.side
                    ? "bg-accent-orange/15 border-accent-orange text-accent-orange font-bold"
                    : "bg-white/5 border-border-subtle text-text-muted"
                }`}
              >
                <Check className={`size-4 ${r.side ? "opacity-100" : "opacity-0"}`} /> Each side (per side)
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label hint="hold time">Hold for</Label>
                <ChipSelect
                  value={r.stretchHoldSec ?? 30}
                  options={[
                    { label: "20 seconds", value: 20 },
                    { label: "30 seconds", value: 30 },
                    { label: "45 seconds", value: 45 },
                    { label: "60 seconds", value: 60 },
                  ]}
                  onChange={(v) => updateState({ stretchHoldSec: v })}
                />
              </div>
              <div>
                <Label hint="rounds">Sets / Rounds</Label>
                <Stepper
                  value={r.workingSets ?? 2}
                  min={1}
                  max={4}
                  onChange={(v) => updateState({ workingSets: v })}
                  suffix="sets"
                />
              </div>
            </div>
          )}

          {/* Scheme Preview */}
          <div className="p-3 rounded-xl bg-accent-orange/10 border border-accent-orange/20 flex items-center justify-between">
            <span className="text-xs text-text-muted">Generated sets:</span>
            <span className="text-sm font-bold text-accent-orange">{schemeText(r)}</span>
          </div>

          <div>
            <Label>Why this stretch</Label>
            <textarea
              value={r.why ?? ""}
              onChange={(e) => updateState({ why: e.target.value })}
              rows={2}
              placeholder="e.g. Opens hip flexors and restores resting tissue length after heavy squatting."
              className={`${inputCls} py-3 text-sm resize-none`}
            />
          </div>
        </div>
      )}

      {/* ================= FOLDED MORE OPTIONS ================= */}
      <details className="rounded-2xl bg-white/[0.02] border border-border-subtle p-4 group">
        <summary className="font-semibold text-sm text-text-muted group-hover:text-white cursor-pointer flex items-center justify-between list-none">
          <span className="flex items-center gap-2">
            <Sparkles className="size-4 text-accent-orange" /> More options (Tempo, RIR, Technique, Videos, Tips)
          </span>
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
        </summary>

        <div className="mt-4 pt-4 border-t border-border-subtle space-y-4">
          {/* Custom Sets text toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label hint="manual text override">Custom text instead of generated</Label>
              <button
                type="button"
                onClick={() => updateState({ custom: !r.custom })}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                  r.custom ? "bg-accent-orange text-black" : "bg-white/10 text-white"
                }`}
              >
                {r.custom ? "Custom ON" : "Custom OFF"}
              </button>
            </div>
            {r.custom && (
              <textarea
                value={r.customSets ?? r.sets}
                onChange={(e) => setR({ ...r, customSets: e.target.value, sets: e.target.value })}
                rows={3}
                placeholder="e.g. 2 warm up + 3 × 10-15 Reps (Drop set on last set)"
                className={`${inputCls} py-2.5 text-sm resize-none`}
              />
            )}
          </div>

          {/* Tempo */}
          <div>
            <Label hint="speed of rep (eccentric / pause / concentric)">Tempo</Label>
            <ChipSelect
              value={r.tempo ?? ""}
              options={[
                { label: "Standard (Controlled)", value: "" },
                { label: "3-0-1-0 (3s down)", value: "3-0-1-0" },
                { label: "4-1-1-0 (4s down, 1s pause)", value: "4-1-1-0" },
                { label: "2-2-1-0 (2s hold)", value: "2-2-1-0" },
              ]}
              onChange={(v) => updateState({ tempo: v })}
            />
          </div>

          {/* RIR */}
          <div>
            <Label hint="reps in reserve before failure">Reps In Reserve (RIR)</Label>
            <ChipSelect
              value={String(r.rir ?? "")}
              options={[
                { label: "None specified", value: "" },
                { label: "2-3 RIR (Safe buffer)", value: "2-3" },
                { label: "1-2 RIR (Near failure)", value: "1-2" },
                { label: "0 RIR (Absolute failure)", value: "0" },
              ]}
              onChange={(v) => updateState({ rir: v })}
            />
          </div>

          {/* Technique */}
          <div>
            <Label hint="special technique">Intensity technique</Label>
            <ChipSelect
              value={r.technique ?? ""}
              options={[
                { label: "None", value: "" },
                { label: "Drop set", value: "drop set" },
                { label: "Double drop set", value: "double drop" },
                { label: "Pause reps", value: "pause" },
                { label: "Partials", value: "partials" },
              ]}
              onChange={(v) => updateState({ technique: v })}
            />
          </div>

          {/* Video links */}
          <div>
            <Label>Video links</Label>
            <div className="space-y-2">
              {r.links.map((l, i) => (
                <div key={i} className="rounded-xl border border-border-subtle p-3 space-y-2 bg-black/30">
                  <div className="flex gap-2">
                    <input
                      value={l.label}
                      onChange={(e) => setLink(i, { label: e.target.value })}
                      placeholder="Button label (Video / Technique)"
                      className={`${inputCls} h-11 text-sm`}
                    />
                    <button
                      type="button"
                      onClick={() => setR({ ...r, links: r.links.filter((_, j) => j !== i) })}
                      aria-label="Remove link"
                      className="size-11 min-h-[44px] shrink-0 grid place-items-center rounded-xl bg-danger/10 text-danger cursor-pointer"
                    >
                      <X className="size-5" />
                    </button>
                  </div>
                  <input
                    value={l.url}
                    onChange={(e) => setLink(i, { url: e.target.value })}
                    placeholder="YouTube or Instagram URL"
                    inputMode="url"
                    className={`${inputCls} h-11 text-sm`}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setR({
                    ...r,
                    links: [
                      ...r.links,
                      { label: r.links.length ? "Reference " + (r.links.length + 1) : "Video", url: "" },
                    ],
                  })
                }
                className="h-11 min-h-[44px] px-4 rounded-xl bg-white/5 text-white font-semibold text-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="size-4" /> Add video link
              </button>
            </div>
          </div>

          {/* Tips for client */}
          <div>
            <Label>Tips for the client</Label>
            <LineList
              lines={r.cues.map((c) => c.text)}
              onChange={(l) => setR({ ...r, cues: l.map((text) => ({ text })) })}
              placeholder="e.g. Pause at top for 2 seconds"
              addLabel="Pick"
            />
            <div className="mt-2">
              <Hint />
            </div>
          </div>
        </div>
      </details>

      {ask && (
        <div className="fixed inset-0 z-[90] bg-black/80 flex items-end sm:items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
          <div className="w-full max-w-md rounded-3xl bg-[#111111] border border-border-subtle p-5 space-y-3">
            <p className="font-heading text-xl leading-tight">You changed “{plain(ask.name)}”</p>
            <p className="text-text-muted text-sm">Keep this change for every future plan, or only for this client?</p>
            <button type="button" onClick={() => finish(ask, true)} className="w-full min-h-14 rounded-2xl bg-accent-orange text-black font-bold text-base px-4 py-3 text-left cursor-pointer">
              Save for all
              <span className="block text-xs font-medium text-black/70">Updates your exercise library</span>
            </button>
            <button type="button" onClick={() => finish(ask)} className="w-full min-h-14 rounded-2xl bg-white/10 font-bold text-base px-4 py-3 text-left cursor-pointer">
              Only this client
              <span className="block text-xs font-medium text-text-muted">Library stays as it was</span>
            </button>
            <button type="button" onClick={() => setAsk(null)} className="w-full h-11 text-text-muted text-sm font-semibold cursor-pointer">
              Back to editing
            </button>
          </div>
        </div>
      )}
    </Sheet>
  )
}

/** Superset / Group details sheet. Coach can edit group note and rest after round. */
export function GroupSheet({
  groupLabel,
  note,
  restAfterSec,
  onSave,
  onUngroup,
  onClose,
}: {
  groupLabel: string
  note: string
  restAfterSec?: number
  onSave: (note: string, restAfterSec: number) => void
  onUngroup: () => void
  onClose: () => void
}) {
  const [gNote, setGNote] = useState(note)
  const [rest, setRest] = useState(restAfterSec ?? 90)

  const save = () => {
    onSave(gNote.trim(), rest)
    onClose()
  }

  return (
    <Sheet
      title={`${groupLabel} Settings`}
      onClose={save}
      footer={
        <div className="space-y-2">
          <Done onClick={save} />
          <button
            type="button"
            onClick={() => {
              onUngroup()
              onClose()
            }}
            className="w-full h-12 min-h-[48px] rounded-xl bg-danger/10 text-danger font-bold text-sm cursor-pointer"
          >
            Ungroup these exercises
          </button>
        </div>
      }
    >
      <div>
        <Label hint="shared instruction for the group">Shared round note</Label>
        <textarea
          value={gNote}
          onChange={(e) => setGNote(e.target.value)}
          rows={3}
          placeholder="e.g. Perform exercises back-to-back with zero rest. Take full rest after the round."
          className={`${inputCls} py-3 text-base resize-none`}
        />
        <div className="mt-2">
          <Label hint="quick technique notes">Common notes</Label>
          <div className="flex flex-wrap gap-2">
            {[
              "Perform 1 exercise followed immediately by another with minimal rest.",
              "Perform all 3 exercises consecutively before resting.",
              "Continuous circuit. Rest 90-120s only after completing all exercises in round.",
            ].map((n, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setGNote(n)}
                className="text-left p-2.5 rounded-xl bg-white/5 border border-border-subtle text-xs text-text-muted hover:text-white cursor-pointer"
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <Label hint="rest between rounds">Rest after the round</Label>
        <ChipSelect
          value={rest}
          options={[
            { label: "60s", value: 60 },
            { label: "90s", value: 90 },
            { label: "2 min", value: 120 },
            { label: "3 min", value: 180 },
          ]}
          onChange={setRest}
        />
      </div>
    </Sheet>
  )
}

/** Multi-select sheet to create a Superset / Tri-set / Giant set from a day's exercises. */
export function SupersetPickerSheet({
  dayTitle,
  exercises,
  onGroup,
  onClose,
}: {
  dayTitle: string
  exercises: WorkoutRow[]
  onGroup: (selectedIds: string[]) => void
  onClose: () => void
}) {
  const [sel, setSel] = useState<string[]>([])

  const toggle = (id: string) => {
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  const groupType =
    sel.length === 2 ? "SUPERSET (2)" : sel.length === 3 ? "TRI-SET (3)" : sel.length >= 4 ? `GIANT SET (${sel.length})` : ""

  const handleCreate = () => {
    if (sel.length >= 2) {
      onGroup(sel)
      onClose()
    }
  }

  return (
    <Sheet
      title="Create Superset"
      onClose={onClose}
      footer={
        <button
          type="button"
          disabled={sel.length < 2}
          onClick={handleCreate}
          className="w-full h-14 min-h-[56px] rounded-2xl bg-accent-orange text-black font-bold text-lg disabled:opacity-30 cursor-pointer"
        >
          {sel.length >= 2 ? `Group as ${groupType}` : "Select at least 2 exercises"}
        </button>
      }
    >
      <p className="text-sm text-text-muted">
        Select 2 or more exercises from <span className="text-white font-semibold">{dayTitle}</span> to group into a superset.
      </p>

      <div className="space-y-2 mt-2">
        {exercises.map((r, i) => {
          const isSelected = sel.includes(r.id)
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => toggle(r.id)}
              className={`w-full text-left p-4 rounded-2xl border transition-colors flex items-center justify-between min-h-[56px] cursor-pointer ${
                isSelected
                  ? "bg-accent-orange/15 border-accent-orange text-white"
                  : "bg-white/[0.03] border-border-subtle text-white/80"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span
                  className={`size-7 rounded-full grid place-items-center text-xs font-bold shrink-0 ${
                    isSelected ? "bg-accent-orange text-black" : "bg-white/10 text-white"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="font-semibold text-base truncate">{plain(r.name) || "Unnamed"}</span>
              </div>
              <div
                className={`size-6 rounded-full border-2 grid place-items-center shrink-0 ${
                  isSelected ? "bg-accent-orange border-accent-orange" : "border-white/30"
                }`}
              >
                {isSelected && <Check className="size-3.5 text-black stroke-[3]" />}
              </div>
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}

/** Red full-width line (OR / walk / drop set). */
export function BannerSheet({
  text,
  library,
  onSave,
  onClose,
}: {
  text: string
  library: LibraryItem[]
  onSave: (t: string) => void
  onClose: () => void
}) {
  const [t, setT] = useState(text)
  const save = () => {
    onSave(t.trim())
    onClose()
  }

  const defaultBanners = [
    "*OR (Either Complete Option 1 OR Complete Option 2)*",
    "*10-15 minutes of Normal walk within 10-15 minutes of finishing Meal 1*",
    "*AFTER Minimum 30 - 60 minutes Gap*",
    "*Mechanical Drop SET*",
    "*SUPER SET*",
  ]

  return (
    <Sheet title="Red line" onClose={save} footer={<Done onClick={save} />}>
      <textarea
        autoFocus
        value={t}
        onChange={(e) => setT(e.target.value)}
        rows={3}
        className={`${inputCls} py-3 text-base resize-none`}
        placeholder="*OR (Either Complete Option 1 OR Complete Option 2)*"
      />
      <Hint />
      <Label>Common lines</Label>
      <div className="flex flex-wrap gap-2">
        {uniq([...byKind(library, "banner").map((i) => i.name), ...defaultBanners])
          .slice(0, 16)
          .map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setT(b)}
              className="h-11 min-h-[44px] px-3.5 rounded-xl bg-white/5 border border-border-subtle text-xs font-semibold cursor-pointer text-left"
            >
              {b}
            </button>
          ))}
      </div>
    </Sheet>
  )
}

/** One meal (or option of a meal): name, foods, supplements. */
export function MealSheet({
  row,
  library,
  onSave,
  onClose,
}: {
  row: DietRow
  library: LibraryItem[]
  onSave: (r: DietRow) => void
  onClose: () => void
}) {
  const [r, setR] = useState<DietRow>(row)
  const save = () => {
    onSave({
      ...r,
      items: r.items.filter((i) => i.text.trim()),
      supplements: r.supplements.filter((i) => i.text.trim()),
    })
    onClose()
  }
  return (
    <Sheet title="Meal" onClose={save} footer={<Done onClick={save} />}>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-3 sm:col-span-1">
          <Label>Meal</Label>
          <input
            value={r.label}
            onChange={(e) => setR({ ...r, label: e.target.value })}
            placeholder="MEAL 1"
            className={`${inputCls} h-12 font-semibold`}
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label>Time / name</Label>
          <input
            value={r.sub}
            onChange={(e) => setR({ ...r, sub: e.target.value })}
            placeholder="Breakfast"
            className={`${inputCls} h-12`}
          />
        </div>
        <div>
          <Label>Option</Label>
          <input
            value={r.option}
            onChange={(e) => setR({ ...r, option: e.target.value })}
            placeholder="Option 1"
            className={`${inputCls} h-12`}
          />
        </div>
      </div>
      <div>
        <Label>Foods</Label>
        <LineList
          lines={r.items.map((i) => i.text)}
          onChange={(l) => setR({ ...r, items: l.map((text) => ({ text })) })}
          placeholder="e.g. 200ml Nestle Skimmed Milk"
          library={byKind(library, "food")}
          addLabel="Pick foods"
        />
      </div>
      <div>
        <Label>Supplements</Label>
        <LineList
          lines={r.supplements.map((i) => i.text)}
          onChange={(l) => setR({ ...r, supplements: l.map((text) => ({ text })) })}
          placeholder="e.g. 1 Omega 3 (With or After Meal)"
          library={byKind(library, "supplement")}
          addLabel="Pick supplements"
        />
      </div>
      <p className="text-xs text-text-muted">
        Tip: *4* makes the 4 red. Shop links from your old plans come along when you pick from your list.
      </p>
    </Sheet>
  )
}

/** Page-1 client table + measurements. Filled from the app, every cell editable. */
export function HeaderSheet({
  header,
  onSave,
  onClose,
}: {
  header: PlanHeader
  onSave: (h: PlanHeader) => void
  onClose: () => void
}) {
  const [h, setH] = useState<PlanHeader>(header)
  const save = () => {
    onSave(h)
    onClose()
  }
  const setRow = (i: number, p: Partial<PlanHeader["rows"][number]>) =>
    setH({ ...h, rows: h.rows.map((r, j) => (j === i ? { ...r, ...p } : r)) })
  const setVal = (mi: number, di: number, v: string) =>
    setH({
      ...h,
      measures: h.measures.map((m, j) =>
        j === mi ? { ...m, values: h.dates.map((_, k) => (k === di ? v : m.values[k] ?? "")) } : m,
      ),
    })
  return (
    <Sheet title="Client details" onClose={save} footer={<Done onClick={save} />}>
      <label className="flex items-center gap-3 text-base cursor-pointer">
        <input
          type="checkbox"
          checked={h.show}
          onChange={(e) => setH({ ...h, show: e.target.checked })}
          className="size-6 accent-[#FF6A1A]"
        />{" "}
        Show on page 1
      </label>
      <div className="space-y-2">
        {h.rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <input
              value={r.label}
              onChange={(e) => setRow(i, { label: e.target.value })}
              className={`${inputCls} h-11 text-sm text-text-muted`}
            />
            <input
              value={r.value}
              onChange={(e) => setRow(i, { value: e.target.value })}
              className={`${inputCls} h-11 text-sm font-semibold`}
            />
            <button
              type="button"
              onClick={() => setH({ ...h, rows: h.rows.filter((_, j) => j !== i) })}
              aria-label="Remove"
              className="size-11 min-h-[44px] grid place-items-center rounded-lg bg-danger/10 text-danger cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setH({ ...h, rows: [...h.rows, { label: "", value: "" }] })}
          className="h-11 min-h-[44px] px-4 rounded-xl bg-white/5 text-white font-semibold text-sm flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="size-4" /> Add row
        </button>
      </div>
      <div>
        <Label>Measurements</Label>
        <div className="overflow-x-auto">
          <table className="text-sm">
            <thead>
              <tr>
                <th />
                {h.dates.map((d, i) => (
                  <th key={i} className="p-1">
                    <input
                      value={d}
                      onChange={(e) =>
                        setH({ ...h, dates: h.dates.map((x, j) => (j === i ? e.target.value : x)) })
                      }
                      className={`${inputCls} h-10 w-28 text-xs text-center`}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {h.measures.map((m, mi) => (
                <tr key={mi}>
                  <td className="p-1">
                    <input
                      value={m.label}
                      onChange={(e) =>
                        setH({
                          ...h,
                          measures: h.measures.map((x, j) => (j === mi ? { ...x, label: e.target.value } : x)),
                        })
                      }
                      className={`${inputCls} h-10 w-36 text-xs`}
                    />
                  </td>
                  {h.dates.map((_, di) => (
                    <td key={di} className="p-1">
                      <input
                        value={m.values[di] ?? ""}
                        onChange={(e) => setVal(mi, di, e.target.value)}
                        className={`${inputCls} h-10 w-28 text-center font-semibold`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
          <button
            type="button"
            onClick={() => setH({ ...h, dates: [...h.dates, ""] })}
            className="h-11 min-h-[44px] px-3.5 rounded-xl bg-white/5 text-sm font-semibold cursor-pointer"
          >
            + Date column
          </button>
          <button
            type="button"
            onClick={() => setH({ ...h, measures: [...h.measures, { label: "", values: [] }] })}
            className="h-11 min-h-[44px] px-3.5 rounded-xl bg-white/5 text-sm font-semibold cursor-pointer"
          >
            + Measurement
          </button>
          {h.dates.length > 0 && (
            <button
              type="button"
              onClick={() =>
                setH({
                  ...h,
                  dates: h.dates.slice(0, -1),
                  measures: h.measures.map((m) => ({ ...m, values: m.values.slice(0, h.dates.length - 1) })),
                })
              }
              className="h-11 min-h-[44px] px-3.5 rounded-xl bg-danger/10 text-danger text-sm font-semibold cursor-pointer"
            >
              Remove last date
            </button>
          )}
        </div>
      </div>
    </Sheet>
  )
}

export type Action = { label: string; danger?: boolean; run: () => void }
export function ActionSheet({
  title,
  actions,
  onClose,
}: {
  title: string
  actions: Action[]
  onClose: () => void
}) {
  return (
    <Sheet title={title} onClose={onClose}>
      <div className="grid gap-2 pb-2">
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={() => {
              a.run()
              onClose()
            }}
            className={`h-14 min-h-[52px] rounded-xl font-semibold text-base text-left px-4 cursor-pointer active:scale-[0.99] transition-transform ${
              a.danger ? "bg-danger/10 text-danger" : "bg-white/5 text-white hover:bg-white/10"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>
    </Sheet>
  )
}

/** Pick several exercises / warm-ups at once, or type a new one. Supports muscle filtering. */
export function AddRowsPicker({
  kind,
  library,
  initialMuscle,
  onAdd,
  onNew,
  onClose,
}: {
  kind: "exercise" | "warmup"
  library: LibraryItem[]
  initialMuscle?: string
  onAdd: (items: LibraryItem[]) => void
  onNew: () => void
  onClose: () => void
}) {
  return (
    <LibraryPicker
      title={kind === "exercise" ? "Add Exercises" : "Add Warm-ups & Stretches"}
      items={byKind(library, kind)}
      initialMuscle={initialMuscle}
      multi
      onNew={onNew}
      onPick={onAdd}
      onClose={onClose}
    />
  )
}
