import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ClerkProvider } from "@clerk/nextjs"
import { isClerkConfigured } from "@/lib/auth"
import { ServiceWorkerRegistration } from "@/components/service-worker-registration"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Omkar Marketing",
  description: "Omkar Marketing business management",
  appleWebApp: {
    capable: true,
    title: "Omkar Marketing",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const shouldUseClerk = isClerkConfigured()

  const body = (
    <body className={`font-sans antialiased`}>
      {children}
      <ServiceWorkerRegistration />
      <Analytics />
    </body>
  )

  if (!shouldUseClerk) {
    return <html lang="en">{body}</html>
  }

  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
      <html lang="en">{body}</html>
    </ClerkProvider>
  )
}
