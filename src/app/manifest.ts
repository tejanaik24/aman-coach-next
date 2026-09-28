import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aman Khurana Fitness Coaching",
    short_name: "Aman Khurana",
    description: "Premium coaching by Aman Khurana",
    start_url: "/login",
    display: "standalone",
    background_color: "#0A0A0A",
    theme_color: "#C9A84C",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable" as any,
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable" as any,
      },
    ],
  };
}
