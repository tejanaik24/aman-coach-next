"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import toast from "react-hot-toast"
import { Dumbbell, Salad, FileText, Upload, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type Kind = "workout" | "diet"

interface Template {
  id: string
  kind: Kind
  title: string
  note: string | null
  created_at: string
}

const BUCKET = "client-documents"
const MAX_BYTES = 15 * 1024 * 1024

// Aman's saved plans (PDFs). He sends one to a client from that client's page.
export default function PlansLibraryPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [kind, setKind] = useState<Kind>("workout")
  const [templates, setTemplates] = useState<Template[] | null>(null)
  const [pending, setPending] = useState<{ file: File; kind: Kind } | null>(null)
  const [title, setTitle] = useState("")
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("client_documents")
      .select("id, kind, title, note, created_at")
      .eq("is_template", true)
      .order("created_at", { ascending: false })
    setTemplates((data ?? []) as Template[])
  }, [])

  useEffect(() => { load() }, [load])

  function choose(k: Kind) {
    setKind(k)
    fileRef.current?.click()
  }

  function onFile(file: File | undefined) {
    if (!file) return
    if (file.size > MAX_BYTES) { toast.error("File is too big (max 15 MB)"); return }
    setPending({ file, kind })
    setTitle(file.name.replace(/\.[^.]+$/, ""))
    if (fileRef.current) fileRef.current.value = ""
  }

  async function upload() {
    if (!pending) return
    setBusy(true)
    try {
      const res = await fetch("/api/coach/documents/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: pending.file.name }),
      })
      const { path, token, error } = await res.json()
      if (!res.ok) throw new Error(error ?? "Upload failed")
      const supabase = createClient()
      const up = await supabase.storage.from(BUCKET).uploadToSignedUrl(path, token, pending.file)
      if (up.error) throw up.error
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not signed in")
      const ins = await supabase.from("client_documents").insert({
        coach_id: user.id,
        client_id: null,
        kind: pending.kind,
        title: title.trim() || (pending.kind === "workout" ? "Workout plan" : "Diet plan"),
        file_path: path,
        is_template: true,
      })
      if (ins.error) throw ins.error
      toast.success("Saved to your plans")
      setPending(null)
      load()
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Upload failed. Try again.")
    } finally {
      setBusy(false)
    }
  }

  async function open(id: string) {
    const res = await fetch(`/api/documents/${id}/url`)
    const body = await res.json().catch(() => ({}))
    if (!res.ok || !body.url) { toast.error("Could not open the file"); return }
    window.open(body.url, "_blank", "noopener")
  }

  async function remove(t: Template) {
    if (!window.confirm(`Remove "${t.title}" from your saved plans? Clients who already have it keep it.`)) return
    const supabase = createClient()
    const { error } = await supabase.from("client_documents").delete().eq("id", t.id)
    if (error) { toast.error("Could not remove. Try again."); return }
    setTemplates((ts) => (ts ?? []).filter((x) => x.id !== t.id))
  }

  const group = (k: Kind) => (templates ?? []).filter((t) => t.kind === k)

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="px-5 pt-8 pb-32 max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="font-heading italic text-4xl">Plans</h1>
          <p className="text-text-muted text-base mt-1">Save your PDF plans here. To send one, open a client and tap Plans.</p>
        </div>

        <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => choose("workout")} className="h-24 rounded-2xl bg-accent-orange text-black font-bold text-base flex flex-col items-center justify-center gap-1.5 cursor-pointer">
            <Dumbbell className="size-6" /> Add workout plan
          </button>
          <button type="button" onClick={() => choose("diet")} className="h-24 rounded-2xl bg-accent-orange text-black font-bold text-base flex flex-col items-center justify-center gap-1.5 cursor-pointer">
            <Salad className="size-6" /> Add diet plan
          </button>
        </div>

        {(["workout", "diet"] as Kind[]).map((k) => (
          <section key={k} className="space-y-3">
            <h2 className="text-lg font-semibold">{k === "workout" ? "Workout plans" : "Diet plans"}</h2>
            {templates === null ? (
              <div className="h-20 rounded-2xl animate-pulse bg-white/10" />
            ) : group(k).length === 0 ? (
              <p className="text-text-muted text-base">None saved yet.</p>
            ) : (
              group(k).map((t) => (
                <div key={t.id} className="rounded-2xl bg-bg-card border border-border-subtle p-4">
                  <div className="flex items-start gap-3">
                    <FileText className="size-6 text-accent-orange shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-semibold leading-tight">{t.title}</p>
                      <p className="text-text-muted text-sm mt-0.5">Saved {format(new Date(t.created_at), "d MMM yyyy")}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button type="button" onClick={() => open(t.id)} className="h-12 rounded-xl bg-white/10 text-white font-bold text-base cursor-pointer">Open</button>
                    <button type="button" onClick={() => remove(t)} className="h-12 rounded-xl bg-white/5 text-red-300 font-bold text-base flex items-center justify-center gap-2 cursor-pointer">
                      <Trash2 className="size-4" /> Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>
        ))}

        <button type="button" onClick={() => router.push("/plans/builder")} className="w-full h-12 rounded-xl bg-white/5 text-text-muted font-semibold text-base cursor-pointer">
          Build a plan inside the app (advanced)
        </button>
      </div>

      {pending && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/70" onClick={() => !busy && setPending(null)}>
          <div className="w-full max-w-lg mx-auto rounded-t-3xl bg-bg-card border-t border-border-subtle p-5 pb-8" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading italic text-2xl mb-1">{pending.kind === "workout" ? "Workout plan" : "Diet plan"}</h3>
            <p className="text-sm text-text-muted mb-3">File: {pending.file.name}</p>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name of the plan" className="w-full h-14 rounded-2xl bg-[#1A1A1A] border border-[#333333] px-4 text-white text-base outline-none focus:border-[#C9A84C] mb-4" />
            <button type="button" disabled={busy} onClick={upload} className="w-full h-14 rounded-2xl bg-[#C9A84C] text-black font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer">
              <Upload className="size-5" /> {busy ? "Uploading…" : "Save plan"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
