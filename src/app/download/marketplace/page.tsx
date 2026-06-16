import Link from "next/link";
import { Apple, ArrowRight, CheckCircle2, Download, Monitor, Smartphone, Terminal, type LucideIcon } from "lucide-react";
import { DownloadButtons } from "../buttons";
import { fetchLatestRelease, type ModuleDownloadTheme, MODULE_THEMES } from "../config";

export const dynamic = "force-dynamic";

const theme = MODULE_THEMES.marketplace;

export default async function DownloadMarketplacePage() {
  const { version, downloads } = await fetchLatestRelease("marketplace");

  return (
    <main className="relative min-h-screen overflow-hidden bg-stone-50">
      <div className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            `radial-gradient(900px 500px at 80% -10%, ${theme.accentRgba}, transparent 60%),` +
            `radial-gradient(700px 400px at -10% 10%, ${theme.accentRgba}, transparent 60%)`,
        }} />

      <Header theme={theme} />

      <section className="mx-auto max-w-4xl px-6 pt-16 pb-12 text-center animate-fade-up">
        <span className="badge bg-white/80 ring-1 shadow-soft"
          style={{ color: theme.accentText, borderColor: theme.accentBorder }}>
          <Download className="h-3.5 w-3.5 mr-1" />
          {version ? `Marketplace Edition · v${version}` : "Marketplace Edition"}
        </span>
        <h1 className="mt-6 display-h1">
          Download <span style={{
            backgroundImage: `linear-gradient(135deg, ${theme.gradFrom}, ${theme.gradTo})`,
            WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>Marketplace</span>
        </h1>
        <p className="mt-6 lede max-w-2xl mx-auto">
          Real MA homeowner leads, delivered to your desktop. Native push
          notifications the second a lead lands. Never miss a job again.
        </p>

        <DownloadButtons downloads={downloads} version={version} />

        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-500">
          {["Push alerts on new leads", "Filter by trade + ZIP", "Auto-updates", "Free for 7 days"].map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" style={{ color: theme.accent }} /> {t}
            </li>
          ))}
        </ul>
      </section>

      <PlatformsGrid downloads={downloads} theme={theme} />

      <section className="mx-auto max-w-4xl px-6 pb-24">
        <div className="rounded-2xl p-8 sm:p-10 ring-1 ring-stone-200"
          style={{ background: `linear-gradient(135deg, ${theme.accentRgba}, rgba(255,255,255,0.6))` }}>
          <h2 className="display-h2">What you get</h2>
          <ul className="mt-5 grid sm:grid-cols-2 gap-3 text-sm">
            {[
              "Native push the moment a lead lands",
              "Lead density by ZIP (see what's hot in your area)",
              "One-tap call, text, and email actions",
              "Wallet + auto-bid for premium leads",
              "Works offline — replies queue when you're back",
              "Auto-updates with new lead sources monthly",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: theme.accent }} />
                <span className="text-ink-700">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function Header({ theme }: { theme: ModuleDownloadTheme }) {
  return (
    <header className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2 font-semibold text-lg tracking-tight">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-glow"
          style={{ background: `linear-gradient(135deg, ${theme.gradFrom}, ${theme.gradTo})` }}>
          CF
        </span>
        ContractorFlow Marketplace
      </Link>
      <nav className="flex items-center gap-2">
        <Link href="/download" className="btn-secondary">All editions</Link>
        <Link href="/signup" className="btn-primary">
          Start free trial <ArrowRight className="h-4 w-4" />
        </Link>
      </nav>
    </header>
  );
}

function PlatformsGrid({ downloads, theme }: {
  downloads: NonNullable<Awaited<ReturnType<typeof fetchLatestRelease>>>["downloads"];
  theme: ModuleDownloadTheme;
}) {
  return (
    <section id="all-platforms" className="mx-auto max-w-5xl px-6 pb-16">
      <h2 className="section-eyebrow mb-4">All platforms</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <PlatformCard icon={Apple} tone="from-ink-700 to-ink-900" title="macOS (Apple Silicon)" sub="M1–M4 · macOS 10.15+"
          href={downloads?.macArm?.browser_download_url} size={downloads?.macArm?.size} ext=".dmg" theme={theme} />
        <PlatformCard icon={Apple} tone="from-ink-600 to-ink-800" title="macOS (Intel)" sub="x86_64 · macOS 10.15+"
          href={downloads?.macIntel?.browser_download_url} size={downloads?.macIntel?.size} ext=".dmg" theme={theme} />
        <PlatformCard icon={Monitor} tone="from-sky-500 to-blue-600" title="Windows" sub="Windows 10 / 11 · 64-bit"
          href={downloads?.win?.browser_download_url} size={downloads?.win?.size} ext=".exe" theme={theme} />
        <PlatformCard icon={Terminal} tone="from-amber-500 to-orange-500" title="Linux (AppImage)" sub="Most distros · 64-bit"
          href={downloads?.linuxApp?.browser_download_url} size={downloads?.linuxApp?.size} ext=".AppImage" theme={theme} />
        <PlatformCard icon={Terminal} tone="from-rose-500 to-pink-600" title="Linux (Debian/Ubuntu)" sub=".deb package · 64-bit"
          href={downloads?.linuxDeb?.browser_download_url} size={downloads?.linuxDeb?.size} ext=".deb" theme={theme} />
        <Link href="/" className="card card-hover p-6 flex flex-col gap-2">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-glow"
            style={{ background: `linear-gradient(135deg, ${theme.gradFrom}, ${theme.gradTo})` }}>
            <Smartphone className="h-5 w-5" />
          </span>
          <div className="font-semibold tracking-tight">iOS &amp; Android</div>
          <div className="text-sm text-ink-600">Use the web app — &ldquo;Add to Home Screen&rdquo; works like a native app.</div>
        </Link>
      </div>
      <p className="mt-4 text-center text-xs text-ink-500">
        One ContractorFlow installer covers all three editions. Your modules unlock based on your subscription.
      </p>
    </section>
  );
}

function PlatformCard({ icon: Icon, tone, title, sub, href, size, ext, theme }: {
  icon: LucideIcon; tone: string; title: string; sub: string;
  href?: string | null; size?: number; ext: string; theme: ModuleDownloadTheme;
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
        <a href={href!} className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl text-white font-semibold px-4 py-2 text-sm transition hover:opacity-90"
          style={{ background: theme.accent }}>
          <Download className="h-3.5 w-3.5" /> Download {ext}
          {mb ? <span className="opacity-75 ml-1">· {mb} MB</span> : null}
        </a>
      ) : (
        <div className="btn-secondary mt-auto !py-2 text-sm pointer-events-none opacity-70">Coming soon</div>
      )}
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-ink-200 py-8 text-center text-sm text-ink-500">
      © {new Date().getFullYear()} ContractorFlow · Built with Tauri + Next.js
    </footer>
  );
}
