import { Megaphone } from "lucide-react";
import { BroadcastForm } from "./BroadcastForm";

export const dynamic = "force-dynamic";

export default function BroadcastPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Megaphone className="h-3.5 w-3.5" /> Marketing · Broadcast</span>
          <h1 className="mt-2 display-h2">
            Text your whole <em>book</em>
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Holiday closure, special offer, weather delay — one message to
            every customer at once. Use{" "}
            <code className="text-xs bg-ink-100 px-1.5 py-0.5 rounded">{"{{first_name}}"}</code>{" "}
            to personalize.
          </p>
        </div>
      </header>

      <BroadcastForm />
    </div>
  );
}
