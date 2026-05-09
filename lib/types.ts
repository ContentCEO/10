export type MissedOpportunity = {
  moment: string;
  what_happened: string;
  better_response: string;
};

export type ObjectionAnalysis = {
  objection: string;
  category: string;
  rep_handled_well: boolean;
  recommended_response: string;
};

export type CallAnalysis = {
  score: number;
  close_probability: number;
  summary: string;
  strengths: string[];
  missed_opportunities: MissedOpportunity[];
  objections: ObjectionAnalysis[];
  next_steps: string[];
  followup_email: string;
  followup_sms: string;
};

export type CallRow = {
  id: string;
  user_id: string;
  title: string | null;
  prospect_name: string | null;
  job_type: string | null;
  transcript: string;
  score: number | null;
  close_probability: number | null;
  summary: string | null;
  strengths: string[] | null;
  missed_opportunities: MissedOpportunity[] | null;
  objections: ObjectionAnalysis[] | null;
  followup_email: string | null;
  followup_sms: string | null;
  next_steps: string[] | null;
  raw_response: unknown;
  created_at: string;
};
