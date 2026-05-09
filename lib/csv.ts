import type { ContentItem } from "./types";

const HEADER = [
  "id",
  "type",
  "title",
  "body",
  "hashtags",
  "image_prompt",
  "scheduled_for",
  "status",
  "created_at",
];

function escape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v).replace(/\r?\n/g, " ");
  return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(items: ContentItem[]): string {
  const rows = items.map((i) =>
    [
      i.id,
      i.type,
      i.title ?? "",
      i.body,
      i.hashtags ?? "",
      i.image_prompt ?? "",
      i.scheduled_for ?? "",
      i.status,
      i.created_at,
    ]
      .map(escape)
      .join(","),
  );
  return [HEADER.join(","), ...rows].join("\n");
}
