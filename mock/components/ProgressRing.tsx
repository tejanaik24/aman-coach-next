"use client";

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  delay?: number;
  color?: string;
}

export default function ProgressRing({
  progress,
  size = 60,
  strokeWidth = 4,
  className = "",
  delay = 0,
  color = "#FFB800",
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className={`-rotate-90 ${className}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{
          transition: `stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
          filter: `drop-shadow(0 0 6px ${color}40)`,
        }}
      />
    </svg>
  );
}
