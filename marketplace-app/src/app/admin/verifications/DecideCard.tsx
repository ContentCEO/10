"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, ExternalLink, X } from "lucide-react";

interface Row {
  user_id: string;
  hic_number: string | null;
  csl_number: string | null;
  insurance_carrier: string | null;
  insurance_policy: string | null;
  insurance_expiry: string | null;
  notes: string | null;
  submitted_at: string | null;
}
interface Contractor {
  email: string;
  business_name: string | null;
}

export function VerificationDecideCard({ row, contractor }: { row: Row; contractor: Contractor | null }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = (decision: "approve" | "reject") => {
    startTransition(async () => {
      const res = await fetch("/api/admin/verifications/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: row.user_id, decision, reject_reason: reason }),
      });
      if (res.ok) router.refresh();
      else alert("Decision failed.");
    });
  };

  const ocabrUrl = row.hic_number
    ? `https://elicensing.state.ma.us/CitizenAccess/Default.aspx?Module=HIC`
    : null;

  return (
    <div className="rounded-2xl p-5"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="font-semibold" style={{ color: "var(--text)" }}>
            {contractor?.business_name ?? contractor?.email ?? row.user_id.slice(0, 8)}
          </div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            {contractor?.email}
            {row.submitted_at && ` · submitted ${new Date(row.submitted_at).toLocaleString()}`}
          </div>
        </div>
        {ocabrUrl && (
          <a href={ocabrUrl} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs underline-offset-2 hover:underline"
            style={{ color: "var(--emerald)" }}>
            Check OCABR <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      <dl className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <Field label="MA HIC #">{row.hic_number}</Field>
        <Field label="MA CSL #">{row.csl_number ?? "—"}</Field>
        <Field label="Insurance carrier">{row.insurance_carrier}</Field>
        <Field label="Policy #">{row.insurance_policy ?? "—"}</Field>
        <Field label="Expiry">{row.insurance_expiry ? new Date(row.insurance_expiry).toLocaleDateString() : "—"}</Field>
      </dl>
      {row.notes && <div className="mt-3 text-xs italic" style={{ color: "var(--text-muted)" }}>“{row.notes}”</div>}

      {showReject && (
        <textarea value={reason} onChange={(e) => setReason(e.target.value)}
          rows={2} placeholder="Reason — shown to the contractor."
          className="mt-3 w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
          style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--text)" }} />
      )}

      <div className="mt-4 flex items-center justify-end gap-2">
        {showReject ? (
          <>
            <button onClick={() => setShowReject(false)}
              className="text-xs px-3 py-1.5 rounded-lg" style={{ color: "var(--text-muted)" }}>Cancel</button>
            <button onClick={() => submit("reject")} disabled={pending || !reason.trim()}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              style={{ background: "var(--danger)" }}>
              <X className="h-3 w-3" /> Confirm reject
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setShowReject(true)}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold"
              style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
              <X className="h-3 w-3" /> Reject
            </button>
            <button onClick={() => submit("approve")} disabled={pending}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
              style={{ background: "linear-gradient(135deg, var(--emerald-bright), var(--emerald-deep))" }}>
              <Check className="h-3 w-3" /> Approve
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-[10px] uppercase tracking-wider font-mono" style={{ color: "var(--text-faint)" }}>{label}</dt>
      <dd className="font-mono tabular-nums text-xs" style={{ color: "var(--text)" }}>{children}</dd>
    </>
  );
}
