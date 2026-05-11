import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ContractorFlow",
    short_name: "ContractorFlow",
    description:
      "AI CRM for contractors — leads, jobs, AI follow-ups, and a 500+ lead/day pipeline.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f8fafc",
    theme_color: "#6366f1",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icon-192.png",      sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png",      sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg",          sizes: "any",     type: "image/svg+xml" },
    ],
    shortcuts: [
      {
        name: "New lead",
        short_name: "New lead",
        description: "Add a lead in seconds",
        url: "/leads/new",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Marketplace",
        short_name: "Marketplace",
        description: "Browse lead inventory",
        url: "/marketplace",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Dashboard",
        short_name: "Dashboard",
        description: "Your KPIs at a glance",
        url: "/dashboard",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
