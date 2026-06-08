"use client"

import Link from "next/link"
import { PublicLayout } from "@/components/layout/PublicLayout"

const transformations = [
  { name: "Client A", program: "Contest Prep", result: "-12 kg in 16 weeks" },
  { name: "Client B", program: "Fat Loss", result: "-8 kg in 12 weeks" },
  { name: "Client C", program: "Muscle Building", result: "+5 kg lean mass in 20 weeks" },
  { name: "Client D", program: "Postnatal", result: "Core strength restored in 10 weeks" },
]

export default function TransformationsPage() {
  return (
    <PublicLayout>
      <section className="px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold mb-2">
            / transformations
          </p>
          <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl text-white leading-none mb-4">
            REAL RESULTS
          </h1>
          <p className="text-sm text-white/50 mb-12">
            Every transformation is a story of dedication, consistency, and the right guidance.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {transformations.map((t, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-6"
              >
                <div className="mb-4 aspect-[4/3] rounded-lg bg-white/5 flex items-center justify-center">
                  <span className="text-4xl text-white/10">📷</span>
                </div>
                <p className="font-heading text-xl text-gold">{t.name}</p>
                <p className="text-xs text-white/30 mt-1">{t.program}</p>
                <p className="text-sm text-white/60 mt-2">{t.result}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <p className="text-sm text-white/40 mb-4">
              Want results like these? Start your journey today.
            </p>
            <Link
              href="/contact"
              className="inline-block rounded-lg bg-gold px-8 py-3 text-base font-semibold text-black"
            >
              Start Your Transformation
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
