"use client"

import { useMemo, useState, type ReactNode } from "react"
import { ArrowDown, ArrowUp, Plus, Search, X } from "lucide-react"
import { plain, type LibraryItem, type LibraryKind } from "@/lib/plan/types"

export const inputCls =
  "w-full rounded-xl bg-[#1A1A1A] border border-[#333333] px-3.5 text-white text-base outline-none focus:border-accent-orange placeholder:text-white/30"

/** Bottom sheet, same pattern as the rest of the coach app. */
export function Sheet({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-black/70" onClick={onClose}>
      <div className="w-full max-w-2xl mx-auto rounded-t-3xl bg-bg-card border-t border-border-subtle max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h3 className="font-heading italic text-2xl">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="size-11 grid place-items-center rounded-full bg-white/5 cursor-pointer"><X className="size-5" /></button>
        </div>
        <div className="overflow-y-auto px-5 pb-4 space-y-4">{children}</div>
        {footer && <div className="px-5 pt-3 pb-6 border-t border-border-subtle">{footer}</div>}
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
  lines, onChange, placeholder, library, addLabel,
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
        <div key={i} className="flex gap-1.5 items-start">
          <textarea value={l} onChange={(e) => set(i, e.target.value)} rows={Math.min(4, Math.max(1, Math.ceil(l.length / 38)))} placeholder={placeholder} className={`${inputCls} py-2.5 resize-none leading-snug`} />
          <div className="flex flex-col gap-1">
            <button type="button" onClick={() => move(i, -1)} aria-label="Move up" className="size-9 grid place-items-center rounded-lg bg-white/5 cursor-pointer"><ArrowUp className="size-4" /></button>
            <button type="button" onClick={() => move(i, 1)} aria-label="Move down" className="size-9 grid place-items-center rounded-lg bg-white/5 cursor-pointer"><ArrowDown className="size-4" /></button>
          </div>
          <button type="button" onClick={() => onChange(lines.filter((_, j) => j !== i))} aria-label="Remove" className="size-9 mt-0 grid place-items-center rounded-lg bg-danger/10 text-danger cursor-pointer"><X className="size-4" /></button>
        </div>
      ))}
      <div className="flex gap-2">
        <button type="button" onClick={() => onChange([...lines, ""])} className="h-11 px-4 rounded-xl bg-white/5 text-white font-semibold text-sm flex items-center gap-1.5 cursor-pointer"><Plus className="size-4" /> Type new</button>
        {library && library.length > 0 && (
          <button type="button" onClick={() => setPicking(true)} className="h-11 px-4 rounded-xl bg-accent-orange/15 text-accent-orange font-semibold text-sm flex items-center gap-1.5 cursor-pointer"><Search className="size-4" /> {addLabel}</button>
        )}
      </div>
      {picking && library && (
        <LibraryPicker title={addLabel} items={library} multi onClose={() => setPicking(false)} onPick={(items) => { onChange([...lines, ...items.map((x) => x.name)]); setPicking(false) }} />
      )}
    </div>
  )
}

/** Search Aman's library. multi = tick several then add. */
export function LibraryPicker({ title, items, onPick, onClose, multi, onNew }: { title: string; items: LibraryItem[]; onPick: (i: LibraryItem[]) => void; onClose: () => void; multi?: boolean; onNew?: () => void }) {
  const [q, setQ] = useState("")
  const [sel, setSel] = useState<LibraryItem[]>([])
  const list = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    return items.filter((i) => { const n = plain(i.name).toLowerCase(); return words.every((w) => n.includes(w)) }).slice(0, 80)
  }, [q, items])
  const toggle = (i: LibraryItem) => (multi ? setSel((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i])) : onPick([i]))
  return (
    <Sheet
      title={title}
      onClose={onClose}
      footer={multi || onNew ? (
        <div className="flex gap-2">
          {onNew && (
            <button type="button" onClick={onNew} className="h-14 px-5 rounded-2xl bg-white/10 text-white font-bold text-base flex items-center gap-1.5 cursor-pointer"><Plus className="size-5" /> Type new</button>
          )}
          {multi && (
            <button type="button" disabled={!sel.length} onClick={() => onPick(sel)} className="flex-1 h-14 rounded-2xl bg-accent-orange text-black font-bold text-lg disabled:opacity-40 cursor-pointer">
              Add {sel.length || ""} selected
            </button>
          )}
        </div>
      ) : undefined}
    >
      <div className="relative sticky top-0 z-10 bg-bg-card pb-1">
        <Search className="size-5 absolute left-3.5 top-4 text-text-muted" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your saved list…" className={`${inputCls} h-14 pl-11`} />
      </div>
      {list.length === 0 && <p className="text-text-muted">Nothing saved matches. Close and tap “Type new”.</p>}
      <div className="space-y-2">
        {list.map((i) => {
          const on = sel.includes(i)
          return (
            <button key={i.id} type="button" onClick={() => toggle(i)} className={`w-full text-left rounded-xl px-4 py-3 border transition-colors cursor-pointer ${on ? "bg-accent-orange/15 border-accent-orange" : "bg-white/[0.03] border-border-subtle"}`}>
              <p className="text-base leading-snug">{plain(i.name)}</p>
              {i.data.sets && <p className="text-xs text-text-muted mt-0.5">{i.data.sets.replace(/\n/g, " ")}</p>}
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}

export function Chips({ items, onPick }: { items: string[]; onPick: (v: string) => void }) {
  if (!items.length) return null
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((c) => (
        <button key={c} type="button" onClick={() => onPick(c)} className="px-3 py-2 rounded-full bg-white/10 text-white text-xs font-semibold text-left whitespace-pre-line leading-tight cursor-pointer hover:bg-white/15">
          {c}
        </button>
      ))}
    </div>
  )
}

export const byKind = (lib: LibraryItem[], k: LibraryKind) => lib.filter((i) => i.kind === k)
