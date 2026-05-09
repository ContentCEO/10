import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { ChatInterface } from "@/components/ChatInterface";
import { LeadForm } from "@/components/LeadForm";
import type { AIEmployee } from "@/lib/types";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const supa = createServiceClient();
  const { data } = await supa
    .from("ai_employees")
    .select("name, business_name")
    .eq("public_slug", params.slug)
    .eq("is_published", true)
    .maybeSingle();
  return {
    title: data
      ? `${data.business_name ?? data.name} — Chat with ${data.name}`
      : "Chat",
  };
}

export default async function PublicChatPage({
  params,
}: {
  params: { slug: string };
}) {
  const supa = createServiceClient();
  const { data } = await supa
    .from("ai_employees")
    .select("*")
    .eq("public_slug", params.slug)
    .eq("is_published", true)
    .maybeSingle();
  if (!data) notFound();
  const emp = data as AIEmployee;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              {emp.business_name ?? emp.name}
            </h1>
            {emp.about && (
              <p className="text-xs text-slate-500">{emp.about}</p>
            )}
          </div>
          <div className="hidden text-right text-xs text-slate-500 sm:block">
            {emp.business_phone && <p>{emp.business_phone}</p>}
            {emp.business_hours && <p>{emp.business_hours}</p>}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-6 py-8 lg:grid-cols-[1fr_360px]">
        <div className="h-[70vh]">
          <ChatInterface
            slug={emp.public_slug!}
            greeting={emp.greeting}
            employeeName={emp.name}
            color={emp.widget_color || "#0070c4"}
          />
        </div>

        <aside className="space-y-4">
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-slate-900">Request a callback</h2>
            <p className="mt-1 text-xs text-slate-500">
              Prefer a human? Leave your details and we&apos;ll reach out.
            </p>
            <div className="mt-3">
              <LeadForm slug={emp.public_slug!} color={emp.widget_color || "#0070c4"} />
            </div>
          </div>

          {emp.services.length > 0 && (
            <div className="card p-4">
              <h2 className="text-sm font-semibold text-slate-900">Services</h2>
              <ul className="mt-2 space-y-1 text-xs text-slate-700">
                {emp.services.map((s, i) => (
                  <li key={i}>
                    {s.name}
                    {s.price_range ? (
                      <span className="text-slate-500"> · {s.price_range}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
