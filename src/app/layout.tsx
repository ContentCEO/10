import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ContractorFlow — AI CRM for contractors",
  description:
    "ContractorFlow is an AI-powered CRM built for contractors and home service businesses. Track leads, manage jobs, and follow up faster.",
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
    <html lang="en" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
