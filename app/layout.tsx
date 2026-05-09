import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AdForge AI — Generate Meta Ads with AI",
  description:
    "AdForge AI generates Meta, Facebook & Instagram ad copy, hooks, headlines, image prompts, video scripts and campaign plans in seconds.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
