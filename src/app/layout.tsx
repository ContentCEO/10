import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ContractorFlow — AI CRM for contractors",
  description:
    "ContractorFlow is an AI-powered CRM built for contractors and home service businesses. Track leads, manage jobs, and follow up faster.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563eb",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
