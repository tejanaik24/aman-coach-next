"use client";

import {
  Dumbbell,
  Home,
  MoreHorizontal,
  TrendingUp,
  Utensils,
} from "lucide-react";
import { motion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { useLang, type TKey } from "@/lib/i18n";

const tabs = [
  { href: "/home", label: "navHome" as TKey, icon: Home },
  { href: "/workout", label: "navWorkout" as TKey, icon: Dumbbell },
  { href: "/diet", label: "navDiet" as TKey, icon: Utensils },
  { href: "/progress", label: "navProgress" as TKey, icon: TrendingUp },
  { href: "/checkin", label: "navCheckin" as TKey, icon: MoreHorizontal },
];

export default function ClientBottomNav() {
  const { t } = useLang();
  const pathname = usePathname();
  const router = useRouter();

  const handleTabClick = (href: string) => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(12);
      } catch {}
    }
    router.push(href);
  };

  return (
    <nav className="fixed bottom-4 left-4 right-4 max-w-[398px] mx-auto bg-[#0E0E11]/92 backdrop-blur-2xl border border-white/10 rounded-full p-1.5 flex justify-between items-center shadow-[0_12px_40px_rgba(0,0,0,0.8),0_0_20px_rgba(255,184,0,0.06)] z-50 select-none">
      {tabs.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + "/");
        return (
          <button
            key={href}
            onClick={() => handleTabClick(href)}
            className="flex-1 relative flex flex-col items-center justify-center py-2 text-xs font-semibold focus:outline-none cursor-pointer"
          >
            {isActive && (
              <motion.div
                layoutId="client-active-pill"
                className="absolute inset-0 bg-[#FFB800]/12 border border-[#FFB800]/30 rounded-full shadow-[0_0_15px_rgba(255,184,0,0.15)]"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            )}
            <span
              className={`relative z-10 flex flex-col items-center gap-1 transition-colors duration-200 ${
                isActive
                  ? "text-[#FFB800]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Icon className="w-5 h-5 transition-transform duration-200" />
              <span className="text-xs tracking-tight font-medium">
                {t(label)}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
