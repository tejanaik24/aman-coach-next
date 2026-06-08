"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { PublicLayout } from "@/components/layout/PublicLayout"
import { ArrowRight } from "lucide-react"

const programs = [
  {
    title: "CONTEST PREP",
    desc: "Comprehensive competition preparation including peak week protocols, stage presentation, and nutrient timing for show day.",
    features: ["Customized contest diet", "Peak week protocols", "Posing practice", "Supplement guidance"],
    price: "₹15,000/month",
  },
  {
    title: "FAT LOSS",
    desc: "Sustainable fat loss programs designed to help you shed stubborn body fat while preserving muscle mass and metabolic health.",
    features: ["Calorie-cycled nutrition", "Metabolic conditioning", "Weekly progress tracking", "Lifestyle integration"],
    price: "₹8,000/month",
  },
  {
    title: "MUSCLE BUILDING",
    desc: "Science-based muscle building protocols with progressive overload, periodization, and optimized recovery strategies.",
    features: ["Periodized training", "Progressive overload", "Recovery protocols", "Supplement planning"],
    price: "₹8,000/month",
  },
  {
    title: "ANTENATAL & POSTNATAL",
    desc: "Safe and effective training programs for expecting and new mothers, focusing on strength, mobility, and postnatal recovery.",
    features: ["Prenatal-safe exercises", "Postnatal recovery", "Pelvic floor focus", "Diastasis recti repair"],
    price: "₹10,000/month",
  },
]

export default function ServicesPage() {
  return (
    <PublicLayout>
      <section className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-light mb-2">
            / services
          </p>
          <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl text-white leading-none mb-12">
            OUR PROGRAMS
          </h1>
          <div className="grid gap-6 md:grid-cols-2">
            {programs.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 transition-colors hover:border-purple/30"
              >
                <p className="font-heading text-2xl text-purple-light mb-2">{p.title}</p>
                <p className="text-sm text-zinc-400 mb-4">{p.desc}</p>
                <ul className="space-y-1.5 mb-4">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-zinc-500">
                      <span className="text-purple">▸</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <p className="font-heading text-lg text-white">{p.price}</p>
              </motion.div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full bg-purple px-8 py-3 text-sm font-bold uppercase tracking-wider text-white hover:bg-purple-dark transition-all"
            >
              Get Started <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
