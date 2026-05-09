import type { AdCreative } from "./types";

const HEADERS = [
  "variant_label",
  "angle",
  "headline",
  "primary_text",
  "description",
  "hook",
  "cta",
  "image_prompt",
  "video_script",
] as const;

function escape(field: string): string {
  if (field == null) return "";
  const str = String(field);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function creativesToCsv(creatives: AdCreative[]): string {
  const rows = [HEADERS.join(",")];
  for (const c of creatives) {
    rows.push(HEADERS.map((h) => escape((c as any)[h] ?? "")).join(","));
  }
  return rows.join("\n");
}
