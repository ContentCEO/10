import Papa from "papaparse";

export interface ParsedLeadRow {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  source: string | null;
  tags: string[];
}

const FIELD_ALIASES: Record<keyof Omit<ParsedLeadRow, "tags">, string[]> = {
  first_name: ["first_name", "firstname", "first name", "first", "given name", "fname"],
  last_name: ["last_name", "lastname", "last name", "last", "family name", "surname", "lname"],
  email: ["email", "email address", "e-mail"],
  phone: ["phone", "phone number", "mobile", "cell", "telephone", "tel"],
  company: ["company", "organization", "org", "business", "account"],
  notes: ["notes", "note", "comments", "comment", "details", "description"],
  source: ["source", "lead source", "channel", "origin"],
};

export function parseLeadsCsv(text: string): ParsedLeadRow[] {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  if (result.errors.length) {
    const firstFatal = result.errors.find((e) => e.type !== "FieldMismatch");
    if (firstFatal) throw new Error(`CSV parse error: ${firstFatal.message}`);
  }
  const rows = result.data;
  return rows
    .map((row) => mapRow(row))
    .filter((r) => r.email || r.phone);
}

function mapRow(row: Record<string, string>): ParsedLeadRow {
  const get = (aliases: string[]): string | null => {
    for (const a of aliases) {
      const v = row[a];
      if (v != null && String(v).trim() !== "") return String(v).trim();
    }
    return null;
  };

  let first = get(FIELD_ALIASES.first_name);
  let last = get(FIELD_ALIASES.last_name);
  const fullName = get(["name", "full name", "contact"]);
  if (!first && !last && fullName) {
    const parts = fullName.split(/\s+/);
    first = parts[0] ?? null;
    last = parts.slice(1).join(" ") || null;
  }

  const tagsRaw = get(["tags", "tag", "labels"]);
  const tags = tagsRaw
    ? tagsRaw.split(/[,;|]/).map((t) => t.trim()).filter(Boolean)
    : [];

  return {
    first_name: first,
    last_name: last,
    email: normalizeEmail(get(FIELD_ALIASES.email)),
    phone: normalizePhone(get(FIELD_ALIASES.phone)),
    company: get(FIELD_ALIASES.company),
    notes: get(FIELD_ALIASES.notes),
    source: get(FIELD_ALIASES.source),
    tags,
  };
}

function normalizeEmail(s: string | null): string | null {
  if (!s) return null;
  const v = s.toLowerCase().trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : null;
}

function normalizePhone(s: string | null): string | null {
  if (!s) return null;
  const digits = s.replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits;
}
