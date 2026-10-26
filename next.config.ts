import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Plan PDFs are built on the server (api/coach/plans/pdf). react-pdf loads pdfkit's built-in font
  // files at run time, so keep it unbundled and ship those files with the function.
  serverExternalPackages: ["@react-pdf/renderer", "pdfkit"],
  outputFileTracingIncludes: {
    "/api/coach/plans/pdf": ["./node_modules/pdfkit/js/**/*"],
  },
  async headers() {
    const isDev = process.env.NODE_ENV === "development";
    return [{
      source: "/:path*",
      headers: [
        {
          key: "Content-Security-Policy",
          value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""} https://checkout.razorpay.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co https://coach-api.nifsindia.net https://api.razorpay.com${isDev ? " http://localhost:* ws://localhost:*" : ""}; frame-src https://checkout.razorpay.com; frame-ancestors 'self'; base-uri 'self'; form-action 'self'`,
        },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
      ],
    }]
  },
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
