"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { format } from "date-fns"
import { Copy, Dumbbell, FilePlus2, LayoutTemplate, PenLine, Salad, Sparkles, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { createPlan, deleteUnsentPlan, ensureStarterTemplates } from "@/lib/plan/store"
import type { PlanDoc, PlanKind } from "@/lib/plan/types"
import { Sheet } from "./parts"

type Row = Pick<PlanDoc, "id" | "title" | "kind" | "client_id" | "created_at" | "sent_at" | "data" | "is_template">

/** Client page entry: "Make plan in app". Next block / template / blank, plus drafts to continue. */
export default function StartPlan({ clientId }: { clientId: string }) {
  const router = useRouter()
  const [kind, setKind] = useState<PlanKind | null>(null)
  const [mine, setMine] = useState<Row[]>([])
  const [templates, setTemplates] = useState<Row[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const sb = createClient()
    sb.from("plan_docs").select("id, title, kind, client_id, created_at, sent_at, data, is_template").eq("client_id", clientId).order("created_at", { ascending: false }).limit(20)
      .then(({ data }: { data: unknown }) => setMine((data ?? []) as Row[]))
  }, [clientId])

  async function pick(k: PlanKind) {
    setKind(k)
    await ensureStarterTemplates().catch(() => {})
    const { data } = await createClient().from("plan_docs").select("id, title, kind, client_id, created_at, sent_at, data, is_template").eq("is_template", true).eq("kind", k).order("updated_at", { ascending: false })
    setTemplates((data ?? []) as Row[])
  }

  async function start(from: Row | null) {
    if (!kind) return
    setBusy(true)
    try {
      const id = await createPlan({ clientId, kind, from: from as PlanDoc | null })
      router.push(`/plans/maker/${id}`)
    } catch (e) {
      const m = typeof e === "object" && e !== null && "message" in e ? String((e as { message: unknown }).message) : ""
      toast.error(m.includes("plan_docs") ? "Plan maker is not switched on yet. Please tell Teja." : "Could not start. Try again.")
      setBusy(false)
    }
  }

  // Aman 27 Oct: a mis-tapped Blank/template opened a plan he could only save or send. Unsent plans only.
  async function removeDraft(p: Row) {
    if (!confirm(`Delete "${p.title || p.kind}"? It was never sent.`)) return
    try {
      await deleteUnsentPlan(p.id)
    } catch {
      return toast.error("Could not delete. Try again.")
    }
    setMine((m) => m.filter((x) => x.id !== p.id))
    toast.success("Deleted")
  }

  const last = kind ? mine.find((p) => p.kind === kind && p.sent_at) : null
  const drafts = mine.filter((p) => !p.sent_at)

  return (
    <div className="rounded-3xl border border-accent-orange/40 bg-gradient-to-b from-accent-orange/[0.12] to-transparent p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="size-5 text-accent-orange" />
        <p className="font-heading italic text-xl">Make plan in app</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => pick("workout")} className="h-20 rounded-2xl bg-accent-orange text-black font-bold text-base flex flex-col items-center justify-center gap-1 cursor-pointer"><Dumbbell className="size-6" /> Workout</button>
        <button type="button" onClick={() => pick("diet")} className="h-20 rounded-2xl bg-accent-orange text-black font-bold text-base flex flex-col items-center justify-center gap-1 cursor-pointer"><Salad className="size-6" /> Diet</button>
      </div>
      {drafts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-text-muted font-semibold">Not sent yet{drafts.length > 3 ? ` · latest 3 of ${drafts.length}` : ""}</p>
          {drafts.slice(0, 3).map((p) => (
            <div key={p.id} className="flex gap-2">
              <button type="button" onClick={() => router.push(`/plans/maker/${p.id}`)} className="flex-1 min-w-0 h-12 rounded-xl bg-white/5 px-4 text-left flex items-center gap-2 cursor-pointer">
                <PenLine className="size-4 text-accent-orange" />
                <span className="flex-1 truncate font-semibold">{p.title || p.kind}</span>
                <span className="text-xs text-text-muted">{format(new Date(p.created_at), "d MMM")}</span>
              </button>
              <button type="button" aria-label="Delete this unsent plan" onClick={() => removeDraft(p)} className="size-12 shrink-0 rounded-xl bg-white/5 text-danger grid place-items-center cursor-pointer">
                <Trash2 className="size-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {kind && (
        <Sheet title={kind === "workout" ? "New workout plan" : "New diet plan"} onClose={() => !busy && setKind(null)}>
          {last && (
            <button type="button" disabled={busy} onClick={() => start(last)} className="w-full rounded-2xl bg-accent-orange text-black p-4 text-left flex gap-3 items-center cursor-pointer disabled:opacity-60">
              <Copy className="size-7 shrink-0" />
              <span>
                <span className="block font-bold text-lg leading-tight">Next block</span>
                <span className="block text-sm">Copy “{last.title}” ({format(new Date(last.created_at), "d MMM")}) · changes show in red</span>
              </span>
            </button>
          )}
          <div>
            <p className="text-xs text-text-muted font-semibold mb-2 flex items-center gap-1.5"><LayoutTemplate className="size-4" /> Start from a template</p>
            <div className="space-y-2">
              {templates.map((t) => (
                <button key={t.id} type="button" disabled={busy} onClick={() => start(t)} className="w-full min-h-14 rounded-xl bg-[#F3EDE2] text-[#181310] font-bold text-base px-4 py-3 text-left cursor-pointer disabled:opacity-60">
                  {t.title}
                  <span className="block text-xs font-medium text-[#181310]/60 mt-0.5">
                    {t.kind === "workout" ? `${t.data.workout?.days.filter((d) => !d.rest).length ?? 0} training days` : `${t.data.diet?.plans.length ?? 0} diet${(t.data.diet?.plans.length ?? 0) > 1 ? "s" : ""}`}
                  </span>
                </button>
              ))}
              {mine.filter((p) => p.kind === kind && p.sent_at && p.id !== last?.id).slice(0, 3).map((p) => (
                <button key={p.id} type="button" disabled={busy} onClick={() => start(p)} className="w-full h-12 rounded-xl bg-white/5 px-4 text-left text-sm font-semibold cursor-pointer disabled:opacity-60">
                  Older: {p.title} · {format(new Date(p.created_at), "d MMM")}
                </button>
              ))}
            </div>
          </div>
          <button type="button" disabled={busy} onClick={() => start(null)} className="w-full h-12 rounded-xl bg-white/5 font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
            <FilePlus2 className="size-4" /> Blank plan
          </button>
          {busy && <p className="text-center text-text-muted text-sm">Filling in the client’s details…</p>}
        </Sheet>
      )}
    </div>
  )
}
