import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ContractorClose AI — Close more sales calls",
  description:
    "AI sales coach for contractors. Score every call, fix what you missed, and follow up automatically.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
