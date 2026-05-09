import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/auth";
import { PublishControls } from "@/components/PublishControls";
import { EmbedSnippet } from "@/components/EmbedSnippet";
import type { AIEmployee } from "@/lib/types";

export default async function EmployeeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { org, supabase } = await requireOrg();
  const { data } = await supabase
    .from("ai_employees")
    .select("*")
    .eq("id", params.id)
    .eq("org_id", org.id)
    .maybeSingle();

  if (!data) notFound();
  const emp = data as AIEmployee;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const chatUrl = emp.public_slug ? `${appUrl}/chat/${emp.public_slug}` : null;

  const [{ count: convCount }, { count: leadCount }] = await Promise.all([
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("ai_employee_id", emp.id),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("ai_employee_id", emp.id),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/employees" className="text-xs text-slate-500 hover:text-slate-700">
            ← All employees
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900">{emp.name}</h1>
          <p className="mt-1 text-sm capitalize text-slate-600">
            {emp.role} · {emp.business_name ?? "—"}
          </p>
        </div>
        <PublishControls employeeId={emp.id} initialPublished={emp.is_published} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Status" value={emp.is_published ? "Live" : "Draft"} />
        <Stat label="Conversations" value={convCount ?? 0} />
        <Stat label="Leads" value={leadCount ?? 0} />
      </div>

      {emp.is_published && chatUrl && (
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900">Live URLs</h2>
          <p className="mt-1 text-xs text-slate-500">
            Share the chat URL or embed the widget on your site.
          </p>
          <div className="mt-3 space-y-3 text-sm">
            <div>
              <span className="text-slate-500">Hosted chat:</span>{" "}
              <a
                href={chatUrl}
                target="_blank"
                rel="noreferrer"
                className="text-brand-700 hover:text-brand-800"
              >
                {chatUrl}
              </a>
            </div>
            <div>
              <p className="mb-1 text-slate-500">Embed widget:</p>
              <EmbedSnippet
                appUrl={appUrl}
                slug={emp.public_slug!}
                color={emp.widget_color || "#0070c4"}
              />
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900">Business</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row k="Name" v={emp.business_name} />
            <Row k="Phone" v={emp.business_phone} />
            <Row k="Email" v={emp.business_email} />
            <Row k="Address" v={emp.business_address} />
            <Row k="Hours" v={emp.business_hours} />
            <Row k="Service area" v={emp.service_area} />
            <Row k="About" v={emp.about} />
          </dl>
        </section>

        <section className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900">Voice</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row k="Greeting" v={emp.greeting} />
            <Row k="Tone" v={emp.tone} />
          </dl>

          <h2 className="mt-6 text-sm font-semibold text-slate-900">Pricing</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row k="Labor rate" v={emp.pricing?.labor_rate} />
            <Row k="Minimum" v={emp.pricing?.minimum} />
            <Row k="Notes" v={emp.pricing?.notes} />
          </dl>
        </section>

        <section className="card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">Services</h2>
          {emp.services.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No services yet.</p>
          ) : (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {emp.services.map((s, i) => (
                <li key={i} className="rounded-md border border-slate-200 p-3 text-sm">
                  <p className="font-medium text-slate-900">{s.name}</p>
                  {s.price_range && (
                    <p className="text-xs text-slate-500">{s.price_range}</p>
                  )}
                  {s.description && (
                    <p className="mt-1 text-xs text-slate-600">{s.description}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">FAQs</h2>
          {emp.faqs.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No FAQs yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {emp.faqs.map((f, i) => (
                <li key={i} className="rounded-md border border-slate-200 p-3 text-sm">
                  <p className="font-medium text-slate-900">{f.question}</p>
                  <p className="mt-1 text-slate-600">{f.answer}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="flex gap-3">
        <Link href={`/employees/${emp.id}/conversations`} className="btn-secondary">
          View conversations
        </Link>
        <Link href={`/employees/${emp.id}/leads`} className="btn-secondary">
          View leads
        </Link>
        {chatUrl && (
          <Link href={chatUrl} target="_blank" className="btn-secondary">
            Preview chat
          </Link>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card p-5">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function Row({ k, v }: { k: string; v?: string | null }) {
  return (
    <div className="flex gap-3">
      <dt className="w-28 shrink-0 text-slate-500">{k}</dt>
      <dd className="text-slate-900">{v || <span className="text-slate-400">—</span>}</dd>
    </div>
  );
}
