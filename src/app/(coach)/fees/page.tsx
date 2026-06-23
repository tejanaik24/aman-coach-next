"use client"

import { IndianRupee } from "lucide-react"

export default function FeesPage() {
  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold text-white" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
        Fees
      </h1>
      <div className="bg-[#161616] border border-[#222222] rounded-2xl p-8 text-center space-y-3">
        <div className="size-12 rounded-full bg-[#C9A84C]/10 flex items-center justify-center mx-auto">
          <IndianRupee className="size-6 text-[#C9A84C]" />
        </div>
        <p className="text-white font-semibold">No fees recorded</p>
        <p className="text-sm text-[#A0A0A0]">Fee tracking coming in a future session</p>
      </div>
    </div>
  )
}
