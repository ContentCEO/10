import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Instrument_Serif } from "next/font/google";
import "./globals.css";
import { PWAInstall } from "@/components/PWAInstall";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument-serif",
});

export const metadata: Metadata = {
  title: {
    default: "ContractorFlow — AI CRM for contractors",
    template: "%s · ContractorFlow",
  },
  description:
    "ContractorFlow is an AI-powered CRM built for contractors and home service businesses. Track leads, manage jobs, and follow up faster.",
  applicationName: "ContractorFlow",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ContractorFlow",
  },
  icons: {
    icon: [
      { url: "/icon.svg",     type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  verification: {
    google: "bQYnyEGm3PSVkOb3fRb6Iw4SvqSeVT1ITd8FLPxYpwk",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#6366f1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} ${instrumentSerif.variable}`}>
      <body className="font-sans">
        {children}
        <PWAInstall />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
