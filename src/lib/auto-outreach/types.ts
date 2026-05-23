// Shared types for the Auto-Outreach engine.

export type ScanStatus      = "pending" | "running" | "done" | "error";
export type GenerateStatus  = "pending" | "running" | "done" | "error";
export type OutreachStatus  = "pending" | "queued" | "sent" | "replied" | "converted" | "unsubscribed";
export type SourceKind      = "places" | "manual" | "csv";
export type Channel         = "email" | "sms";
export type AdPlatform      = "google" | "meta";
export type Plan            = "one_time" | "monthly" | "ad_management";

export interface Prospect {
  id: string;
  source: SourceKind;
  google_place_id: string | null;
  business_name: string;
  category: string | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  review_count: number | null;
  scan_status: ScanStatus;
  scan_error: string | null;
  generate_status: GenerateStatus;
  generate_error: string | null;
  outreach_status: OutreachStatus;
  outreach_last_sent_at: string | null;
  claimed_by_user_id: string | null;
  claimed_at: string | null;
  do_not_contact: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScanResult {
  prospect_id: string;
  website_html_size: number | null;
  website_title: string | null;
  website_meta_desc: string | null;
  detected_services: string[];
  detected_colors: string[];
  detected_logos: string[];
  score_speed: number | null;
  score_design: number | null;
  score_seo: number | null;
  score_conversion: number | null;
  score_overall: number | null;
  summary: string;
  weaknesses: string[];
  opportunities: string[];
  competitors: CompetitorBenchmark[];
}

export interface CompetitorBenchmark {
  name: string;
  rating: number | null;
  review_count: number | null;
  has_website: boolean;
  edge: string; // 1-line insight
}

export interface SiteContent {
  theme: {
    primary: string;
    accent: string;
    font: "modern" | "classic" | "bold";
    style: "minimal" | "bold" | "warm";
  };
  hero: {
    headline: string;
    sub: string;
    cta_primary: string;
    cta_secondary?: string;
    badge?: string; // e.g. "Family-Owned · 4.9★ · 312 Reviews"
  };
  services: { title: string; description: string; icon?: string }[];
  about: {
    title: string;
    body: string;
    highlights: string[]; // bulleted trust signals
  };
  reviews: { author: string; quote: string; rating: number }[];
  faq: { q: string; a: string }[];
  contact: {
    phone: string | null;
    email: string | null;
    address: string | null;
    hours?: string;
  };
  cta_banner: {
    headline: string;
    sub: string;
    cta: string;
  };
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
}

export interface AdStrategy {
  platform: AdPlatform;
  monthly_budget_low: number;   // cents
  monthly_budget_high: number;  // cents
  target_audience: string;
  keywords: string[];
  ad_copy: { headline: string; description: string }[];
  landing_strategy: string;
  expected_cpl_low: number;     // cents
  expected_cpl_high: number;    // cents
  rationale: string;
}
