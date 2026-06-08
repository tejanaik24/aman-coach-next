"use client"

import Link from "next/link"
import { PublicLayout } from "@/components/layout/PublicLayout"

export default function AboutPage() {
  return (
    <PublicLayout>
      <section className="px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold mb-2">
            / about
          </p>
          <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl text-white leading-none mb-8">
            MEET AMAN
            <br />
            <span className="text-gold">KHURANA</span>
          </h1>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-4 text-white/60 text-sm leading-relaxed">
              <p>
                With over a decade of experience in the fitness industry, Aman Khurana has helped
                hundreds of clients transform their bodies and lives through evidence-based coaching
                and unwavering support.
              </p>
              <p>
                Specializing in contest preparation, fat loss, muscle building, and antenatal &
                postnatal training, Aman combines the latest sports science with practical,
                sustainable approaches that fit your lifestyle.
              </p>
              <p>
                His philosophy is simple: no gimmicks, no shortcuts — just consistent, intelligent
                training and nutrition tailored to your unique needs.
              </p>
            </div>
            <div className="space-y-4">
              {[
                { label: "Experience", value: "10+ Years" },
                { label: "Clients Trained", value: "500+" },
                { label: "Specializations", value: "4+ Programs" },
                { label: "Location", value: "Vizag, India" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3"
                >
                  <span className="text-sm text-white/40">{item.label}</span>
                  <span className="text-sm font-medium text-gold">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="border-t border-white/5 px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-heading text-3xl sm:text-4xl text-white mb-6">MY PHILOSOPHY</h2>
          <p className="text-sm text-white/50 leading-relaxed max-w-2xl mx-auto">
            Fitness is not about perfection — it is about progress. Every small step, every
            consistent day, every choice to show up builds the person you are becoming. I am here
            to guide, support, and push you toward the best version of yourself.
          </p>
          <div className="mt-8">
            <Link
              href="/contact"
              className="inline-block rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-black"
            >
              Work With Me
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
