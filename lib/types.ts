export type Role = "receptionist" | "sales" | "estimator" | "support";

export type Service = {
  name: string;
  description?: string;
  price_range?: string;
};

export type FAQ = { question: string; answer: string };
export type Policy = { title: string; body: string };

export type Pricing = {
  labor_rate?: string;
  minimum?: string;
  notes?: string;
};

export type AIEmployee = {
  id: string;
  org_id: string;
  role: Role;
  name: string;
  business_name?: string | null;
  business_phone?: string | null;
  business_email?: string | null;
  business_address?: string | null;
  business_hours?: string | null;
  service_area?: string | null;
  about?: string | null;
  greeting?: string | null;
  tone?: string | null;
  services: Service[];
  pricing: Pricing;
  faqs: FAQ[];
  policies: Policy[];
  lead_fields: string[];
  is_published: boolean;
  public_slug: string | null;
  widget_color: string | null;
  created_at: string;
  updated_at: string;
};

export type Organization = {
  id: string;
  owner_id: string;
  name: string;
  plan: "free" | "starter" | "pro";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

export type Conversation = {
  id: string;
  ai_employee_id: string;
  visitor_token: string;
  channel: "web" | "widget" | "sms";
  source_url: string | null;
  created_at: string;
  last_message_at: string;
};

export type Lead = {
  id: string;
  ai_employee_id: string;
  conversation_id: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  service: string | null;
  address: string | null;
  timeline: string | null;
  notes: string | null;
  status: "new" | "contacted" | "qualified" | "won" | "lost";
  qualification: {
    score?: number;
    reason?: string;
    suggested_next_step?: string;
  } | null;
  created_at: string;
};
