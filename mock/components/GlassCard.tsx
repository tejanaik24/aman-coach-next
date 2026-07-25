"use client";

import { useRef, useEffect, ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "strong" | "gold";
  tilt?: boolean;
  delay?: number;
}

export default function GlassCard({
  children,
  className = "",
  variant = "default",
  tilt = false,
  delay = 0,
}: GlassCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tilt || !cardRef.current) return;
    const card = cardRef.current;

    const handleMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -8;
      const rotateY = ((x - centerX) / centerX) * 8;
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    };

    const handleLeave = () => {
      card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)";
    };

    card.addEventListener("mousemove", handleMove);
    card.addEventListener("mouseleave", handleLeave);
    return () => {
      card.removeEventListener("mousemove", handleMove);
      card.removeEventListener("mouseleave", handleLeave);
    };
  }, [tilt]);

  const base =
    variant === "gold"
      ? "glass-gold"
      : variant === "strong"
      ? "glass-strong"
      : "glass";

  return (
    <div
      ref={cardRef}
      className={`${base} rounded-2xl transition-transform duration-300 ease-out ${className}`}
      style={{
        opacity: 0,
        transform: "translateY(30px)",
        animation: `revealUp 0.6s ease-out ${delay}s forwards`,
      }}
    >
      {children}
    </div>
  );
}
