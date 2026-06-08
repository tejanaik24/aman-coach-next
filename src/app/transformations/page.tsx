"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { PublicLayout } from "@/components/layout/PublicLayout"
import { ImageWithFallback } from "@/components/ui/ImageWithFallback"
import { ArrowRight } from "lucide-react"

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
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-light mb-2">
            / transformations
          </p>
          <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl text-white leading-none mb-4">
            REAL RESULTS
          </h1>
          <p className="text-sm text-zinc-400 mb-12">
            Every transformation is a story of dedication, consistency, and the right guidance.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {transformations.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6"
              >
                <div className="mb-4 aspect-[4/3] rounded-xl bg-zinc-900 overflow-hidden flex items-center justify-center border border-zinc-800">
                  <ImageWithFallback
                    src=""
                    alt={`${t.name} transformation`}
                    className="size-full"
                  />
                </div>
                <p className="font-heading text-xl text-purple-light">{t.name}</p>
                <p className="text-xs text-zinc-500 mt-1">{t.program}</p>
                <p className="text-sm text-zinc-300 mt-2">{t.result}</p>
              </motion.div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <p className="text-sm text-zinc-500 mb-4">
              Want results like these? Start your journey today.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full bg-purple px-8 py-3 text-sm font-bold uppercase tracking-wider text-white hover:bg-purple-dark transition-all"
            >
              Start Your Transformation <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
