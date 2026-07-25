"use client";

import { ReactNode } from "react";

interface ParallaxLayerProps {
  children: ReactNode;
  className?: string;
  speed?: number;
}

export default function ParallaxLayer({
  children,
  className = "",
  speed = 0.5,
}: ParallaxLayerProps) {
  return (
    <div
      className={className}
      style={{
        transform: `translateZ(${speed * -100}px) scale(${1 + speed * 0.1})`,
        transformStyle: "preserve-3d",
      }}
    >
      {children}
    </div>
  );
}
