import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Heart, Sparkles, Star } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

// Plan 1 / D-18 — Customer thank-you landing.
// Public URL /thanks/<customer_id> — branded "thank you" page the
// contractor sends after a completed job. Asks for a review.

export const dynamic = "force-dynamic";

interface Customer {
  id: string;
  name: string | null;
  user_id: string;
}
interface Profile {
  business_name: string | null;
  email: string | null;
}

export default async function ThanksPage({ params }: { params: { id: string } }) {
  if (!params.id || params.id.length < 6) notFound();

  const admin = createAdminClient();
  const { data: customer } = await admin
    .from("customers").select("id,name,user_id").eq("id", params.id).maybeSingle() as { data: Customer | null };
  if (!customer) notFound();
  const { data: profile } = await admin
    .from("profiles").select("business_name,email").eq("id", customer.user_id).maybeSingle() as { data: Profile | null };

  const customerFirst = customer.name?.split(" ")[0] ?? "there";
  const business = profile?.business_name ?? "Your contractor";

  return (
    <main className="min-h-screen relative overflow-hidden flex items-center justify-center px-4 py-12 bg-ink-950 text-white">
      <div className="pointer-events-none absolute inset-0 -z-10"
           style={{
             background:
               "radial-gradient(900px 600px at 50% -10%, rgba(99,102,241,0.30), transparent 60%), radial-gradient(700px 500px at 90% 80%, rgba(217,70,239,0.25), transparent 60%), linear-gradient(180deg, #0a0f1f 0%, #0c1224 100%)",
           }}
      />
      <div className="max-w-xl text-center animate-fade-up">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 text-white shadow-glow">
          <Heart className="h-7 w-7" />
        </div>
        <div className="mt-5 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-white/10 ring-1 ring-white/15">
          <Sparkles className="h-3.5 w-3.5" /> From the {business} crew
        </div>
        <h1 className="mt-5 text-4xl sm:text-5xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
            Thank you, {customerFirst}.
          </span>
        </h1>
        <p className="mt-5 text-lg text-white/70 max-w-md mx-auto">
          We&apos;re grateful you trusted us with the work.
          If you have 30 seconds, a quick review means the world to a small shop like ours.
        </p>

        <div className="mt-8 flex flex-col gap-3 max-w-sm mx-auto">
          {profile?.email && (
            <a
              href={`mailto:${profile.email}?subject=${encodeURIComponent("Thanks for the work")}&body=${encodeURIComponent(`Hi ${business},\n\nWanted to say thanks — really appreciated the work you did. Please feel free to use any of this as a testimonial.\n\n[your message]\n\n— ${customer.name ?? ""}`)}`}
              className="btn bg-white text-ink-900 hover:bg-white/90 shadow-glow w-full justify-center"
            >
              <Star className="h-4 w-4" /> Email a testimonial
            </a>
          )}
          <Link href="/find-pro" className="btn bg-white/10 text-white border border-white/15 hover:bg-white/15 w-full justify-center">
            <CheckCircle2 className="h-4 w-4" /> Refer a friend (we&apos;ll send a $50 thank-you)
          </Link>
        </div>

        <p className="mt-10 text-xs text-white/40">
          ContractorFlow · {new Date().getFullYear()}
        </p>
      </div>
    </main>
  );
}
