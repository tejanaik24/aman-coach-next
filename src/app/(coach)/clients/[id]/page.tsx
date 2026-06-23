"use client"

import { useParams } from "next/navigation"

export default function ClientDetailPage() {
  const params = useParams()
  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold text-white" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
        Client Profile
      </h1>
      <p className="text-[#A0A0A0]">Client ID: {params.id}</p>
      <p className="text-[#A0A0A0] text-sm">Full profile and management coming in Session 2</p>
    </div>
  )
}
