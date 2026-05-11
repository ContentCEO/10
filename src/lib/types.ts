export type LeadStatus = "new" | "contacted" | "estimate_sent" | "won" | "lost";
export type JobStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
export type InvoiceStatus = "draft" | "sent" | "paid" | "void";
export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete";
export type AccountType = "contractor" | "homeowner";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  business_name: string | null;
  account_type: AccountType;
  credit_cents: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string | null;
  // Public directory
  headline: string | null;
  bio: string | null;
  services: string[];
  service_zips: string[];
  service_cities: string[];
  years_in_business: number | null;
  phone_public: string | null;
  website: string | null;
  logo_url: string | null;
  hero_image_url: string | null;
  is_published: boolean;
  // Revenue / messaging
  google_review_url: string | null;
  payment_link_url: string | null;
  auto_dispatch_enabled: boolean;
  created_at: string;
}

export type RecurringFrequency = "weekly" | "biweekly" | "monthly" | "quarterly";

export const RECURRING_FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  weekly:    "Every week",
  biweekly:  "Every 2 weeks",
  monthly:   "Every month",
  quarterly: "Every 3 months",
};

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  recurring_frequency: RecurringFrequency | null;
  recurring_service: string | null;
  recurring_price: number | null;
  recurring_next_at: string | null;
  recurring_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  user_id: string;
  customer_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  source: string | null;
  service_type: string | null;
  estimated_value: number | null;
  status: LeadStatus;
  notes: string | null;
  ai_score: number | null;
  ai_summary: string | null;
  ai_scored_at: string | null;
  first_responded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  user_id: string;
  customer_id: string | null;
  lead_id: string | null;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: JobStatus;
  price: number | null;
  cost_estimate_cents: number | null;
  cost_actual_cents: number | null;
  review_requested_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FollowUp {
  id: string;
  user_id: string;
  lead_id: string | null;
  customer_id: string | null;
  job_id: string | null;
  title: string;
  notes: string | null;
  due_at: string;
  completed_at: string | null;
  created_at: string;
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  estimate_sent: "Estimate Sent",
  won: "Won",
  lost: "Lost",
};

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent:  "Sent",
  paid:  "Paid",
  void:  "Void",
};

export interface Invoice {
  id: string;
  user_id: string;
  customer_id: string | null;
  job_id: string | null;
  number: string | null;
  amount_cents: number;
  tax_cents: number;
  notes: string | null;
  status: InvoiceStatus;
  issued_at: string;
  due_at: string | null;
  sent_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}
