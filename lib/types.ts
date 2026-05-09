export type ContentType =
  | "instagram_caption"
  | "reel_idea"
  | "before_after"
  | "promo"
  | "hashtags"
  | "image_prompt";

export type ContentStatus = "draft" | "scheduled" | "published";

export interface BusinessProfile {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  services: string[];
  city: string | null;
  region: string | null;
  brand_tone: string;
  target_audience: string | null;
  unique_selling_points: string | null;
}

export interface ContentItem {
  id: string;
  user_id: string;
  type: ContentType;
  title: string | null;
  body: string;
  hashtags: string | null;
  image_prompt: string | null;
  scheduled_for: string | null;
  status: ContentStatus;
  metadata: Record<string, unknown>;
  created_at: string;
}

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  instagram_caption: "Instagram caption",
  reel_idea: "TikTok / Reel idea",
  before_after: "Before & after",
  promo: "Promotional offer",
  hashtags: "Hashtags",
  image_prompt: "Image prompt",
};
