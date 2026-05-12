import Link from "next/link";
import { Phone, Voicemail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { VoicemailRow } from "./VoicemailRow";

export const dynamic = "force-dynamic";

interface VoicemailRecord {
  id: string;
  call_sid: string | null;
  from_phone: string;
  to_phone: string | null;
  recording_url: string | null;
  duration_sec: number | null;
  transcription: string | null;
  ai_summary: string | null;
  ai_suggested_reply: string | null;
  status: "new" | "replied" | "archived";
  replied_at: string | null;
  created_at: string;
}

export default async function VoicemailsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const filter = searchParams.status ?? "new";
  let q = supabase.from("voicemails").select("*").order("created_at", { ascending: false }).limit(100);
  if (filter !== "all") q = q.eq("status", filter);

  const { data: rows } = await q;
  const vms = (rows ?? []) as VoicemailRecord[];

  const counts = {
    new:      vms.filter((v) => v.status === "new").length,
    replied:  vms.filter((v) => v.status === "replied").length,
    archived: vms.filter((v) => v.status === "archived").length,
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="relative card p-6 sm:p-7 overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Voicemail className="h-3.5 w-3.5" /> AI receptionist</span>
          <h1 className="mt-2 display-h2">Voicemails</h1>
          <p className="mt-2 text-sm text-ink-600">
            Every voicemail gets transcribed + AI-summarized + a suggested
            callback drafted for you. One click to send.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <FilterPill href="/voicemails" label={`New · ${counts.new}`} active={filter === "new"} />
            <FilterPill href="/voicemails?status=replied" label={`Replied · ${counts.replied}`} active={filter === "replied"} />
            <FilterPill href="/voicemails?status=archived" label={`Archived · ${counts.archived}`} active={filter === "archived"} />
            <FilterPill href="/voicemails?status=all" label="All" active={filter === "all"} />
          </div>
        </div>
      </header>

      <section className="card p-5">
        <h2 className="section-title flex items-center gap-2">
          <Phone className="h-4 w-4 text-brand-600" /> Setup
        </h2>
        <p className="mt-2 text-sm text-ink-600">
          Point your Twilio number&apos;s voicemail webhook at:
        </p>
        <code className="mt-2 block bg-ink-50 px-3 py-2 rounded-lg text-xs">
          POST {process.env.NEXT_PUBLIC_APP_URL ?? "https://yourdomain"}/api/voice/twilio-recording?secret=YOUR_WEBHOOK_SECRET
        </code>
        <p className="mt-2 text-xs text-ink-500">
          Twilio recommends configuring this in your number&apos;s &ldquo;Voice configuration&rdquo; →
          &ldquo;A call comes in&rdquo; → TwiML with a {`<Record transcribe="true">`} verb pointing here.
        </p>
      </section>

      {vms.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow mb-4">
            <Voicemail className="h-6 w-6" />
          </div>
          <p className="text-sm text-ink-600 max-w-md mx-auto">
            No voicemails {filter === "all" ? "" : `with status "${filter}"`}.
            When a caller leaves a message and Twilio posts to your webhook,
            it&apos;ll appear here with an AI summary and a callback draft.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {vms.map((vm) => (
            <VoicemailRow key={vm.id} vm={vm} />
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterPill({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`badge transition ${active ? "bg-brand-100 text-brand-700 ring-brand-200" : "bg-ink-100 text-ink-700 ring-ink-200 hover:bg-brand-50"}`}
    >
      {label}
    </Link>
  );
}
