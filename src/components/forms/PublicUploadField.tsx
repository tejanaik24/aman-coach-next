"use client"

import { useRef, useState } from "react"
import toast from "react-hot-toast"
import { Camera, FileText, X } from "lucide-react"
import { compressImage } from "@/lib/compress-image"

interface UploadedFile {
  path: string
  name: string
  preview: string | null // local preview for images; PDFs show an icon
}

// "Tap to add" for a website visitor: camera, gallery or a PDF. Returns server paths.
export default function PublicUploadField({
  onChange,
  multiple = false,
  buttonText = "Add photo or file",
}: {
  onChange: (paths: string[]) => void
  multiple?: boolean
  buttonText?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [busy, setBusy] = useState(false)

  async function onPick(list: FileList | null) {
    if (!list || list.length === 0) return
    setBusy(true)
    const added: UploadedFile[] = []
    for (const original of Array.from(list)) {
      try {
        const file = await compressImage(original)
        const fd = new FormData()
        fd.append("file", file)
        const res = await fetch("/api/public/questionnaire/upload", { method: "POST", body: fd })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.error(data.error ?? "Could not upload. Please try again.")
          continue
        }
        added.push({
          path: data.path as string,
          name: original.name,
          preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
        })
      } catch {
        toast.error("Could not upload. Check your internet and try again.")
      }
    }
    const next = multiple ? [...files, ...added] : added.slice(0, 1).length ? added.slice(0, 1) : files
    setFiles(next)
    onChange(next.map((f) => f.path))
    setBusy(false)
    if (inputRef.current) inputRef.current.value = ""
  }

  function remove(path: string) {
    const next = files.filter((f) => f.path !== path)
    setFiles(next)
    onChange(next.map((f) => f.path))
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple={multiple}
        className="hidden"
        onChange={(e) => onPick(e.target.files)}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="w-full h-14 rounded-xl border-2 border-dashed border-accent-orange/60 bg-bg-elevated text-text-primary font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
      >
        <Camera className="size-5 text-accent-orange" />
        {busy ? "Uploading…" : buttonText}
      </button>
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f) => (
            <div key={f.path} className="relative">
              {f.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.preview} alt={f.name} className="size-20 rounded-lg object-cover border border-border-subtle" />
              ) : (
                <div className="size-20 rounded-lg border border-border-subtle bg-bg-elevated flex flex-col items-center justify-center gap-1 px-1">
                  <FileText className="size-6 text-accent-orange" />
                  <span className="text-[9px] text-text-muted truncate w-full text-center">{f.name}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => remove(f.path)}
                aria-label="Remove"
                className="absolute -top-2 -right-2 size-6 rounded-full bg-black border border-border-subtle flex items-center justify-center cursor-pointer"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
