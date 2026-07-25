"use client";

import { useRef, useEffect } from "react";

export default function GradientMesh() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const colors = [
      { r: 255, g: 184, b: 0 },
      { r: 204, g: 147, b: 0 },
      { r: 10, g: 10, b: 10 },
      { r: 30, g: 20, b: 5 },
    ];

    const blobs = colors.map((c, i) => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 200 + Math.random() * 200,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      color: c,
      phase: i * 1.5,
    }));

    const animate = () => {
      time += 0.005;
      ctx.fillStyle = "#0A0A0A";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      blobs.forEach((blob) => {
        blob.x += blob.vx + Math.sin(time + blob.phase) * 0.3;
        blob.y += blob.vy + Math.cos(time + blob.phase) * 0.3;

        if (blob.x < -blob.r) blob.x = canvas.width + blob.r;
        if (blob.x > canvas.width + blob.r) blob.x = -blob.r;
        if (blob.y < -blob.r) blob.y = canvas.height + blob.r;
        if (blob.y > canvas.height + blob.r) blob.y = -blob.r;

        const gradient = ctx.createRadialGradient(
          blob.x,
          blob.y,
          0,
          blob.x,
          blob.y,
          blob.r
        );
        gradient.addColorStop(0, `rgba(${blob.color.r}, ${blob.color.g}, ${blob.color.b}, 0.15)`);
        gradient.addColorStop(1, "rgba(10, 10, 10, 0)");

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });

      animId = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
