"use client"

import React, { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Upload, X, Camera, RefreshCw, Check, Sparkles } from "lucide-react"

// ─── Progress Bar & Header ───────────────────────────────────────────────────

export function FormHeader({
  currentStep,
  totalSteps,
  onBack,
  canGoBack = true,
}: {
  currentStep: number
  totalSteps: number
  onBack: () => void
  canGoBack?: boolean
}) {
  const percentage = Math.round(((currentStep + 1) / totalSteps) * 100)

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-zinc-900 px-4 py-3">
      {/* Top Gold Progress Fill */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-900 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#C2470A] via-[#FF6A1A] to-[#FFA66B] transition-all duration-300 ease-out shadow-[0_0_12px_rgba(255, 106, 26,0.5)]"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="max-w-xl mx-auto flex items-center justify-between">
        {canGoBack && currentStep > 0 ? (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="size-4 text-[#FF6A1A]" /> BACK
          </button>
        ) : (
          <div className="w-12" />
        )}

        <span className="text-xs font-mono font-medium text-zinc-400 tracking-wider">
          <strong className="text-[#FF6A1A]">{currentStep + 1}</strong> of {totalSteps}
        </span>
      </div>
    </div>
  )
}

// ─── Resume Draft Banner ─────────────────────────────────────────────────────

export function ResumeDraftBanner({
  onResume,
  onReset,
}: {
  onResume: () => void
  onReset: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm rounded-2xl bg-[#141414] border border-[#FF6A1A]/40 p-6 space-y-4 shadow-2xl text-center">
        <div className="size-12 rounded-full bg-[#FF6A1A]/10 border border-[#FF6A1A]/30 flex items-center justify-center mx-auto text-[#FF6A1A]">
          <RefreshCw className="size-6 animate-spin-slow" />
        </div>
        <div>
          <h3 className="font-heading text-lg font-bold text-white">Continue Saved Progress?</h3>
          <p className="text-xs text-zinc-400 mt-1">
            We found a previously saved draft for this form.
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-3 rounded-xl bg-[#FF6A1A] text-xs font-bold uppercase tracking-wider text-white hover:bg-[#FF8540] transition-all shadow-lg shadow-[#FF6A1A]/10"
          >
            Resume Saved Draft
          </button>
          <button
            type="button"
            onClick={onReset}
            className="w-full py-2.5 rounded-xl border border-zinc-800 text-xs font-semibold text-zinc-400 hover:text-white transition-all"
          >
            Start Fresh
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Question Container ──────────────────────────────────────────────────────

export function QuestionWrapper({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="w-full max-w-xl mx-auto space-y-6 animate-fade-in">
      <div className="space-y-2 text-left">
        <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-white leading-tight tracking-wide">
          {title}
        </h2>
        {subtitle && <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">{subtitle}</p>}
      </div>
      <div className="pt-2">{children}</div>
    </div>
  )
}

// ─── Option Card Picker ──────────────────────────────────────────────────────

export type OptionCard = {
  value: string
  label: string
  subtitle?: string
  icon?: React.ReactNode
}

export function ImageCardPicker({
  options,
  selectedValue,
  onChange,
  columns = 2,
}: {
  options: OptionCard[]
  selectedValue: string
  onChange: (val: string) => void
  columns?: number
}) {
  return (
    <div
      className={`grid gap-3 ${
        columns === 1
          ? "grid-cols-1"
          : columns === 3
          ? "grid-cols-1 sm:grid-cols-3"
          : "grid-cols-1 sm:grid-cols-2"
      }`}
    >
      {options.map((opt) => {
        const isSelected = selectedValue === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-3.5 p-4 rounded-xl text-left border transition-all duration-200 ${
              isSelected
                ? "bg-[#FF6A1A]/15 border-[#FF6A1A] ring-1 ring-[#FF6A1A]/50 shadow-[0_0_15px_rgba(255, 106, 26,0.15)]"
                : "bg-[#141414] border-zinc-800 hover:border-zinc-700 hover:bg-[#1A1A1A]"
            }`}
          >
            {opt.icon && (
              <div
                className={`size-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                  isSelected ? "bg-[#FF6A1A] text-white" : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {opt.icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-semibold truncate ${isSelected ? "text-[#FF6A1A]" : "text-white"}`}>
                  {opt.label}
                </span>
                {isSelected && <Check className="size-4 text-[#FF6A1A] flex-shrink-0 ml-2" />}
              </div>
              {opt.subtitle && <p className="text-xs text-zinc-400 mt-0.5 truncate">{opt.subtitle}</p>}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ─── Chip Multi Select ────────────────────────────────────────────────────────

export function ChipMultiSelect({
  options,
  selectedValues,
  onChange,
}: {
  options: string[]
  selectedValues: string[]
  onChange: (vals: string[]) => void
}) {
  const toggle = (opt: string) => {
    if (opt.toLowerCase() === "none") {
      onChange(["None"])
      return
    }
    const filtered = selectedValues.filter((v) => v.toLowerCase() !== "none")
    if (filtered.includes(opt)) {
      onChange(filtered.filter((v) => v !== opt))
    } else {
      onChange([...filtered, opt])
    }
  }

  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((opt) => {
        const isSelected = selectedValues.includes(opt)
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`px-4 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all border ${
              isSelected
                ? "bg-[#FF6A1A] text-white border-[#FF6A1A] shadow-[0_0_12px_rgba(255, 106, 26,0.3)] scale-105"
                : "bg-[#141414] text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:bg-[#1A1A1A]"
            }`}
          >
            {isSelected && <span className="mr-1.5 font-bold">✓</span>}
            {opt}
          </button>
        )
      })}
    </div>
  )
}

// ─── Chip Single Select ──────────────────────────────────────────────────────

export function ChipSingleSelect({
  options,
  selectedValue,
  onChange,
}: {
  options: string[]
  selectedValue: string
  onChange: (val: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((opt) => {
        const isSelected = selectedValue === opt
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-4 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all border ${
              isSelected
                ? "bg-[#FF6A1A] text-white border-[#FF6A1A] shadow-[0_0_12px_rgba(255, 106, 26,0.3)] scale-105"
                : "bg-[#141414] text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:bg-[#1A1A1A]"
            }`}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

// ─── Gold Slider ─────────────────────────────────────────────────────────────

export function GoldSlider({
  value,
  onChange,
  min = 1,
  max = 10,
  step = 1,
  unit = "",
  labels,
}: {
  value: number
  onChange: (val: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  labels?: { min: string; max: string }
}) {
  return (
    <div className="space-y-6 bg-[#141414] p-6 rounded-2xl border border-zinc-800">
      <div className="text-center space-y-1">
        <span className="text-4xl font-extrabold text-[#FF6A1A] font-heading drop-shadow-[0_0_10px_rgba(255, 106, 26,0.4)]">
          {value}
          <span className="text-lg text-zinc-400 font-sans ml-1">{unit}</span>
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-3 rounded-lg appearance-none cursor-pointer bg-zinc-800 accent-[#FF6A1A]"
      />

      {labels && (
        <div className="flex justify-between text-xs font-medium text-zinc-500">
          <span>{labels.min}</span>
          <span>{labels.max}</span>
        </div>
      )}
    </div>
  )
}

// ─── Number Stepper ──────────────────────────────────────────────────────────

export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 300,
  step = 1,
  unit = "",
  placeholder = "0",
}: {
  value: string
  onChange: (val: string) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  placeholder?: string
}) {
  const numVal = parseFloat(value) || 0

  const handleIncrement = () => {
    const next = Math.min(max, numVal + step)
    onChange(next.toString())
  }

  const handleDecrement = () => {
    const prev = Math.max(min, numVal - step)
    onChange(prev.toString())
  }

  return (
    <div className="flex flex-col items-center gap-4 bg-[#141414] p-6 rounded-2xl border border-zinc-800">
      <div className="flex items-center justify-center gap-6 w-full">
        <button
          type="button"
          onClick={handleDecrement}
          className="size-14 rounded-2xl bg-zinc-900 border border-zinc-800 text-2xl font-bold text-zinc-300 hover:text-white hover:border-[#FF6A1A] active:scale-95 transition-all flex items-center justify-center"
        >
          -
        </button>

        <div className="flex items-baseline justify-center gap-1 min-w-[120px] text-center">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-28 text-center text-4xl font-extrabold text-white bg-transparent outline-none border-b border-zinc-700 focus:border-[#FF6A1A]"
          />
          {unit && <span className="text-sm font-semibold text-[#FF6A1A]">{unit}</span>}
        </div>

        <button
          type="button"
          onClick={handleIncrement}
          className="size-14 rounded-2xl bg-zinc-900 border border-zinc-800 text-2xl font-bold text-zinc-300 hover:text-white hover:border-[#FF6A1A] active:scale-95 transition-all flex items-center justify-center"
        >
          +
        </button>
      </div>
    </div>
  )
}

// ─── Dark Text Input ─────────────────────────────────────────────────────────

export function TextInputDark({
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  type?: string
  required?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full rounded-2xl bg-[#141414] border border-zinc-800 px-5 py-4 text-base text-white placeholder-zinc-600 outline-none focus:border-[#FF6A1A] focus:ring-2 focus:ring-[#FF6A1A]/20 transition-all"
    />
  )
}

// ─── Dark Text Area ──────────────────────────────────────────────────────────

export function TextAreaDark({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-2xl bg-[#141414] border border-zinc-800 px-5 py-4 text-base text-white placeholder-zinc-600 outline-none focus:border-[#FF6A1A] focus:ring-2 focus:ring-[#FF6A1A]/20 transition-all resize-none"
    />
  )
}

// ─── Photo Upload Screen Component ───────────────────────────────────────────

export function isPhotoPathValue(v: string): boolean {
  return v.startsWith("data:image") || /^[^/]+\/[^/]+\.(jpe?g|png|webp|gif|heic)$/i.test(v)
}

export function PhotoUploadScreen({
  label,
  subtitle,
  files,
  onFilesChange,
  multiple = false,
  userId,
}: {
  label: string
  subtitle?: string
  files: string[]
  onFilesChange: (files: string[]) => void
  multiple?: boolean
  userId?: string
}) {
  const [previews, setPreviews] = useState<Record<number, string>>({})
  const [uploadingCount, setUploadingCount] = useState(0)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = Array.from(e.target.files || [])
    if (!uploaded.length || !userId) return

    const startIdx = multiple ? files.length : 0
    const localPreviews: Record<number, string> = {}
    uploaded.forEach((file, i) => {
      localPreviews[startIdx + i] = URL.createObjectURL(file)
    })
    setPreviews((prev) => ({ ...prev, ...localPreviews }))
    setUploadingCount((c) => c + uploaded.length)

    try {
      const uploadedPaths = await Promise.all(
        uploaded.map(async (file) => {
          const fd = new FormData()
          fd.append("file", file)
          const res = await fetch("/api/checkin/upload-photo", { method: "POST", body: fd })
          if (!res.ok) return null
          const data = await res.json()
          return data.path as string
        })
      )
      const validPaths = uploadedPaths.filter((p): p is string => !!p)
      if (multiple) {
        onFilesChange([...files, ...validPaths])
      } else {
        onFilesChange(validPaths.slice(0, 1))
      }
    } finally {
      setUploadingCount((c) => Math.max(0, c - uploaded.length))
    }
  }

  return (
    <div className="space-y-4">
      <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-[#FF6A1A]/60 rounded-3xl cursor-pointer bg-[#141414] hover:bg-[#1A1A1A] hover:border-[#FF6A1A] transition-all group p-6">
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <div className="size-16 rounded-full bg-[#FF6A1A]/10 border border-[#FF6A1A]/30 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Camera className="size-8 text-[#FF6A1A]" />
          </div>
          <div>
            <p className="text-sm font-bold text-white uppercase tracking-wider">{label}</p>
            <p className="text-xs text-zinc-400 mt-1">
              {uploadingCount > 0 ? "Uploading…" : subtitle || "Tap to take photo or choose file"}
            </p>
          </div>
        </div>
        <input type="file" multiple={multiple} accept="image/*,application/pdf" onChange={handleUpload} className="hidden" />
      </label>

      {(files.length > 0 || Object.keys(previews).length > 0) && (
        <div className="grid grid-cols-2 gap-3 pt-2">
          {files.map((f, idx) => (
            <div
              key={idx}
              className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 aspect-square flex items-center justify-center p-2 group"
            >
              {previews[idx] || isPhotoPathValue(f) ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={previews[idx] || f} alt="preview" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <span className="text-xs text-zinc-400 font-mono">Document #{idx + 1}</span>
              )}
              <button
                type="button"
                onClick={() => onFilesChange(files.filter((_, i) => i !== idx))}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-red-500 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Fixed Navigation Footer ──────────────────────────────────────────────────

export function FormFooter({
  onNext,
  isLastStep = false,
  submitting = false,
  nextDisabled = false,
  onSkip,
  showSkip = false,
}: {
  onNext: () => void
  isLastStep?: boolean
  submitting?: boolean
  nextDisabled?: boolean
  onSkip?: () => void
  showSkip?: boolean
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-md border-t border-zinc-900 px-4 py-3">
      <div className="max-w-xl mx-auto flex items-center gap-3">
        {showSkip && onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="px-4 py-3.5 rounded-xl border border-zinc-800 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-all"
          >
            Skip
          </button>
        )}

        <button
          type="button"
          onClick={onNext}
          disabled={submitting || nextDisabled}
          className="flex-1 py-4 rounded-2xl bg-[#FF6A1A] text-sm font-bold uppercase tracking-wider text-white hover:bg-[#FF8540] shadow-lg shadow-[#FF6A1A]/20 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? (
            "SUBMITTING..."
          ) : isLastStep ? (
            <>
              SUBMIT FORM <Check className="size-4 stroke-[3]" />
            </>
          ) : (
            <>
              NEXT <ChevronRight className="size-4 stroke-[3]" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
