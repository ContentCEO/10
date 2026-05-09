import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProposalPro AI — Win more jobs with professional proposals",
  description:
    "AI-powered proposal builder for contractors. Turn job notes, photos, and measurements into beautiful, itemized proposals in minutes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="font-sans">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
