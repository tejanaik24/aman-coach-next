"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { format } from "date-fns"
import { ArrowLeft, Plus, Search, Trash2, Pencil, Users } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { createPlan, ensureStarterTemplates, loadLibrary } from "@/lib/plan/store"
import { plain, type LibraryItem, type LibraryKind, type PlanKind } from "@/lib/plan/types"
import { Sheet, Label, inputCls } from "@/components/plan/parts"
import { RowSheet } from "@/components/plan/sheets"
import GiveToClientsModal from "@/components/coach/GiveToClientsModal"

type Tab = "templates" | LibraryKind
const TABS: { k: Tab; label: string }[] = [
  { k: "templates", label: "Templates" },
  { k: "exercise", label: "Exercises" },
  { k: "warmup", label: "Warm-ups" },
  { k: "food", label: "Foods" },
  { k: "supplement", label: "Supplements" },
  { k: "banner", label: "Red lines" },
  { k: "sets", label: "Sets & reps" },
]
type Tpl = { id: string; title: string; kind: PlanKind; updated_at: string }

export default function PlanLibraryPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("templates")
  const [items, setItems] = useState<LibraryItem[]>([])
  const [tpls, setTpls] = useState<Tpl[]>([])
  const [q, setQ] = useState("")
  const [editing, setEditing] = useState<LibraryItem | null>(null)
  const [giveTarget, setGiveTarget] = useState<Tpl | null>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.from("plan_docs").select("id, title, kind, updated_at").eq("is_template", true).order("updated_at", { ascending: false })
    const list = (data ?? []) as Tpl[]
    if (list.length === 0) {
      await ensureStarterTemplates().catch(() => {})
      const { data: retry } = await supabase.from("plan_docs").select("id, title, kind, updated_at").eq("is_template", true).order("updated_at", { ascending: false })
      setTpls((retry ?? []) as Tpl[])
    } else {
      setTpls(list)
    }
    loadLibrary().then(setItems).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  const list = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    return items.filter((i) => i.kind === tab && words.every((w) => plain(i.name).toLowerCase().includes(w)))
  }, [items, tab, q])

  async function saveItem(it: LibraryItem) {
    const sb = createClient()
    const row = { kind: it.kind, name: it.name.trim(), data: it.data, updated_at: new Date().toISOString() }
    const { error } = it.id ? await sb.from("coach_library").update(row).eq("id", it.id) : await sb.from("coach_library").insert(row)
    if (error) { toast.error(error.message.includes("duplicate") ? "That one is already saved" : "Could not save"); return }
    toast.success("Saved")
    load()
  }
  async function removeItem(it: LibraryItem) {
    if (!confirm(`Delete "${plain(it.name).slice(0, 60)}" from your list? Plans already made keep it.`)) return
    await createClient().from("coach_library").delete().eq("id", it.id)
    setItems((x) => x.filter((y) => y.id !== it.id))
  }
  async function newTemplate(kind: PlanKind) {
    try { router.push(`/plans/maker/${await createPlan({ clientId: null, kind, asTemplate: true })}`) } catch { toast.error("Could not create") }
  }
  async function renameTpl(t: Tpl) {
    const name = prompt("Template name", t.title)?.trim()
    if (!name) return
    await createClient().from("plan_docs").update({ title: name }).eq("id", t.id)
    load()
  }
  async function removeTpl(t: Tpl) {
    if (!confirm(`Delete template "${t.title}"? Plans already sent are not affected.`)) return
    await createClient().from("plan_docs").delete().eq("id", t.id)
    setTpls((x) => x.filter((y) => y.id !== t.id))
  }

  const blank = (k: LibraryKind): LibraryItem => ({ id: "", kind: k, name: "", data: {}, use_count: 0 })

  return (
    <div className="max-w-2xl mx-auto px-4 pb-32">
      <div className="sticky top-0 z-30 -mx-4 px-4 py-3 bg-bg-primary/90 backdrop-blur flex items-center gap-3 border-b border-border-subtle">
        <button type="button" onClick={() => router.push("/plans")} aria-label="Back" className="size-11 grid place-items-center rounded-full bg-white/5 cursor-pointer"><ArrowLeft className="size-5" /></button>
        <h1 className="font-heading italic text-2xl">My plan library</h1>
      </div>
      <p className="text-text-muted text-sm mt-4">Everything you write in a plan is saved here, so next time it is one tap. Edit or delete anything.</p>

      <div className="flex gap-2 overflow-x-auto mt-4 pb-1 -mx-4 px-4">
        {TABS.map((t) => (
          <button key={t.k} type="button" onClick={() => { setTab(t.k); setQ("") }} className={`h-11 px-4 rounded-full whitespace-nowrap text-sm font-bold cursor-pointer ${tab === t.k ? "bg-accent-orange text-black" : "bg-white/5"}`}>
            {t.label}
            {t.k !== "templates" && <span className="ml-1.5 opacity-60">{items.filter((i) => i.kind === t.k).length}</span>}
          </button>
        ))}
      </div>

      {tab === "templates" ? (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => newTemplate("workout")} className="h-12 rounded-xl bg-accent-orange/15 text-accent-orange border border-accent-orange/40 font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer"><Plus className="size-4" /> Workout template</button>
            <button type="button" onClick={() => newTemplate("diet")} className="h-12 rounded-xl bg-accent-orange/15 text-accent-orange border border-accent-orange/40 font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer"><Plus className="size-4" /> Diet template</button>
          </div>
          {tpls.map((t) => (
            <div key={t.id} className="rounded-2xl bg-bg-card border border-border-subtle p-4">
              <p className="text-xs uppercase tracking-widest text-accent-orange font-bold">{t.kind}</p>
              <p className="text-lg font-semibold leading-tight mt-0.5">{t.title}</p>
              <p className="text-text-muted text-xs mt-0.5">Edited {format(new Date(t.updated_at), "d MMM yyyy")}</p>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <button type="button" onClick={() => router.push(`/plans/maker/${t.id}`)} className="h-11 rounded-xl bg-white/10 font-bold text-sm cursor-pointer">Edit</button>
                <button type="button" onClick={() => renameTpl(t)} className="h-11 rounded-xl bg-white/10 font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer"><Pencil className="size-4" /> Rename</button>
                <button type="button" onClick={() => removeTpl(t)} className="h-11 rounded-xl bg-danger/10 text-danger font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer"><Trash2 className="size-4" /> Delete</button>
              </div>
              <button
                type="button"
                onClick={() => setGiveTarget(t)}
                className="w-full h-11 mt-2 rounded-xl bg-accent-orange/15 border border-accent-orange/40 text-accent-orange font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Users className="size-4" /> Give to clients
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="size-5 absolute left-3.5 top-3.5 text-text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className={`${inputCls} h-12 pl-11`} />
            </div>
            <button type="button" onClick={() => setEditing(blank(tab))} className="h-12 px-4 rounded-xl bg-accent-orange text-black font-bold flex items-center gap-1.5 cursor-pointer"><Plus className="size-4" /> Add</button>
          </div>
          {list.length === 0 && <p className="text-text-muted">Nothing here yet. It fills up as you make plans.</p>}
          {list.map((i) => (
            <div key={i.id} className="flex items-stretch rounded-2xl bg-bg-card border border-border-subtle overflow-hidden">
              <button type="button" onClick={() => setEditing(i)} className="flex-1 min-w-0 text-left px-4 py-3 cursor-pointer">
                <p className="leading-snug whitespace-pre-line">{plain(i.name)}</p>
                {(i.data.sets || i.data.links?.length) && (
                  <p className="text-xs text-text-muted mt-1">{[i.data.sets?.replace(/\s*\n\s*/g, " "), i.data.links?.length ? `${i.data.links.length} video` : ""].filter(Boolean).join(" · ")}</p>
                )}
              </button>
              <button type="button" onClick={() => removeItem(i)} aria-label="Delete" className="w-12 grid place-items-center text-danger/80 cursor-pointer"><Trash2 className="size-5" /></button>
            </div>
          ))}
        </div>
      )}

      {editing && (editing.kind === "exercise" || editing.kind === "warmup") && (
        <RowSheet
          row={{ id: editing.id || "new", type: editing.kind, name: editing.name, links: editing.data.links ?? [], cues: editing.data.cues ?? [], sets: editing.data.sets ?? "" }}
          library={[]}
          onClose={() => setEditing(null)}
          onSave={(r) => { if (r.name) saveItem({ ...editing, kind: r.type, name: r.name, data: { links: r.links, cues: r.cues, sets: r.sets } }) }}
        />
      )}
      {editing && editing.kind !== "exercise" && editing.kind !== "warmup" && (
        <TextItemSheet item={editing} onClose={() => setEditing(null)} onSave={(name) => { if (name.trim()) saveItem({ ...editing, name }); setEditing(null) }} />
      )}

      {giveTarget && (
        <GiveToClientsModal
          isOpen={true}
          onClose={() => setGiveTarget(null)}
          planId={giveTarget.id}
          planTitle={giveTarget.title}
          planType="maker"
          kind={giveTarget.kind}
        />
      )}
    </div>
  )
}

function TextItemSheet({ item, onSave, onClose }: { item: LibraryItem; onSave: (n: string) => void; onClose: () => void }) {
  const [name, setName] = useState(item.name)
  return (
    <Sheet title={item.id ? "Edit item" : "New item"} onClose={onClose} footer={<button type="button" onClick={() => onSave(name)} className="w-full h-12 rounded-xl bg-accent-orange text-black font-bold text-sm cursor-pointer">Save</button>}>
      <Label>Name</Label>
      <input value={name} onChange={(e) => setName(e.target.value)} autoFocus className={`${inputCls} h-12`} />
    </Sheet>
  )
}
