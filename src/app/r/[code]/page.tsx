import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Gift } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

interface CodeRow {
  user_id: string;
  customer_id: string | null;
  credit_cents: number;
  code: string;
}

export default async function ReferralLandingPage({ params }: { params: { code: string } }) {
  const admin = createAdminClient();
  const { data: codeData } = await admin
    .from("referral_codes").select("user_id,customer_id,credit_cents,code")
    .eq("code", params.code).single();
  if (!codeData) notFound();
  const code = codeData as CodeRow;

  const [{ data: contractor }, { data: referrer }] = await Promise.all([
    admin.from("profiles").select("business_name,logo_url").eq("id", code.user_id).single(),
    code.customer_id
      ? admin.from("customers").select("name").eq("id", code.customer_id).single()
      : Promise.resolve({ data: null }),
  ]);
  const pro = contractor as Pick<Profile, "business_name" | "logo_url"> | null;
  const refName = (referrer as { name: string } | null)?.name ?? null;

  return (
    <main className="min-h-screen grid place-items-center px-6 py-10">
      <div className="card w-full max-w-md p-7 text-center relative overflow-hidden">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-gradient opacity-10 blur-2xl" />
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow">
          <Gift className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-2xl font-bold">
          You've got <span className="gradient-text">${(code.credit_cents / 100).toFixed(0)} off</span>
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {refName ? `${refName} thinks you'd love working with ` : "Welcome to "}
          <strong>{pro?.business_name ?? "this local pro"}</strong>.
          Tell us about your project and we'll apply your discount automatically.
        </p>
        <Link
          href={`/find-pro?ref=${encodeURIComponent(code.code)}`}
          className="btn-primary mt-6 inline-flex"
        >
          Claim my offer <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="mt-4 text-xs text-slate-400">
          Code: <code className="font-mono">{code.code}</code>
        </p>
      </div>
    </main>
  );
}
