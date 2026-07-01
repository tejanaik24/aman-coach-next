import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    unoptimized: true,
  },
  async rewrites() {
    return {
      // beforeFiles runs BEFORE app router pages — required for / to serve index.html
      beforeFiles: [
        { source: "/", destination: "/index.html" },
        { source: "/about", destination: "/about.html" },
        { source: "/services", destination: "/services.html" },
        { source: "/transformations", destination: "/transformations.html" },
        { source: "/ebooks", destination: "/ebooks.html" },
        { source: "/contact", destination: "/contact.html" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
