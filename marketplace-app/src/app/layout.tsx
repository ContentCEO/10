import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Instrument_Serif } from "next/font/google";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument-serif",
});

export const metadata: Metadata = {
  title: {
    default: "Contractor Flow Marketplace — Massachusetts contractor leads",
    template: "%s · Contractor Flow Marketplace",
  },
  description:
    "Free quotes for MA homeowners. Real residential leads for trade pros. Permits, deeds, paid ads — all in one place.",
  applicationName: "Contractor Flow Marketplace",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#06060A",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} ${instrumentSerif.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
