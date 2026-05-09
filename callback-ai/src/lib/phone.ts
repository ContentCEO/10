/**
 * Best-effort E.164 normalization for US/CA numbers. Twilio always sends E.164,
 * so this is mostly defensive — for storage consistency.
 */
export function normalizePhone(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith("+")) return trimmed.replace(/[^\d+]/g, "");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}
