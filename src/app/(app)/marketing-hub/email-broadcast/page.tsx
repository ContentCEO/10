import { Mail } from "lucide-react";
import { EmailBroadcastForm } from "./EmailBroadcastForm";

export const dynamic = "force-dynamic";

export default function EmailBroadcastPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Mail className="h-3.5 w-3.5" /> Marketing · Email Blast</span>
          <h1 className="mt-2 display-h2">
            Email your whole <em>list</em>
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Newsletter, holiday update, seasonal offer. Plain text only —
            keeps deliverability high. Use{" "}
            <code className="text-xs bg-ink-100 px-1.5 py-0.5 rounded">{"{{first_name}}"}</code>{" "}
            to personalize.
          </p>
        </div>
      </header>

      <EmailBroadcastForm />
    </div>
  );
}
