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
  category: string;
  days: string;
  amount: number;
  image: string;
  tag?: string;
  popular?: boolean;
  cta?: string;
  href?: string;
}

const PACKAGES: PackageItem[] = [
  {
    name: "On Call Consultation — One time on call consult",
    category: "Online Coaching",
    days: "1 Day",
    amount: 1500,
    cta: "Book Now",
    href: "/book",
    image: "/images/aman-on-call-consultation.webp",
  },
  {
    name: "Complete Online Coaching — Any Lifestyle Goals (1 Year)",
    category: "Online Coaching",
    days: "365 Days",
    amount: 50000,
    image: "/images/aman-online-coaching-1yr.webp",
    popular: true,
    tag: "Best Value",
  },
  {
    name: "Complete Online Coaching — Any Lifestyle Goals (24 Weeks)",
    category: "Online Coaching",
    days: "168 Days",
    amount: 28000,
    image: "/images/aman-online-coaching-24wk.webp",
    popular: true,
    tag: "Most Popular",
  },
  {
    name: "Complete Online Coaching — Any Lifestyle Goals (12 Weeks)",
    category: "Online Coaching",
    days: "84 Days",
    amount: 15000,
    image: "/images/aman-online-coaching-12wk.webp",
  },
  {
    name: "Bodybuilding Contest Prep (24 Weeks)",
    category: "Contest Prep",
    days: "168 Days",
    amount: 45000,
    image: "/images/aman-contest-prep.webp",
    tag: "Championship Tier",
  },
  {
    name: "Bodybuilding Contest Prep (12 Weeks)",
    category: "Contest Prep",
    days: "84 Days",
    amount: 25000,
    image: "/images/aman-contest-prep-12wk-detail.webp",
  },
  {
    name: "Only Nutrition / Diet Consultancy (24 Weeks)",
    category: "Nutrition Only",
    days: "168 Days",
    amount: 17999,
    image: "/images/aman-nutrition-coaching.webp",
    tag: "Full Lifestyle Shift",
  },
  {
    name: "Only Nutrition / Diet Consultancy (12 Weeks)",
    category: "Nutrition Only",
    days: "84 Days",
    amount: 9999,
    image: "/images/aman-nutrition-coaching-12wk.webp",
  },
  {
    name: "Child Nutrition (1 Month Consult)",
    category: "Nutrition Only",
    days: "30 Days",
    amount: 6000,
    image: "/images/aman-child-nutrition.webp",
  },
  {
    name: "Child Nutrition (One Time Consult)",
    category: "Nutrition Only",
    days: "3 Days",
    amount: 2000,
    image: "/images/aman-child-nutrition-onetime.webp",
  },
  {
    name: "POSTPARTUM Care — Training & Nutrition (24 Weeks)",
    category: "Postpartum & Antenatal",
    days: "168 Days",
    amount: 29000,
    image: "/images/aman-postpartum-24wk.webp",
    tag: "Full Recovery",
  },
  {
    name: "POSTPARTUM Care — Training & Nutrition (12 Weeks)",
    category: "Postpartum & Antenatal",
    days: "84 Days",
    amount: 16000,
    image: "/images/aman-postpartum-12wk.webp",
  },
  {
    name: "Online Antenatal — Postnatal Complete Care (2nd - 4th Trimester)",
    category: "Postpartum & Antenatal",
    days: "280 Days",
    amount: 35000,
    image: "/images/aman-antenatal-detail.webp",
  },
  {
    name: "Bodybuilding Posing Coaching (8 Virtual Sessions)",
    category: "Posing & Camp",
    days: "60 Days",
    amount: 9000,
    image: "/images/aman-posing-coaching.webp",
    tag: "Stage Ready",
  },
  {
    name: "Bodybuilding Posing Coaching (4 Virtual Sessions)",
    category: "Posing & Camp",
    days: "30 Days",
    amount: 5000,
    image: "/images/aman-posing-coaching-4.webp",
  },
  {
    name: 'Offline "Exercise Training Execution Camp" (3-5 Days)',
    category: "Posing & Camp",
    days: "30 Days",
    amount: 12000,
    image: "/images/aman-training-camp.webp",
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
                  <img
                    src={pkg.image}
                    alt={pkg.name}
                    className="w-16 h-16 rounded-xl object-cover shrink-0 border border-white/10 shadow-md"
                  />
                  <div className="min-w-0">
                    <p className="text-white text-sm font-bold font-heading leading-tight truncate sm:whitespace-normal">
                      {pkg.name}
                    </p>
                    <p className="text-zinc-400 text-xs mt-1.5 flex items-center gap-2">
                      <span>Duration: {pkg.days}</span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-[#FFB800] font-bold font-mono text-sm">
                        ₹{pkg.amount.toLocaleString("en-IN")}
                      </span>
                    </p>
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
