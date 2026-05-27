import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { CaptureForm } from "./CaptureForm";

export const dynamic = "force-dynamic";

export default async function PublicCapturePage({ params }: { params: { id: string } }) {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, business_name")
    .eq("id", params.id)
    .single();

  if (!profile) notFound();
  const business = profile.business_name || "Our team";

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12 bg-slate-50">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[500px] bg-brand-radial blur-3xl" />
      <div className="w-full max-w-lg card p-7 sm:p-9">
        <div className="text-center">
          <span className="badge bg-brand-50 text-brand-700 ring-brand-200">Free estimate</span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            Get a quote from <span className="gradient-text">{business}</span>
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Tell us about your project — we'll get back to you within one business day.
          </p>
        </div>
        <CaptureForm userId={profile.id} business={business} />
      </div>
    </main>
  );
}
