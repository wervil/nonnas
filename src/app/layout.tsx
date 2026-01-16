import type { Metadata } from "next"
import "./globals.css"

import Script from "next/script";

import { NextIntlClientProvider } from "next-intl"
import { getLocale, getMessages } from "next-intl/server"

import { StackProvider, StackTheme } from "@stackframe/stack"
import { stackServerApp } from "../stack"
import { Footer } from "@/components/Footer"

import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: "Cook Book App",
  description: "Best recipes all over the world",
  icons: {
    icon: [
      { url: "/logoMain.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" }, // optional fallback
    ],
    apple: "/apple-touch-icon.png", // optional
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body>
      <Script
          id="google-maps"
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&v=weekly`}
          strategy="beforeInteractive"
        />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <StackProvider app={stackServerApp}>
            <StackTheme>
              <div className="min-h-svh">{children}</div>
              <Footer />
            </StackTheme>
          </StackProvider>
        </NextIntlClientProvider>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  )
}
