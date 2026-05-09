import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIStaffer — AI employees for your business",
  description:
    "Create AI employees — receptionist, sales rep, estimator, support — that answer questions, qualify leads, and book appointments 24/7.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
