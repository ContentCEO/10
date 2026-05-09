export type LeadStatus =
  | "not_contacted"
  | "sent"
  | "replied"
  | "booked"
  | "dead";

export const LEAD_STATUSES: LeadStatus[] = [
  "not_contacted",
  "sent",
  "replied",
  "booked",
  "dead",
];

export const STATUS_LABEL: Record<LeadStatus, string> = {
  not_contacted: "Not Contacted",
  sent: "Sent",
  replied: "Replied",
  booked: "Booked",
  dead: "Dead",
};

export const STATUS_COLOR: Record<LeadStatus, string> = {
  not_contacted: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  replied: "bg-amber-100 text-amber-700",
  booked: "bg-emerald-100 text-emerald-700",
  dead: "bg-rose-100 text-rose-700",
};

export type Channel = "sms" | "email";

export interface Lead {
  id: string;
  workspace_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  source: string | null;
  tags: string[] | null;
  status: LeadStatus;
  last_contacted_at: string | null;
  created_at: string;
}

export interface Workspace {
  id: string;
  owner_id: string;
  name: string;
  business_context: string | null;
  stripe_customer_id: string | null;
  plan: string;
  created_at: string;
}

export interface Message {
  id: string;
  workspace_id: string;
  lead_id: string;
  campaign_id: string | null;
  channel: Channel;
  direction: "outbound" | "inbound";
  state: "draft" | "queued" | "sent" | "failed";
  subject: string | null;
  body: string;
  provider_id: string | null;
  error: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface Campaign {
  id: string;
  workspace_id: string;
  name: string;
  channel: Channel;
  goal: string | null;
  tone: string;
  steps: CampaignStep[];
  created_at: string;
}

export interface CampaignStep {
  delay_days: number;
  channel: Channel;
  prompt: string;
}
