"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { PublicLayout } from "@/components/layout/PublicLayout"
import { ArrowRight } from "lucide-react"

export default function AboutPage() {
  return (
    <PublicLayout>
      <section className="px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-light mb-2">
            / about
          </p>
          <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl text-white leading-none mb-8">
            MEET AMAN
            <br />
            <span className="text-purple">KHURANA</span>
          </h1>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-8 md:grid-cols-2"
          >
            <div className="space-y-4 text-zinc-400 text-sm leading-relaxed">
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
            <div className="space-y-3">
              {[
                { label: "Experience", value: "10+ Years" },
                { label: "Clients Trained", value: "500+" },
                { label: "Specializations", value: "4+ Programs" },
                { label: "Location", value: "Vizag, India" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3"
                >
                  <span className="text-sm text-zinc-500">{item.label}</span>
                  <span className="text-sm font-medium text-purple-light">{item.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
      <section className="border-t border-zinc-800 px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-heading text-3xl sm:text-4xl text-white mb-6">MY PHILOSOPHY</h2>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl mx-auto">
            Fitness is not about perfection — it is about progress. Every small step, every
            consistent day, every choice to show up builds the person you are becoming. I am here
            to guide, support, and push you toward the best version of yourself.
          </p>
          <div className="mt-8">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full bg-purple px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-purple-dark transition-all"
            >
              Work With Me <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
