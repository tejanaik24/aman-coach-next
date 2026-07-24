import type { Metadata, Viewport } from "next"
import { Inter, Space_Grotesk, Montserrat } from "next/font/google"
import { Toaster } from "react-hot-toast"
import { AuthProvider } from "@/contexts/AuthContext"
import "./globals.css"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
})

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
})

export const metadata: Metadata = {
  title: "AK Fitness Coach — Premium Coaching by Aman Khurana",
  description: "Elite fitness coaching platform by Aman Khurana. Track workouts, nutrition, and progress.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AK Coach",
  },
}

export const viewport: Viewport = {
  themeColor: "#C9A84C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} ${montserrat.variable} dark`} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="application-name" content="AK Fitness Coach" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-screen bg-cream text-charcoal-deep font-sans antialiased">
        <AuthProvider>
        <div className="mx-auto max-w-[430px] min-h-screen bg-cream relative">
          {children}
        </div>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#161616",
              color: "#fff",
              border: "1px solid #222222",
              borderRadius: "12px",
            },
            success: { iconTheme: { primary: "#C9A84C", secondary: "#0A0A0A" } },
            error: { iconTheme: { primary: "#F87171", secondary: "#0A0A0A" } },
          }}
        />
        </AuthProvider>
      </body>
    </html>
  )
}
