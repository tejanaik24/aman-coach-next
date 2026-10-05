import { AuthProvider } from "@/contexts/AuthContext";
import type { Metadata, Viewport } from "next";
import { Dancing_Script, Inter, Space_Grotesk } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dancingScript = Dancing_Script({
  variable: "--font-script",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "Aman Khurana Fitness — Premium 1-on-1 Coaching",
  description:
    "Elite fitness coaching platform by Aman Khurana. Track workouts, nutrition, and progress.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Aman Khurana",
  },
};

export const viewport: Viewport = {
  themeColor: "#FF6A1A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { DevAnnotations } from "@/components/shared/DevAnnotations";
import PwaInstallPrompt from "@/components/shared/PwaInstallPrompt";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${dancingScript.variable} dark`}
      suppressHydrationWarning
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="application-name" content="Aman Khurana Fitness" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-screen bg-bg-primary text-text-primary font-sans antialiased">
        <AuthProvider>
          <div className="mx-auto max-w-[430px] min-h-screen bg-bg-primary relative">
            {children}
          </div>
          <PwaInstallPrompt />
          <DevAnnotations />
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "#111111",
                color: "#fff",
                border: "1px solid #1A1A1A",
                borderRadius: "12px",
              },
              success: {
                iconTheme: { primary: "#FF6A1A", secondary: "#0A0A0A" },
              },
              error: {
                iconTheme: { primary: "#F87171", secondary: "#0A0A0A" },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
