"use client"

import { useMemo, useState, type ReactNode } from "react"
import { ArrowDown, ArrowUp, Plus, Play, Search, X } from "lucide-react"
import { plain, type LibraryItem, type LibraryKind } from "@/lib/plan/types"

export const inputCls =
  "w-full rounded-xl bg-[#1A1A1A] border border-[#333333] px-3.5 text-white text-base outline-none focus:border-accent-orange placeholder:text-white/30"

/** Bottom sheet, covers screen properly on phone with safe bottom padding. */
export function Sheet({
  title,
  onClose,
  children,
  footer,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl mx-auto rounded-t-3xl bg-bg-card border-t border-border-subtle max-h-[94vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-border-subtle/50">
          <h3 className="font-heading italic text-2xl">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="size-12 min-h-[48px] grid place-items-center rounded-full bg-white/5 active:bg-white/10 cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1 overscroll-contain">{children}</div>
        {footer && (
          <div className="px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-border-subtle bg-bg-card shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <p className="text-xs font-semibold text-text-muted mb-1.5">
      {children}
      {hint && <span className="font-normal text-text-muted/70"> · {hint}</span>}
    </p>
  )
}

/** Ordered list of text lines: edit, reorder, remove, add. Optional library search to add. */
export function LineList({
  lines,
  onChange,
  placeholder,
  library,
  addLabel,
}: {
  lines: string[]
  onChange: (l: string[]) => void
  placeholder: string
  library?: LibraryItem[]
  addLabel: string
}) {
  const [picking, setPicking] = useState(false)
  const set = (i: number, v: string) => onChange(lines.map((l, j) => (j === i ? v : l)))
  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= lines.length) return
    const n = [...lines]
    ;[n[i], n[j]] = [n[j], n[i]]
    onChange(n)
  }
  return (
    <div className="space-y-2">
      {lines.map((l, i) => (
        <div key={i} className="flex gap-2 items-start">
          <textarea
            value={l}
            onChange={(e) => set(i, e.target.value)}
            rows={Math.min(4, Math.max(1, Math.ceil(l.length / 38)))}
            placeholder={placeholder}
            className={`${inputCls} py-3 resize-none leading-snug`}
          />
          <div className="flex flex-col gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => move(i, -1)}
              aria-label="Move up"
              className="size-11 min-h-[44px] grid place-items-center rounded-xl bg-white/5 cursor-pointer"
            >
              <ArrowUp className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              aria-label="Move down"
              className="size-11 min-h-[44px] grid place-items-center rounded-xl bg-white/5 cursor-pointer"
            >
              <ArrowDown className="size-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => onChange(lines.filter((_, j) => j !== i))}
            aria-label="Remove"
            className="size-11 min-h-[44px] shrink-0 grid place-items-center rounded-xl bg-danger/10 text-danger cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange([...lines, ""])}
          className="h-12 min-h-[48px] px-4 rounded-xl bg-white/5 text-white font-semibold text-sm flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="size-4" /> Type new
        </button>
        {library && library.length > 0 && (
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="h-12 min-h-[48px] px-4 rounded-xl bg-accent-orange/15 text-accent-orange font-semibold text-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Search className="size-4" /> {addLabel}
          </button>
        )}
      </div>
      {picking && library && (
        <LibraryPicker
          title={addLabel}
          items={library}
          multi
          onClose={() => setPicking(false)}
          onPick={(items) => {
            onChange([...lines, ...items.map((x) => x.name)])
            setPicking(false)
          }}
        />
      )}
    </div>
  )
}

const MUSCLE_GROUPS = [
  "All",
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Core",
  "Cardio",
  "Stretch",
] as const

/** Search Aman's library + database with muscle filter chips. */
export function LibraryPicker({
  title,
  items,
  onPick,
  onClose,
  multi,
  onNew,
  initialMuscle,
}: {
  title: string
  items: LibraryItem[]
  onPick: (i: LibraryItem[]) => void
  onClose: () => void
  multi?: boolean
  onNew?: () => void
  initialMuscle?: string
}) {
  const [q, setQ] = useState("")
  const [selectedMuscle, setSelectedMuscle] = useState<string>(initialMuscle ?? "All")
  const [sel, setSel] = useState<LibraryItem[]>([])

  const list = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    return items.filter((i) => {
      // Muscle filter
      if (selectedMuscle !== "All") {
        const m = i.data?.muscle?.toLowerCase()
        const k = i.data?.kind?.toLowerCase()
        const target = selectedMuscle.toLowerCase()
        const matchMuscle = m === target
        const matchKind = k === target || (target === "stretch" && k === "stretch") || (target === "cardio" && k === "cardio")
        if (!matchMuscle && !matchKind) return false
      }
      // Text search
      if (!words.length) return true
      const n = plain(i.name).toLowerCase()
      const m = (i.data?.muscle ?? "").toLowerCase()
      const w = (i.data?.why ?? "").toLowerCase()
      return words.every((word) => n.includes(word) || m.includes(word) || w.includes(word))
    }).slice(0, 100)
  }, [q, selectedMuscle, items])

  const toggle = (i: LibraryItem) =>
    multi ? setSel((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i])) : onPick([i])

  return (
    <Sheet
      title={title}
      onClose={onClose}
      footer={
        multi || onNew ? (
          <div className="flex gap-2">
            {onNew && (
              <button
                type="button"
                onClick={onNew}
                className="h-14 min-h-[52px] px-5 rounded-2xl bg-white/10 text-white font-bold text-base flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="size-5" /> Type new
              </button>
            )}
            {multi && (
              <button
                type="button"
                disabled={!sel.length}
                onClick={() => onPick(sel)}
                className="flex-1 h-14 min-h-[52px] rounded-2xl bg-accent-orange text-black font-bold text-lg disabled:opacity-40 cursor-pointer"
              >
                Add {sel.length || ""} selected
              </button>
            )}
          </div>
        ) : undefined
      }
    >
      {/* Search Input */}
      <div className="relative sticky top-0 z-10 bg-bg-card pb-2 space-y-2">
        <div className="relative">
          <Search className="size-5 absolute left-3.5 top-4 text-text-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search exercise or muscle…"
            className={`${inputCls} h-14 pl-11 text-base`}
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-3.5 top-3.5 size-7 rounded-full bg-white/10 grid place-items-center text-text-muted"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Muscle Filter Chips (horizontal scrollable, thumb-friendly) */}
        <div className="flex gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar -mx-1 px-1">
          {MUSCLE_GROUPS.map((m) => {
            const active = selectedMuscle === m
            return (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedMuscle(m)}
                className={`h-11 min-h-[44px] px-3.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                  active
                    ? "bg-accent-orange text-black"
                    : "bg-white/5 text-text-muted border border-border-subtle hover:text-white"
                }`}
              >
                {m}
              </button>
            )
          })}
        </div>
      </div>

      {list.length === 0 && (
        <div className="text-center py-8 text-text-muted">
          <p className="text-base font-semibold">Nothing matches</p>
          <p className="text-xs mt-1">Try another search or tap “Type new” below</p>
        </div>
      )}

      {/* Exercise list */}
      <div className="space-y-2">
        {list.map((i) => {
          const on = sel.includes(i)
          const hasVideo = (i.data?.links?.length ?? 0) > 0
          return (
            <button
              key={i.id}
              type="button"
              onClick={() => toggle(i)}
              className={`w-full text-left rounded-2xl px-4 py-3.5 border transition-colors cursor-pointer min-h-[56px] ${
                on
                  ? "bg-accent-orange/15 border-accent-orange text-white"
                  : "bg-white/[0.03] border-border-subtle hover:bg-white/[0.06]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-base font-semibold leading-snug">{plain(i.name)}</p>
                <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                  {i.data?.muscle && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/10 text-white/80">
                      {i.data.muscle}
                    </span>
                  )}
                  {hasVideo && (
                    <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-accent-orange/20 text-accent-orange">
                      <Play className="size-2.5 fill-current" /> video
                    </span>
                  )}
                </div>
              </div>

              {i.data?.sets && (
                <p className="text-xs text-text-muted mt-1 font-medium">{i.data.sets.replace(/\n/g, " ")}</p>
              )}

              {i.data?.why && (
                <p className="text-xs text-text-muted/70 italic mt-1 line-clamp-1">Why: {i.data.why}</p>
              )}
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}

/** Tappable chip selectors with phone-friendly height. */
export function Chips({ items, onPick }: { items: string[]; onPick: (v: string) => void }) {
  if (!items.length) return null
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onPick(c)}
          className="h-11 min-h-[44px] px-3.5 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold text-left whitespace-pre-line leading-tight cursor-pointer hover:bg-white/15 active:scale-95 transition-transform"
        >
          {c}
        </button>
      ))}
    </div>
  )
}

export const byKind = (lib: LibraryItem[], k: LibraryKind) => lib.filter((i) => i.kind === k)
