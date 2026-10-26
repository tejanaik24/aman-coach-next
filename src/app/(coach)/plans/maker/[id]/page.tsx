"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { backfillUsage, loadLibrary } from "@/lib/plan/store"
import type { LibraryItem, PlanDoc } from "@/lib/plan/types"
import PlanEditor from "@/components/plan/PlanEditor"

export default function PlanMakerPage() {
  const { id } = useParams<{ id: string }>()
  const [doc, setDoc] = useState<PlanDoc | null>(null)
  const [client, setClient] = useState<{ name: string; phone: string | null } | null>(null)
  const [library, setLibrary] = useState<LibraryItem[]>([])
  const [missing, setMissing] = useState(false)

  const refreshLibrary = useCallback(() => {
    loadLibrary().then(async (items) => {
      setLibrary(items)
      if (await backfillUsage(items).catch(() => false)) loadLibrary().then(setLibrary)
    })
  }, [])

  useEffect(() => {
    const sb = createClient()
    sb.from("plan_docs").select("*").eq("id", id).single().then(async ({ data }: { data: unknown }) => {
      if (!data) { setMissing(true); return }
      const d = data as PlanDoc
      if (d.client_id) {
        const { data: c } = await sb.from("clients").select("profile:profiles!user_id(name, phone)").eq("id", d.client_id).single()
        const p = (c as unknown as { profile: { name: string; phone: string | null } | { name: string; phone: string | null }[] | null } | null)?.profile
        setClient(Array.isArray(p) ? p[0] ?? null : p ?? null)
      }
      setDoc(d)
    })
    refreshLibrary()
  }, [id, refreshLibrary])

  if (missing) return <p className="p-8 text-text-muted">This plan was not found.</p>
  if (!doc) return <div className="p-6 space-y-3 max-w-2xl mx-auto">{[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-3xl bg-bg-card skeleton-pulse" />)}</div>
  return <div className="px-4"><PlanEditor initial={doc} library={library} client={client} onLibraryChange={refreshLibrary} /></div>
}
