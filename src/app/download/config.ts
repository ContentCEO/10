// Shared helpers for the per-module download pages. Each /download/[module]
// page renders the same GitHub release assets but with its own theme + copy.

export interface ModuleDownloadTheme {
  accent: string;        // solid color
  accentText: string;    // text color over light bg
  accentBorder: string;  // ring color
  accentRgba: string;    // soft background tint
  gradFrom: string;      // gradient start (lockup icon, headline)
  gradTo: string;        // gradient end
}

export const MODULE_THEMES: Record<"marketplace" | "launchpad" | "crm", ModuleDownloadTheme> = {
  marketplace: {
    accent: "#059669",
    accentText: "#047857",
    accentBorder: "#a7f3d0",
    accentRgba: "rgba(16, 185, 129, 0.18)",
    gradFrom: "#059669",
    gradTo:   "#10b981",
  },
  launchpad: {
    accent: "#ea580c",
    accentText: "#c2410c",
    accentBorder: "#fed7aa",
    accentRgba: "rgba(249, 115, 22, 0.18)",
    gradFrom: "#ea580c",
    gradTo:   "#f97316",
  },
  crm: {
    accent: "#4f46e5",
    accentText: "#4338ca",
    accentBorder: "#c7d2fe",
    accentRgba: "rgba(99, 102, 241, 0.18)",
    gradFrom: "#4f46e5",
    gradTo:   "#6366f1",
  },
};

const REPO = process.env.GITHUB_RELEASES_REPO ?? "contentceo/10";

interface GhRelease {
  tag_name: string;
  assets: { name: string; browser_download_url: string; size: number }[];
}

type Asset = { browser_download_url: string; size: number } | null;
export interface ResolvedDownloads {
  version: string | null;
  downloads: {
    macArm: Asset;
    macIntel: Asset;
    win: Asset;
    linuxApp: Asset;
    linuxDeb: Asset;
  } | null;
}

export async function fetchLatestRelease(): Promise<ResolvedDownloads> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 600 },
    });
    if (!res.ok) return { version: null, downloads: null };
    const rel = (await res.json()) as GhRelease;
    const pick = (m: (n: string) => boolean) => rel.assets.find((a) => m(a.name)) ?? null;
    return {
      version: rel.tag_name?.replace(/^v/, "") ?? null,
      downloads: {
        macArm:   pick((n) => /aarch64.*\.dmg$/i.test(n)),
        macIntel: pick((n) => /(x64|x86_64).*\.dmg$/i.test(n)),
        win:      pick((n) => /-setup\.exe$/i.test(n) || /\.msi$/i.test(n)),
        linuxApp: pick((n) => /\.AppImage$/i.test(n)),
        linuxDeb: pick((n) => /\.deb$/i.test(n)),
      },
    };
  } catch {
    return { version: null, downloads: null };
  }
}
