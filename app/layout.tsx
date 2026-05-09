import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LeadRevive AI — Wake up your old leads",
  description:
    "Upload a CSV of cold leads and let AI write personalized SMS + email follow-ups that get replies.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
