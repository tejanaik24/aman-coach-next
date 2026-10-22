"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import toast from "react-hot-toast"
import { FileText } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { openUrl } from "@/lib/utils"

interface Doc {
  id: string
  title: string
  note: string | null
  created_at: string
}

// "Your plan from Aman": PDFs the coach uploaded for this client, one tap to open.
export default function PlanDocuments({ kind }: { kind: "workout" | "diet" | "cycle" | "other" }) {
  const [docs, setDocs] = useState<Doc[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: client } = await supabase.from("clients").select("id").eq("user_id", user.id).maybeSingle()
        if (!client) return
        const { data } = await supabase
          .from("client_documents")
          .select("id, title, note, created_at")
          .eq("client_id", client.id)
          .eq("kind", kind)
          .order("created_at", { ascending: false })
        if (!cancelled) setDocs((data ?? []) as Doc[])
      } catch {
        // no documents is fine
      }
    })()
    return () => { cancelled = true }
  }, [kind])

  async function open(id: string) {
    const res = await fetch(`/api/documents/${id}/url`)
    const body = await res.json().catch(() => ({}))
    if (!res.ok || !body.url) { toast.error("Could not open the document. Try again."); return }
    openUrl(body.url)
  }

  if (docs.length === 0) return null

  const sectionLabel =
    kind === "other"
      ? "Documents & guides from Aman"
      : kind === "cycle"
      ? "Your cycle plan from Aman"
      : `Your ${kind} plan from Aman`

  return (
    <div data-plan-docs={kind === "cycle" ? undefined : ""} className="space-y-3 mb-6">
      <p className="text-sm text-text-muted">{sectionLabel}</p>
      {docs.map((d, i) => (
        <button
          key={d.id}
          type="button"
          onClick={() => open(d.id)}
          className={`w-full rounded-2xl p-4 flex items-center gap-4 text-left cursor-pointer ${
            i === 0 && kind !== "other"
              ? "bg-accent-orange text-black"
              : "bg-bg-card border border-border-subtle text-white"
          }`}
        >
          <FileText className={`size-8 shrink-0 ${i === 0 && kind !== "other" ? "text-black" : "text-accent-orange"}`} />
          <span className="min-w-0 flex-1">
            <span className="block text-xl font-bold leading-tight">{d.title}</span>
            <span
              className={`block text-base mt-0.5 whitespace-pre-line ${
                i === 0 && kind !== "other" ? "text-black/70" : "text-text-muted"
              }`}
            >
              {format(new Date(d.created_at), "d MMM yyyy")}{d.note ? ` · ${d.note}` : ""}
            </span>
            <span
              className={`block text-sm font-semibold mt-1 ${
                i === 0 && kind !== "other" ? "text-black" : "text-accent-orange"
              }`}
            >
              Tap to open
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}
