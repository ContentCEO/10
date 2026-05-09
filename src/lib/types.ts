export type Business = {
  id: string;
  user_id: string;
  name: string;
  website: string | null;
  category: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string | null;
  phone: string | null;
  gbp_url: string | null;
  primary_keyword: string | null;
  service_area: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type AuditFinding = {
  area: string;
  severity: "critical" | "high" | "medium" | "low";
  issue: string;
  recommendation: string;
};

export type AuditPlanItem = {
  step: number;
  title: string;
  detail: string;
  effort: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
};

export type Audit = {
  id: string;
  business_id: string;
  user_id: string;
  score: number;
  summary: string;
  findings: AuditFinding[];
  plan: AuditPlanItem[];
  created_at: string;
};

export type ChecklistItem = {
  id: string;
  business_id: string;
  title: string;
  category: string | null;
  status: "open" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  notes: string | null;
  updated_at: string;
};

export type Task = {
  id: string;
  business_id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: "todo" | "doing" | "done";
  priority: "low" | "medium" | "high";
  created_at: string;
};

export type Competitor = {
  id: string;
  business_id: string;
  name: string;
  website: string | null;
  gbp_url: string | null;
  notes: string | null;
  created_at: string;
};

export type KeywordIdea = {
  id: string;
  business_id: string;
  keyword: string;
  intent: string | null;
  difficulty: string | null;
  rationale: string | null;
  created_at: string;
};

export type ReviewResponse = {
  id: string;
  business_id: string;
  review_text: string;
  rating: number | null;
  tone: string | null;
  response: string;
  created_at: string;
};
