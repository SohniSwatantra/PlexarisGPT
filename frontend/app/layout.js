import { Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

export const metadata = {
  title: "Plexaris - AI Inventory Ordering",
  description: "AI-powered voice ordering for Plexaris inventory",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo%20copy.svg",
    shortcut: "/logo%20copy.svg",
    apple: "/logo%20copy.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Plexaris",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#00d4ff",
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.variable} ${jetbrainsMono.variable} antialiased`}>
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
