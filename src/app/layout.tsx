import { NextIntlClientProvider } from 'next-intl'
import { getLocale } from 'next-intl/server'
import type { Metadata } from 'next'
import { StackProvider, StackTheme } from '@stackframe/stack'
import { stackServerApp } from '../stack'
import './globals.css'
import { Footer } from '@/components/Footer'

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
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>
          <StackProvider app={stackServerApp}>
            <StackTheme>
              <div className='min-h-svh'>{children}</div>
              <Footer />
            </StackTheme>
          </StackProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
