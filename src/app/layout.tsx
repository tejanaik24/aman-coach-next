import type { Metadata, Viewport } from "next"
import { Bebas_Neue, Barlow } from "next/font/google"
import { AuthProvider } from "@/contexts/AuthContext"
import { Toaster } from "react-hot-toast"
import "./globals.css"

const bebasNeue = Bebas_Neue({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: "400",
})

const barlow = Barlow({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "Aman Khurana Fitness | Transform Your Body, Transform Your Life",
  description:
    "Expert online fitness coaching by Aman Khurana. Contest prep, fat loss, muscle building, and antenatal & postnatal training programs.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${bebasNeue.variable} ${barlow.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="application-name" content="AK Fitness" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
      </head>
      <body className="min-h-full bg-black text-white font-body">
        <AuthProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "#1a1a1a",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.1)",
              },
              success: { iconTheme: { primary: "#FFB800", secondary: "#000" } },
              error: { iconTheme: { primary: "#E8501A", secondary: "#fff" } },
            }}
          />
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
