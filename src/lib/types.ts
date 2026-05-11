export type LeadStatus = "new" | "contacted" | "estimate_sent" | "won" | "lost";
export type JobStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
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
  created_at: string;
}

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
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
