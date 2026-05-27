/*
 * Owner gate. ContractorFlow has TWO admin tiers:
 *
 *   - "admin" (profiles.is_admin = true) — staff with cross-account oversight,
 *     access to /admin/* (curation, users, manual paste, marketplace firehose).
 *
 *   - "owner" — the platform's founder/owner. Only the owner sees Mission
 *     Control, the agent board, the live lead firehose, and the per-agent
 *     approval queue. Configured by email match (OWNER_EMAIL env var + a
 *     hardcoded fallback for the founder).
 *
 * Customers and contractors NEVER see owner surfaces.
 */

const HARDCODED_OWNER_EMAIL = "davichavespb2025@gmail.com";

export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const e = email.toLowerCase().trim();
  const configured = (process.env.OWNER_EMAIL ?? "").toLowerCase().trim();
  return e === HARDCODED_OWNER_EMAIL || (Boolean(configured) && e === configured);
}
