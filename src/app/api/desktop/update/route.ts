import { NextResponse } from "next/server";

export const runtime = "edge";

// Tauri updater endpoint. The desktop app polls this URL with its current
// version + platform + arch; we proxy to GitHub Releases and return either
// 204 (already up to date) or a JSON descriptor of the new build.
//
// Expected Tauri target strings (see tauri.conf.json plugins.updater.endpoints):
//   darwin-aarch64, darwin-x86_64, linux-x86_64, windows-x86_64
//
// GitHub Release asset naming (default Tauri output):
//   ContractorFlow_0.2.0_aarch64.dmg
//   ContractorFlow_0.2.0_x64.dmg
//   ContractorFlow_0.2.0_amd64.AppImage
//   ContractorFlow_0.2.0_x64-setup.exe
// Plus `.sig` companions for each, which we relay as the `signature` field.

const REPO = process.env.GITHUB_RELEASES_REPO ?? "contentceo/10";

type GhAsset = { name: string; browser_download_url: string };
type GhRelease = {
  tag_name: string;
  published_at: string;
  body: string | null;
  assets: GhAsset[];
};

function matchAsset(assets: GhAsset[], target: string): { url: string; sig?: string } | null {
  const isInstaller = (n: string) => {
    if (target === "darwin-aarch64") return /aarch64.*\.dmg$/i.test(n);
    if (target === "darwin-x86_64") return /(x64|x86_64).*\.dmg$/i.test(n);
    if (target === "linux-x86_64")  return /\.AppImage$/i.test(n);
    if (target === "windows-x86_64") return /-setup\.exe$/i.test(n) || /\.msi$/i.test(n);
    return false;
  };
  const installer = assets.find((a) => isInstaller(a.name));
  if (!installer) return null;
  const sig = assets.find((a) => a.name === `${installer.name}.sig`);
  return {
    url: installer.browser_download_url,
    sig: sig?.browser_download_url,
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const platform = url.searchParams.get("platform") ?? "";
  const current = url.searchParams.get("current_version") ?? "0.0.0";

  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 300 },
    });
    if (!res.ok) return new NextResponse(null, { status: 204 });
    const release = (await res.json()) as GhRelease;
    const latest = release.tag_name.replace(/^v/, "");
    if (latest === current) return new NextResponse(null, { status: 204 });

    const asset = matchAsset(release.assets, platform);
    if (!asset) return new NextResponse(null, { status: 204 });

    let signature = "";
    if (asset.sig) {
      const sigRes = await fetch(asset.sig);
      if (sigRes.ok) signature = (await sigRes.text()).trim();
    }

    return NextResponse.json({
      version: latest,
      pub_date: release.published_at,
      url: asset.url,
      signature,
      notes: release.body ?? "",
    });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
