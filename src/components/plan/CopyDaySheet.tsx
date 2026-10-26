"use client"

import { useEffect, useState } from "react"
import { ChevronLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cloneWithNewIds, type WorkoutDay } from "@/lib/plan/types"
import { Sheet } from "./parts"

type Src = { id: string; title: string; is_template: boolean; updated_at: string; who: string; days: WorkoutDay[] | null }

/** "Copy a day from…": pick any of Aman's other workout plans or templates, then one of its days. */
export default function CopyDaySheet({ currentId, onPick, onClose }: { currentId: string; onPick: (day: WorkoutDay) => void; onClose: () => void }) {
  const [plans, setPlans] = useState<Src[] | null>(null)
  const [plan, setPlan] = useState<Src | null>(null)

  useEffect(() => {
    createClient()
      .from("plan_docs")
      .select("id, title, is_template, updated_at, days:data->workout->days, client:clients(profile:profiles!user_id(name))")
      .eq("kind", "workout")
      .neq("id", currentId)
      .order("updated_at", { ascending: false })
      .limit(40)
      .then(({ data }: { data: unknown[] | null }) => {
        setPlans(
          ((data ?? []) as (Omit<Src, "who"> & { client: { profile: { name: string } | { name: string }[] | null } | null })[]).map((p) => {
            const prof = Array.isArray(p.client?.profile) ? p.client?.profile[0] : p.client?.profile
            return { ...p, who: p.is_template ? "Template" : prof?.name ?? "" }
          }),
        )
      })
  }, [currentId])

  const btn = "w-full text-left px-4 py-3 rounded-xl bg-white/5 border border-border-subtle cursor-pointer hover:bg-white/10"
  return (
    <Sheet title={plan ? plan.title : "Copy a day from…"} onClose={onClose}>
      {!plans ? (
        <p className="text-text-muted text-sm">Loading your plans…</p>
      ) : plan ? (
        <div className="space-y-2">
          <button type="button" onClick={() => setPlan(null)} className="text-sm text-accent-orange font-semibold flex items-center gap-1 cursor-pointer">
            <ChevronLeft className="size-4" /> All plans
          </button>
          {(plan.days ?? []).filter((d) => !d.rest && d.rows.length).map((d) => (
            <button key={d.id} type="button" onClick={() => onPick(cloneWithNewIds(d))} className={btn}>
              <span className="block font-semibold">{d.title}</span>
              <span className="block text-xs text-text-muted mt-0.5 line-clamp-1">
                {d.rows.filter((r) => r.type !== "banner").length} exercises · {d.rows.filter((r) => r.type !== "banner").slice(0, 3).map((r) => r.name).join(", ")}
              </span>
            </button>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <p className="text-text-muted text-sm">No other workout plans yet.</p>
      ) : (
        <div className="space-y-2">
          {plans.filter((p) => p.days?.some((d) => !d.rest && d.rows.length)).map((p) => (
            <button key={p.id} type="button" onClick={() => setPlan(p)} className={btn}>
              <span className="block font-semibold">{p.title}</span>
              <span className="block text-xs text-text-muted mt-0.5">{p.who}</span>
            </button>
          ))}
        </div>
      )}
    </Sheet>
  )
}
