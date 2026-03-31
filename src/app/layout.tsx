import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";

import Script from "next/script";

import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import { ConditionalFooter } from "@/components/ConditionalFooter";
import { UserNamePrompt } from "@/components/UserNamePrompt";
import { StackProvider, StackTheme } from "@stackframe/stack";
import { Toaster } from "sonner";
import { stackServerApp } from "../stack";

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
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

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
              <div className="flex flex-col min-h-svh">
                <div className="flex-1 min-h-0">{children}</div>
                <ConditionalFooter />
              </div>
              <Suspense fallback={null}>
                <UserNamePrompt />
              </Suspense>
            </StackTheme>
          </StackProvider>
        </NextIntlClientProvider>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
