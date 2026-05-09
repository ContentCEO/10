export type UserRole = "admin" | "customer";

export type Profile = {
  id: string;
  role: UserRole;
  full_name: string | null;
  email: string;
  phone: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  stripe_customer_id: string | null;
  created_at: string;
};

export type Plan = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  interval: "month" | "year";
  stripe_price_id: string | null;
  visits_per_year: number;
  features: string[];
  active: boolean;
  created_at: string;
};

export type SubscriptionStatus =
  | "incomplete"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "paused";

export type Subscription = {
  id: string;
  customer_id: string;
  plan_id: string | null;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
};

export type RequestStatus =
  | "submitted"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "canceled";

export type RequestPriority = "low" | "normal" | "high" | "urgent";

export type ServiceRequest = {
  id: string;
  customer_id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: RequestPriority;
  status: RequestStatus;
  preferred_date: string | null;
  preferred_time_window: string | null;
  address: string | null;
  created_at: string;
};

export type JobStatus =
  | "scheduled"
  | "en_route"
  | "in_progress"
  | "completed"
  | "canceled";

export type Job = {
  id: string;
  service_request_id: string | null;
  customer_id: string;
  technician_name: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: JobStatus;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
};

export type ReminderChannel = "email" | "sms" | "both";
export type ReminderStatus = "pending" | "sent" | "failed";

export type MaintenanceReminder = {
  id: string;
  customer_id: string;
  title: string;
  body: string | null;
  send_at: string;
  channel: ReminderChannel;
  status: ReminderStatus;
  sent_at: string | null;
  created_at: string;
};

export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";

export type Payment = {
  id: string;
  customer_id: string;
  subscription_id: string | null;
  amount_cents: number;
  currency: string;
  status: PaymentStatus;
  stripe_invoice_id: string | null;
  stripe_payment_intent_id: string | null;
  description: string | null;
  paid_at: string | null;
  created_at: string;
};

export type InvoiceStatus = "draft" | "open" | "paid" | "void";

export type Invoice = {
  id: string;
  number: string;
  customer_id: string;
  job_id: string | null;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  status: InvoiceStatus;
  notes: string | null;
  due_date: string | null;
  issued_at: string;
  paid_at: string | null;
};

export type InvoiceLineItem = {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
};
