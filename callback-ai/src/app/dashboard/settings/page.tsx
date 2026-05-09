import { createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const { data: business } = await supabase
    .from("businesses")
    .select("twilio_number")
    .eq("owner_id", user!.id)
    .maybeSingle();

  const voiceUrl = `${env.SITE_URL}/api/twilio/voice`;
  const statusUrl = `${env.SITE_URL}/api/twilio/voice-status`;
  const smsUrl = `${env.SITE_URL}/api/twilio/sms`;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="mb-1 text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-slate-600">
          Account details and Twilio webhook configuration.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-2 font-semibold">Account</h2>
        <p className="text-sm text-slate-600">Signed in as {user!.email}</p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-2 font-semibold">Twilio webhooks</h2>
        <p className="mb-4 text-sm text-slate-600">
          In your Twilio number's settings, paste these URLs:
        </p>
        <dl className="space-y-3 text-sm">
          <Row label="Voice — A CALL COMES IN" value={voiceUrl} />
          <Row label="Voice — Call status callback (events: completed)" value={statusUrl} />
          <Row label="Messaging — A MESSAGE COMES IN" value={smsUrl} />
        </dl>
        {!business?.twilio_number && (
          <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Add your Twilio number on the{" "}
            <a className="underline" href="/dashboard/business">
              Business profile
            </a>{" "}
            page so we can route inbound calls to your account.
          </p>
        )}
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[200px_1fr] sm:items-center">
      <dt className="text-slate-600">{label}</dt>
      <dd>
        <code className="block rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-800">
          {value}
        </code>
      </dd>
    </div>
  );
}
