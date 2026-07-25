"use client";

import { useRef, useEffect } from "react";

interface KineticTextProps {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  fontSize?: number;
}

export default function KineticText({
  text,
  className = "",
  delay = 0,
  stagger = 0.03,
  fontSize = 48,
}: KineticTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const spans = el.querySelectorAll("span");

    spans.forEach((span, i) => {
      span.style.opacity = "0";
      span.style.transform = "translateY(40px) rotateX(-90deg)";
      span.style.transition = `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay + i * stagger}s`;
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            spans.forEach((span) => {
              span.style.opacity = "1";
              span.style.transform = "translateY(0) rotateX(0deg)";
            });
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, stagger]);

  return (
    <div
      ref={containerRef}
      className={`flex flex-wrap ${className}`}
      style={{ fontSize: `${fontSize}px`, lineHeight: 1.1 }}
    >
      {text.split("").map((char, i) => (
        <span
          key={i}
          className="inline-block"
          style={{
            display: char === " " ? "inline" : "inline-block",
            width: char === " " ? "0.3em" : "auto",
            transformOrigin: "bottom center",
          }}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </div>
  );
}
