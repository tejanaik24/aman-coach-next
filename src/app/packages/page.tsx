"use client";

import { PublicPageShell } from "@/components/shared/PublicPageShell";
import { ArrowRight, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";

const CATEGORIES = [
  "All",
  "Online Coaching",
  "Contest Prep",
  "Nutrition Only",
  "Postpartum & Antenatal",
  "Posing & Camp",
];

interface PackageItem {
  name: string;
  image?: string;
  shortLabel?: string;
  category: string;
  tag?: string;
  popular?: boolean;
  cta?: string;
  href?: string;
}

const PACKAGES: PackageItem[] = [
  {
    name: "On Call Consultation — One time on call consult",
    image: "/images/aman-on-call-consultation.webp",
    category: "Online Coaching",
    cta: "Book Now",
    href: "/book",
  },
  {
    name: "Complete Online Coaching — Any Lifestyle Goals (1 Year)",
    shortLabel: "1 YEAR",
    category: "Online Coaching",
    popular: true,
    tag: "Best Value",
  },
  {
    name: "Complete Online Coaching — Any Lifestyle Goals (24 Weeks)",
    shortLabel: "24 WEEKS",
    category: "Online Coaching",
    popular: true,
    tag: "Most Popular",
  },
  {
    name: "Complete Online Coaching — Any Lifestyle Goals (12 Weeks)",
    shortLabel: "12 WEEKS",
    category: "Online Coaching",
  },
  {
    name: "Bodybuilding Contest Prep (24 Weeks)",
    image: "/images/aman-contest-prep-2.webp",
    category: "Contest Prep",
    tag: "Championship Tier",
  },
  {
    name: "Bodybuilding Contest Prep (12 Weeks)",
    image: "/images/aman-contest-prep-2.webp",
    category: "Contest Prep",
  },
  {
    name: "Only Nutrition / Diet Consultancy (24 Weeks)",
    image: "/images/aman-nutrition-coaching.webp",
    category: "Nutrition Only",
    tag: "Full Lifestyle Shift",
  },
  {
    name: "Only Nutrition / Diet Consultancy (12 Weeks)",
    image: "/images/aman-nutrition-coaching.webp",
    category: "Nutrition Only",
  },
  {
    name: "Child Nutrition (1 Month Consult)",
    image: "/images/aman-child-nutrition.webp",
    category: "Nutrition Only",
  },
  {
    name: "Child Nutrition (One Time Consult)",
    image: "/images/aman-child-nutrition.webp",
    category: "Nutrition Only",
  },
  {
    name: "POSTPARTUM Care — Training & Nutrition (24 Weeks)",
    image: "/images/aman-postpartum-24wk.webp",
    category: "Postpartum & Antenatal",
    tag: "Full Recovery",
  },
  {
    name: "POSTPARTUM Care — Training & Nutrition (12 Weeks)",
    image: "/images/aman-postpartum-24wk.webp",
    category: "Postpartum & Antenatal",
  },
  {
    name: "Online Antenatal — Postnatal Complete Care (2nd - 4th Trimester)",
    image: "/images/aman-antenatal-detail.webp",
    category: "Postpartum & Antenatal",
  },
  {
    name: "Bodybuilding Posing Coaching (8 Virtual Sessions)",
    shortLabel: "POSING 8X",
    category: "Posing & Camp",
    tag: "Stage Ready",
  },
  {
    name: "Bodybuilding Posing Coaching (4 Virtual Sessions)",
    shortLabel: "POSING 4X",
    category: "Posing & Camp",
  },
  {
    name: 'Offline "Exercise Training Execution Camp" (3-5 Days)',
    shortLabel: "CAMP 3-5D",
    category: "Posing & Camp",
    tag: "Hands-on Intense",
  },
];

export default function PackagesPage() {
  const [selectedCat, setSelectedCat] = useState("All");

  const filtered =
    selectedCat === "All"
      ? PACKAGES
      : PACKAGES.filter((p) => p.category === selectedCat);

  return (
    <PublicPageShell
      eyebrow="Aman Khurana Fitness"
      title="Coaching Packages"
      bg="ghost-plans.jpg"
    >
      <div className="space-y-6">
        {/* Goal Category Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCat === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCat(cat)}
                className={`relative px-3.5 py-1.5 rounded-full text-xs font-heading font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#FFB800] text-black shadow-[0_0_20px_rgba(255,184,0,0.3)]"
                    : "bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Packages List */}
        <div className="space-y-3.5">
          <AnimatePresence mode="popLayout">
            {filtered.map((pkg) => (
              <motion.div
                key={pkg.name}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                className={`relative p-4 rounded-2xl border transition-all ${
                  pkg.popular
                    ? "bg-[#141210] border-[#FFB800]/50 shadow-[0_12px_35px_rgba(255,184,0,0.12)]"
                    : "bg-[#101014]/90 border-white/10 hover:border-white/20"
                } flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
              >
                {pkg.tag && (
                  <span className="absolute -top-2.5 right-4 bg-[#FFB800] text-black text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                    <Sparkles className="size-2.5 fill-black" />
                    {pkg.tag}
                  </span>
                )}

                <div className="flex items-center gap-3.5 min-w-0">
                  {pkg.image ? (
                    <img
                      src={pkg.image}
                      alt={pkg.name}
                      className="w-16 h-16 rounded-xl object-cover border border-white/10 shrink-0 shadow-md"
                    />
                  ) : (
                    /* TODO real photo from Aman */
                    <div className="w-16 h-16 rounded-xl bg-[#0a0a0a] border border-[#FFB800]/30 shrink-0 shadow-md flex flex-col items-center justify-center px-1.5 text-center">
                      <span className="text-[8px] font-heading font-bold tracking-[0.18em] text-[#FFB800]/60 uppercase leading-none">
                        AKF
                      </span>
                      <span className="text-[10px] font-heading font-black tracking-wider text-[#FFB800] uppercase leading-tight mt-1">
                        {pkg.shortLabel}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-white text-sm font-bold font-heading leading-tight truncate sm:whitespace-normal">
                      {pkg.name}
                    </p>
                    <p className="text-zinc-400 text-xs mt-1.5">{pkg.category}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Link
                    href={
                      pkg.href ||
                      `/enquiry?interest=${encodeURIComponent(pkg.name)}`
                    }
                    className={`inline-flex items-center gap-1.5 text-xs font-heading font-bold px-4 py-2 rounded-full transition-all cursor-pointer ${
                      pkg.popular
                        ? "bg-[#FFB800] hover:bg-[#FFC82C] text-black shadow-[0_0_15px_rgba(255,184,0,0.3)]"
                        : "bg-white/10 hover:bg-white/15 border border-white/10 text-white"
                    }`}
                  >
                    <span>{pkg.cta || "Enquire"}</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </PublicPageShell>
  );
}
