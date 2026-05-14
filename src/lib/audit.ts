import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Plan 1 / B-17 — Admin action audit log writer.
 *
 *   await logAudit({ actor_id, actor_email, action: "agent.toggle",
 *                    target: "agent:lead-triage", details: { enabled: true } });
 *
 * Best-effort — failures are swallowed so audit logging never breaks the
 * action it's logging.
 */

interface AuditInput {
  actor_id?: string | null;
  actor_email?: string | null;
  action: string;
  target?: string | null;
  details?: Record<string, unknown>;
  request?: Request;
}

export async function logAudit(input: AuditInput): Promise<void> {
  try {
    const admin = createAdminClient();
    const ip = input.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    await admin.from("admin_audit").insert({
      actor_id: input.actor_id ?? null,
      actor_email: input.actor_email ?? null,
      action: input.action.slice(0, 100),
      target: input.target?.slice(0, 200) ?? null,
      details: input.details ?? {},
      ip,
    });
  } catch { /* swallow */ }
}
