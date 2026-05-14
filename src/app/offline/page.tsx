import Link from "next/link";
import { WifiOff } from "lucide-react";

export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-ink-50">
      <div className="card p-8 sm:p-10 max-w-md text-center">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
          <WifiOff className="h-6 w-6" />
        </div>
        <h1 className="mt-5 display-h2">You&apos;re offline</h1>
        <p className="mt-3 lede">
          ContractorFlow needs a connection for live data. Once you&apos;re back
          online, this page will reconnect automatically.
        </p>
        <Link href="/dashboard" className="btn-primary mt-6 inline-flex">
          Try again
        </Link>
      </div>
    </main>
  );
}
