/**
 * In-memory dev store. Used as a fallback when Supabase is not configured so
 * the MVP is fully usable on a fresh clone with zero env vars.
 */
import type {
  Audit,
  Business,
  ChecklistItem,
  Competitor,
  KeywordIdea,
  ReviewResponse,
  Task,
} from "@/lib/types";

type Db = {
  businesses: Business[];
  audits: Audit[];
  checklist: ChecklistItem[];
  tasks: Task[];
  competitors: Competitor[];
  keywords: KeywordIdea[];
  reviews: ReviewResponse[];
};

const g = globalThis as unknown as { __localrank?: Db };

export function db(): Db {
  if (!g.__localrank) {
    g.__localrank = {
      businesses: [],
      audits: [],
      checklist: [],
      tasks: [],
      competitors: [],
      keywords: [],
      reviews: [],
    };
  }
  return g.__localrank;
}

export const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

export function uid(): string {
  return crypto.randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}
