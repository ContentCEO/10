import Link from "next/link";
import { Apple, ArrowRight, CheckCircle2, Download, Monitor, Smartphone, Terminal } from "lucide-react";
import { DownloadButtons } from "./buttons";

export const dynamic = "force-static";

const REPO = process.env.GITHUB_RELEASES_REPO ?? "contentceo/10";

interface GhRelease {
  tag_name: string;
  assets: { name: string; browser_download_url: string; size: number }[];
}

async function fetchLatest(): Promise<GhRelease | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    return (await res.json()) as GhRelease;
  } catch {
    return null;
  }
}

function pickAsset(rel: GhRelease, match: (n: string) => boolean) {
  return rel.assets.find((a) => match(a.name)) ?? null;
}

export default async function DownloadPage() {
  const rel = await fetchLatest();
  const version = rel?.tag_name?.replace(/^v/, "") ?? null;
  const downloads = rel ? {
    macArm:   pickAsset(rel, (n) => /aarch64.*\.dmg$/i.test(n)),
    macIntel: pickAsset(rel, (n) => /(x64|x86_64).*\.dmg$/i.test(n)),
    win:      pickAsset(rel, (n) => /-setup\.exe$/i.test(n) || /\.msi$/i.test(n)),
    linuxApp: pickAsset(rel, (n) => /\.AppImage$/i.test(n)),
    linuxDeb: pickAsset(rel, (n) => /\.deb$/i.test(n)),
  } : null;

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-mesh-1" />
      <div className="pointer-events-none absolute -z-10 left-1/2 top-0 h-[600px] w-[1100px] -translate-x-1/2 rounded-full bg-brand-radial blur-3xl" />

      <header className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg tracking-tight">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow">CF</span>
          ContractorFlow
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/login" className="btn-secondary">Log in</Link>
          <Link href="/signup" className="btn-primary">
            Start free trial <ArrowRight className="h-4 w-4" />
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-4xl px-6 pt-16 pb-12 text-center animate-fade-up">
        <span className="badge bg-white/80 text-brand-700 ring-brand-200 backdrop-blur shadow-soft">
          <Download className="h-3.5 w-3.5 mr-1" />
          {version ? `ContractorFlow Desktop · v${version}` : "ContractorFlow Desktop"}
        </span>
        <h1 className="mt-6 display-h1">
          Download <span className="gradient-text">ContractorFlow</span>
        </h1>
        <p className="mt-6 lede max-w-2xl mx-auto">
          The full CRM, on your desktop. Native window. Push notifications.
          Auto-updates. Built on Tauri, signed and notarized.
        </p>

        <DownloadButtons downloads={downloads} version={version} />

        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-500">
          {["Auto-updates", "Native notifications", "Works offline (mostly)", "Free with your account"].map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {t}
            </li>
          ))}
        </ul>
      </section>

      {/* All platforms grid */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <h2 className="section-eyebrow mb-4">All platforms</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <PlatformCard
            icon={Apple}
            tone="from-ink-700 to-ink-900"
            title="macOS (Apple Silicon)"
            sub="M1, M2, M3, M4 · macOS 10.15+"
            href={downloads?.macArm?.browser_download_url}
            size={downloads?.macArm?.size}
            ext=".dmg"
          />
          <PlatformCard
            icon={Apple}
            tone="from-ink-600 to-ink-800"
            title="macOS (Intel)"
            sub="x86_64 · macOS 10.15+"
            href={downloads?.macIntel?.browser_download_url}
            size={downloads?.macIntel?.size}
            ext=".dmg"
          />
          <PlatformCard
            icon={Monitor}
            tone="from-sky-500 to-blue-600"
            title="Windows"
            sub="Windows 10 / 11 · 64-bit"
            href={downloads?.win?.browser_download_url}
            size={downloads?.win?.size}
            ext=".exe"
          />
          <PlatformCard
            icon={Terminal}
            tone="from-amber-500 to-orange-500"
            title="Linux (AppImage)"
            sub="Most distros · 64-bit"
            href={downloads?.linuxApp?.browser_download_url}
            size={downloads?.linuxApp?.size}
            ext=".AppImage"
          />
          <PlatformCard
            icon={Terminal}
            tone="from-rose-500 to-pink-600"
            title="Linux (Debian/Ubuntu)"
            sub=".deb package · 64-bit"
            href={downloads?.linuxDeb?.browser_download_url}
            size={downloads?.linuxDeb?.size}
            ext=".deb"
          />
          <Link href="/" className="card card-hover p-6 flex flex-col gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow">
              <Smartphone className="h-5 w-5" />
            </span>
            <div className="font-semibold tracking-tight">iOS &amp; Android</div>
            <div className="text-sm text-ink-600">
              Use the web app — &ldquo;Add to Home Screen&rdquo; installs it like a native app.
            </div>
          </Link>
        </div>
      </section>

      {/* What's included */}
      <section className="mx-auto max-w-4xl px-6 pb-24">
        <div className="surface-soft p-8 sm:p-10">
          <h2 className="display-h2">What you get</h2>
          <ul className="mt-5 grid sm:grid-cols-2 gap-3 text-sm">
            {[
              "Full CRM in a native window",
              "Background lead alerts (no browser needed)",
              "Auto-update — always on the latest version",
              "Faster startup than the web app",
              "Persistent login across reboots",
              "Native OS notifications + system tray (Windows/Linux)",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-ink-700">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="border-t border-ink-200 py-8 text-center text-sm text-ink-500">
        © {new Date().getFullYear()} ContractorFlow · Built with Tauri + Next.js
      </footer>
    </main>
  );
}

function PlatformCard({
  icon: Icon, tone, title, sub, href, size, ext,
}: {
  icon: typeof Apple;
  tone: string;
  title: string;
  sub: string;
  href?: string | null;
  size?: number;
  ext: string;
}) {
  const mb = size ? (size / 1024 / 1024).toFixed(1) : null;
  const available = Boolean(href);
  return (
    <div className={`card p-6 flex flex-col gap-3 ${available ? "card-hover" : "opacity-70"}`}>
      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${tone} text-white shadow-glow`}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <div className="font-semibold tracking-tight">{title}</div>
        <div className="text-xs text-ink-500">{sub}</div>
      </div>
      {available ? (
        <a href={href!} className="btn-primary mt-auto !py-2 text-sm">
          <Download className="h-3.5 w-3.5" /> Download {ext}
          {mb ? <span className="opacity-75 ml-1">· {mb} MB</span> : null}
        </a>
      ) : (
        <div className="btn-secondary mt-auto !py-2 text-sm pointer-events-none opacity-70">
          Coming soon
        </div>
      )}
    </div>
  );
}
