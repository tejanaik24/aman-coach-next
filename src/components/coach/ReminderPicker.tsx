"use client"

import { format } from "date-fns"

export const inWeeks = (w: number) => format(new Date(Date.now() + w * 7 * 86400000), "yyyy-MM-dd")

// Aman picks the exact date he wants to be reminded to update this plan ("" = no reminder)
export function ReminderPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="text-text-muted text-xs font-semibold mb-2">Remind me (only you) to update on</p>
      <div className="flex gap-2">
        <input
          type="date"
          value={value}
          min={format(new Date(), "yyyy-MM-dd")}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 h-12 rounded-xl bg-[#1A1A1A] border border-[#333333] px-3 text-white text-base outline-none focus:border-[#C9A84C] [color-scheme:dark]"
        />
        <button
          type="button"
          onClick={() => onChange("")}
          className={`h-12 px-3.5 rounded-xl text-xs font-bold cursor-pointer ${value ? "bg-white/10 text-white" : "bg-accent-orange text-black"}`}
        >
          No reminder
        </button>
      </div>
    </div>
  )
}
