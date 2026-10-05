"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { format } from "date-fns"
import toast from "react-hot-toast"
import { Dumbbell, Salad, FileText, MessageCircle, Upload, Bookmark } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { waLink } from "@/lib/quick-manage"

type Kind = "workout" | "diet"

interface Doc {
  id: string
  kind: Kind
  title: string
  note: string | null
  file_path: string
  is_template: boolean
  created_at: string
}

interface Props {
  clientId: string
  clientName: string
  phone: string | null | undefined
}

const BUCKET = "client-documents"
const MAX_BYTES = 15 * 1024 * 1024
const KIND_LABEL: Record<Kind, string> = { workout: "Workout plan", diet: "Diet plan" }

export default function SendPlanPanel({ clientId, clientName, phone }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [pickKind, setPickKind] = useState<Kind>("workout")
  const [docs, setDocs] = useState<Doc[]>([])
  const [templates, setTemplates] = useState<Doc[]>([])
  const [pending, setPending] = useState<{ file: File; kind: Kind } | null>(null)
  const [title, setTitle] = useState("")
  const [note, setNote] = useState("")
  const [saveTemplate, setSaveTemplate] = useState(false)
  const [busy, setBusy] = useState(false)
  const [templateKind, setTemplateKind] = useState<Kind | null>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const [d, t] = await Promise.all([
      supabase.from("client_documents").select("id, kind, title, note, file_path, is_template, created_at").eq("client_id", clientId).order("created_at", { ascending: false }),
      supabase.from("client_documents").select("id, kind, title, note, file_path, is_template, created_at").eq("is_template", true).order("created_at", { ascending: false }),
    ])
    setDocs((d.data ?? []) as Doc[])
    setTemplates((t.data ?? []) as Doc[])
  }, [clientId])

  useEffect(() => { load() }, [load])

  function choose(kind: Kind) {
    setPickKind(kind)
    fileRef.current?.click()
  }

  function onFile(file: File | undefined) {
    if (!file) return
    if (file.size > MAX_BYTES) { toast.error("File is too big (max 15 MB)"); return }
    setPending({ file, kind: pickKind })
    setTitle(file.name.replace(/\.[^.]+$/, ""))
    setNote("")
    setSaveTemplate(false)
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
      const base = { coach_id: user.id, kind: pending.kind, title: title.trim() || KIND_LABEL[pending.kind], file_path: path, note: note.trim() || null }
      const rows = [{ ...base, client_id: clientId, is_template: false }]
      if (saveTemplate) rows.push({ ...base, client_id: null as unknown as string, is_template: true })
      const ins = await supabase.from("client_documents").insert(rows)
      if (ins.error) throw ins.error

      toast.success("Saved. Now tap WhatsApp to tell the client.")
      setPending(null)
      load()
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Upload failed. Try again.")
    } finally {
      setBusy(false)
    }
  }

  async function applyTemplate(t: Doc) {
    setBusy(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from("client_documents").insert({
      coach_id: user?.id, client_id: clientId, kind: t.kind, title: t.title, file_path: t.file_path, note: t.note, is_template: false,
    })
    setBusy(false)
    if (error) { toast.error("Could not add. Try again."); return }
    toast.success(`${t.title} added for ${clientName.split(" ")[0]}`)
    setTemplateKind(null)
    load()
  }

  async function open(id: string) {
    const res = await fetch(`/api/documents/${id}/url`)
    const data = await res.json()
    if (!res.ok) { toast.error("Could not open the file"); return }
    window.open(data.url, "_blank", "noopener")
  }

  const first = clientName.split(" ")[0]
  const msg = (d: Doc) =>
    `Hi ${first}, your ${d.kind === "workout" ? "workout" : "diet"} plan "${d.title}" is ready 💪 Open it in your app: ${typeof window !== "undefined" ? window.location.origin : ""}/${d.kind === "workout" ? "workout" : "diet"}`

  return (
    <div className="space-y-4">
      <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => choose("workout")} className="h-24 rounded-2xl bg-accent-orange text-black font-bold text-base flex flex-col items-center justify-center gap-1.5 cursor-pointer">
          <Dumbbell className="size-6" /> Send workout plan
        </button>
        <button type="button" onClick={() => choose("diet")} className="h-24 rounded-2xl bg-accent-orange text-black font-bold text-base flex flex-col items-center justify-center gap-1.5 cursor-pointer">
          <Salad className="size-6" /> Send diet plan
        </button>
      </div>
      <p className="text-text-muted text-sm">Pick a PDF (or a photo of the plan) from your phone.</p>

      {templates.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {(["workout", "diet"] as Kind[]).map((k) => (
            <button key={k} type="button" onClick={() => setTemplateKind(k)} className="h-12 rounded-xl bg-white/10 text-white font-semibold text-base flex items-center justify-center gap-2 cursor-pointer">
              <Bookmark className="size-4" /> Saved {k} plans
            </button>
          ))}
        </div>
      )}

      {/* Plans already sent to this client */}
      <div className="space-y-3">
        {docs.length === 0 ? (
          <p className="text-text-muted text-base">No plans sent yet.</p>
        ) : (
          docs.map((d) => {
            const wa = waLink(phone ?? null, msg(d))
            return (
              <div key={d.id} className="rounded-2xl bg-bg-card border border-border-subtle p-4">
                <div className="flex items-start gap-3">
                  <FileText className="size-6 text-accent-orange shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-lg font-semibold leading-tight">{d.title}</p>
                    <p className="text-text-muted text-sm mt-0.5">{KIND_LABEL[d.kind]} · {format(new Date(d.created_at), "d MMM yyyy")}</p>
                    {d.note && <p className="text-text-muted text-base mt-1">{d.note}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {wa ? (
                    <a href={wa} target="_blank" rel="noopener noreferrer" className="h-12 rounded-xl bg-[#25D366] text-black font-bold text-base flex items-center justify-center gap-2">
                      <MessageCircle className="size-5" /> WhatsApp
                    </a>
                  ) : (
                    <span className="h-12 rounded-xl bg-white/5 text-text-muted text-sm flex items-center justify-center">No number</span>
                  )}
                  <button type="button" onClick={() => open(d.id)} className="h-12 rounded-xl bg-white/10 text-white font-bold text-base cursor-pointer">Open</button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Confirm upload */}
      {pending && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/70" onClick={() => !busy && setPending(null)}>
          <div className="w-full max-w-lg mx-auto rounded-t-3xl bg-bg-card border-t border-border-subtle p-5 pb-8" onClick={(e) => e.stopPropagation()}>
            <p className="text-text-muted text-sm">{clientName}</p>
            <h3 className="font-heading italic text-2xl mb-4">{KIND_LABEL[pending.kind]}</h3>
            <p className="text-sm text-text-muted mb-1">File: {pending.file.name}</p>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name of the plan" className="w-full h-14 rounded-2xl bg-[#1A1A1A] border border-[#333333] px-4 text-white text-base outline-none focus:border-[#C9A84C] mt-2 mb-3" />
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for the client (optional)" className="w-full h-14 rounded-2xl bg-[#1A1A1A] border border-[#333333] px-4 text-white text-base outline-none focus:border-[#C9A84C] mb-4" />
            <label className="flex items-center gap-3 text-base mb-5 cursor-pointer">
              <input type="checkbox" checked={saveTemplate} onChange={(e) => setSaveTemplate(e.target.checked)} className="size-6 accent-[#FF6A1A]" />
              Also save to reuse for other clients
            </label>
            <button type="button" disabled={busy} onClick={upload} className="w-full h-14 rounded-2xl bg-[#C9A84C] text-black font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer">
              <Upload className="size-5" /> {busy ? "Uploading…" : "Upload"}
            </button>
          </div>
        </div>
      )}

      {/* Saved templates */}
      {templateKind && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/70" onClick={() => setTemplateKind(null)}>
          <div className="w-full max-w-lg mx-auto rounded-t-3xl bg-bg-card border-t border-border-subtle p-5 pb-8 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading italic text-2xl mb-4">Saved {templateKind} plans</h3>
            <div className="grid gap-2">
              {templates.filter((t) => t.kind === templateKind).length === 0 ? (
                <p className="text-text-muted text-base">None saved yet.</p>
              ) : (
                templates.filter((t) => t.kind === templateKind).map((t) => (
                  <button key={t.id} disabled={busy} type="button" onClick={() => applyTemplate(t)} className="h-14 rounded-xl bg-[#F3EDE2] text-[#181310] font-bold text-lg px-4 text-left cursor-pointer disabled:opacity-50">
                    {t.title}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
