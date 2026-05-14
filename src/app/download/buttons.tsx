"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

type Asset = { browser_download_url: string; size: number } | null;
type Downloads = {
  macArm: Asset;
  macIntel: Asset;
  win: Asset;
  linuxApp: Asset;
  linuxDeb: Asset;
} | null;

function detectPlatform(): "macArm" | "macIntel" | "win" | "linux" | "unknown" {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() ?? "";
  if (ua.includes("mac") || platform.includes("mac")) {
    // ARM detection: rough heuristic via userAgentData if available
    const ad = (navigator as unknown as { userAgentData?: { platform?: string; getHighEntropyValues?: (k: string[]) => Promise<{ architecture?: string }> } }).userAgentData;
    if (ad?.platform?.toLowerCase().includes("mac") && /arm/i.test(navigator.userAgent)) return "macArm";
    return "macArm"; // default to ARM on modern macs (M1+)
  }
  if (ua.includes("win") || platform.includes("win")) return "win";
  if (ua.includes("linux") || platform.includes("linux")) return "linux";
  return "unknown";
}

export function DownloadButtons({ downloads, version }: { downloads: Downloads; version: string | null }) {
  const [plat, setPlat] = useState<ReturnType<typeof detectPlatform>>("unknown");
  useEffect(() => { setPlat(detectPlatform()); }, []);

  if (!downloads) {
    return (
      <div className="mt-10 flex flex-col items-center gap-3">
        <div className="text-sm text-ink-500">
          Desktop installer hasn&apos;t been published yet. While you wait —
        </div>
        <a href="/dashboard" className="btn-primary text-base px-7 py-3.5">
          Use the web app
        </a>
      </div>
    );
  }

  let primary: { url: string; label: string } | null = null;
  if (plat === "macArm" && downloads.macArm) {
    primary = { url: downloads.macArm.browser_download_url, label: `Download for macOS${version ? ` · v${version}` : ""}` };
  } else if (plat === "macIntel" && downloads.macIntel) {
    primary = { url: downloads.macIntel.browser_download_url, label: `Download for macOS (Intel)${version ? ` · v${version}` : ""}` };
  } else if (plat === "win" && downloads.win) {
    primary = { url: downloads.win.browser_download_url, label: `Download for Windows${version ? ` · v${version}` : ""}` };
  } else if (plat === "linux" && (downloads.linuxApp || downloads.linuxDeb)) {
    const a = downloads.linuxApp ?? downloads.linuxDeb!;
    primary = { url: a.browser_download_url, label: `Download for Linux${version ? ` · v${version}` : ""}` };
  }

  return (
    <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
      {primary ? (
        <a href={primary.url} className="btn-primary text-base px-7 py-3.5">
          <Download className="h-4 w-4" /> {primary.label}
        </a>
      ) : (
        <a href="#all-platforms" className="btn-primary text-base px-7 py-3.5">
          <Download className="h-4 w-4" /> See all platforms
        </a>
      )}
      <a href="/dashboard" className="btn-secondary text-base px-7 py-3.5">
        Use the web app
      </a>
    </div>
  );
}
