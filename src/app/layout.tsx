import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LocalRank AI — Local SEO copilot for small businesses",
  description:
    "Audit and improve your local SEO. AI-generated audits, review responses, keyword ideas, and monthly reports.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
