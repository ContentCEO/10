export type Plan = "free" | "starter" | "pro";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  plan: Plan;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  monthly_generations_used: number;
  monthly_generations_reset_at: string;
};

export type Business = {
  id: string;
  user_id: string;
  name: string;
  industry: string | null;
  website: string | null;
  description: string | null;
  target_audience: string | null;
  brand_voice: string | null;
  unique_value_prop: string | null;
};

export type Product = {
  id: string;
  business_id: string;
  user_id: string;
  name: string;
  description: string | null;
  price: string | null;
  features: string | null;
  benefits: string | null;
  pain_points: string | null;
};

export type Offer = {
  id: string;
  product_id: string;
  user_id: string;
  headline: string;
  details: string | null;
  cta: string | null;
  guarantee: string | null;
  urgency: string | null;
  bonus: string | null;
};

export type CampaignStructure = {
  campaign: {
    name: string;
    objective: string;
    budget_suggestion: string;
  };
  ad_sets: Array<{
    name: string;
    audience: string;
    placements: string[];
    budget_split: string;
  }>;
  testing_plan: string;
  kpis: string[];
};

export type AdCreative = {
  id?: string;
  variant_label: string;
  angle: string;
  headline: string;
  primary_text: string;
  description: string;
  hook: string;
  cta: string;
  image_prompt: string;
  video_script: string;
};

export type GenerateAdsResponse = {
  creatives: AdCreative[];
  campaign_structure: CampaignStructure;
};
