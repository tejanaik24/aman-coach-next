"use client"

import Link from "next/link"
import { PublicLayout } from "@/components/layout/PublicLayout"

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
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold mb-2">
            / services
          </p>
          <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl text-white leading-none mb-12">
            OUR PROGRAMS
          </h1>
          <div className="grid gap-6 md:grid-cols-2">
            {programs.map((p) => (
              <div
                key={p.title}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-6 transition-colors hover:border-gold/30"
              >
                <p className="font-heading text-2xl text-gold mb-2">{p.title}</p>
                <p className="text-sm text-white/50 mb-4">{p.desc}</p>
                <ul className="space-y-1.5 mb-4">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-white/40">
                      <span className="text-gold">▸</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <p className="font-heading text-lg text-white">{p.price}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/contact"
              className="inline-block rounded-lg bg-gold px-8 py-3 text-base font-semibold text-black"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
