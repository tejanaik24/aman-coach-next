"use client"

import { ClipboardCheck } from "lucide-react"

export default function ClientCheckinPage() {
  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold text-white" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
        Weekly Check-in
      </h1>
      <div className="bg-[#161616] border border-[#222222] rounded-2xl p-8 text-center space-y-3">
        <div className="size-12 rounded-full bg-[#C9A84C]/10 flex items-center justify-center mx-auto">
          <ClipboardCheck className="size-6 text-[#C9A84C]" />
        </div>
        <p className="text-white font-semibold">Check-in form coming soon</p>
        <p className="text-sm text-[#A0A0A0]">Session 2 will include the full check-in flow</p>
      </div>
    </div>
  )
}
