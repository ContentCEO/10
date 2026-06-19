import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { VerificationDecideCard } from "./DecideCard";

export const dynamic = "force-dynamic";

export default async function AdminVerificationsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/verifications");

  const admin = createAdminClient();
  const { data: prof } = await admin
    .from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(prof as { is_admin?: boolean } | null)?.is_admin) {
    return (
      <div className="min-h-screen grid place-items-center p-8" style={{ background: "var(--canvas)", color: "var(--text)" }}>
        <div className="text-center">
          <div className="text-2xl font-semibold">403</div>
          <div className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>Admin only.</div>
        </div>
      </div>
    );
  }

  const { data: queueRows } = await admin
    .from("verifications")
    .select("user_id, status, hic_number, csl_number, insurance_carrier, insurance_policy, insurance_expiry, notes, submitted_at, reject_reason")
    .eq("status", "pending")
    .order("submitted_at", { ascending: true });

  type Row = {
    user_id: string;
    status: string;
    hic_number: string | null;
    csl_number: string | null;
    insurance_carrier: string | null;
    insurance_policy: string | null;
    insurance_expiry: string | null;
    notes: string | null;
    submitted_at: string | null;
    reject_reason: string | null;
  };
  const queue = (queueRows ?? []) as Row[];

  // Hydrate with user email + business name in one batched query.
  const ids = queue.map((q) => q.user_id);
  const { data: profRows } = ids.length > 0
    ? await admin.from("profiles").select("id, email, business_name").in("id", ids)
    : { data: [] };
  const profMap = new Map<string, { email: string; business_name: string | null }>();
  for (const p of (profRows ?? []) as Array<{ id: string; email: string; business_name: string | null }>) {
    profMap.set(p.id, { email: p.email, business_name: p.business_name });
  }

  return (
    <div className="min-h-screen p-6 sm:p-10" style={{ background: "var(--canvas)", color: "var(--text)" }}>
      <div className="max-w-5xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">Verification queue</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            Check MA OCABR (HIC #), confirm COI is current + matches carrier on file. Approve to unlock routing + Verified seal.
          </p>
        </header>

        {queue.length === 0 ? (
          <div className="rounded-2xl p-12 text-center"
            style={{ background: "var(--surface)", border: "1px dashed var(--border)" }}>
            <div className="text-sm" style={{ color: "var(--text-muted)" }}>Queue empty — no pending submissions.</div>
          </div>
        ) : (
          <ul className="space-y-3">
            {queue.map((row) => (
              <li key={row.user_id}>
                <VerificationDecideCard row={row} contractor={profMap.get(row.user_id) ?? null} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
