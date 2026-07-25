"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Dumbbell, User, BarChart3 } from "lucide-react";
import MagneticButton from "./MagneticButton";

const navItems = [
  { href: "/client", icon: Home, label: "Home" },
  { href: "/client#workouts", icon: Dumbbell, label: "Workouts" },
  { href: "/client#progress", icon: BarChart3, label: "Progress" },
  { href: "/client#profile", icon: User, label: "Profile" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-6 px-4">
      <div className="glass-strong rounded-2xl px-6 py-3 flex items-center gap-6">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <MagneticButton key={item.href} strength={0.2}>
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-1 transition-colors duration-300 ${
                  active ? "text-[#FFB800]" : "text-[#999999] hover:text-[#FFFFFF]"
                }`}
              >
                <item.icon size={22} strokeWidth={active ? 2.5 : 1.5} />
                <span className="text-[10px] font-medium">{item.label}</span>
                {active && (
                  <div className="w-1 h-1 rounded-full bg-[#FFB800] mt-0.5 gold-glow" />
                )}
              </Link>
            </MagneticButton>
          );
        })}
      </div>
    </div>
  );
}
