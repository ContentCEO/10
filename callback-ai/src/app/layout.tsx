import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CallBack AI",
  description: "Auto-text leads back after every missed call."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
