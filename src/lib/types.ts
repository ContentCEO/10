export type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
};

export type PaymentMilestone = {
  id: string;
  label: string;
  percent: number;
  amount: number;
  due: string;
};

export type TimelinePhase = {
  id: string;
  phase: string;
  start: string;
  end: string;
  notes?: string;
};

export type ProposalPhoto = {
  path: string;
  url: string;
  name: string;
};

export type Proposal = {
  id: string;
  user_id: string;
  client_name: string;
  client_email: string | null;
  client_address: string | null;
  project_type: string | null;
  scope: string | null;
  measurements: string | null;
  materials: string | null;
  labor: string | null;
  notes: string | null;
  generated_text: string | null;
  line_items: LineItem[];
  payment_schedule: PaymentMilestone[];
  timeline: TimelinePhase[];
  terms: string | null;
  total_amount: number;
  status: "draft" | "sent" | "accepted" | "declined";
  photos: ProposalPhoto[];
  created_at: string;
  updated_at: string;
};

export type ProposalDraftInput = Pick<
  Proposal,
  | "client_name"
  | "client_email"
  | "client_address"
  | "project_type"
  | "scope"
  | "measurements"
  | "materials"
  | "labor"
  | "notes"
>;
