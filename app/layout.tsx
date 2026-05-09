import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LocalContent AI — Social media content for local businesses",
  description:
    "Generate 30 days of Instagram captions, Reels ideas, promos, and hashtags tailored to your local business in one click.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
