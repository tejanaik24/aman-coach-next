import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AK Fitness Coach",
    short_name: "AK Coach",
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
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
