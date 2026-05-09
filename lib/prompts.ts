import type { BusinessProfile, ContentType } from "./types";

export function profileSummary(p: BusinessProfile): string {
  const services = p.services?.length ? p.services.join(", ") : "general services";
  const location = [p.city, p.region].filter(Boolean).join(", ") || "local area";
  return [
    `Business name: ${p.business_name}`,
    `Type: ${p.business_type}`,
    `Services: ${services}`,
    `Location: ${location}`,
    `Brand tone: ${p.brand_tone}`,
    p.target_audience ? `Audience: ${p.target_audience}` : null,
    p.unique_selling_points ? `USPs: ${p.unique_selling_points}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export const SYSTEM_PROMPT = `You are LocalContent AI, an expert social media strategist for local small businesses (salons, gyms, restaurants, contractors, dentists, real-estate agents, etc.).

Rules:
- Write in the brand tone specified by the user.
- Reference the business location naturally when it fits.
- Be specific to the business's services — never generic.
- Captions stay under 220 words and use 1-3 well-placed emojis only when it fits the tone.
- Hashtags: mix 5 niche, 5 local, 5 broad — no banned or spammy tags.
- Reels: punchy hook in the first 3 seconds, simple shot list a phone can film.
- When asked for JSON, respond with valid JSON only. No prose, no markdown fences.`;

export interface SinglePrompt {
  user: string;
  maxTokens: number;
}

export function singlePrompt(
  type: ContentType,
  profile: BusinessProfile,
  extra?: string,
): SinglePrompt {
  const ctx = profileSummary(profile);
  switch (type) {
    case "instagram_caption":
      return {
        maxTokens: 600,
        user: `Business profile:\n${ctx}\n\nWrite ONE Instagram caption${
          extra ? ` about: ${extra}` : ""
        }. Include a clear hook, value, and a soft CTA. End with 10-15 relevant hashtags on a new line.`,
      };
    case "reel_idea":
      return {
        maxTokens: 600,
        user: `Business profile:\n${ctx}\n\nGive ONE TikTok / Reel idea${
          extra ? ` about: ${extra}` : ""
        }. Format:\nHook:\nShot list (3-5 shots):\nOn-screen text:\nCaption:\nTrending audio suggestion:`,
      };
    case "before_after":
      return {
        maxTokens: 500,
        user: `Business profile:\n${ctx}\n\nWrite a before-and-after post caption${
          extra ? ` for: ${extra}` : ""
        }. Lead with the transformation, mention the service, and end with a CTA to book.`,
      };
    case "promo":
      return {
        maxTokens: 500,
        user: `Business profile:\n${ctx}\n\nWrite ONE promotional offer post${
          extra ? ` (${extra})` : ""
        }. Include the offer, a deadline-style urgency, and a CTA. Keep it ethical — no fake scarcity.`,
      };
    case "hashtags":
      return {
        maxTokens: 400,
        user: `Business profile:\n${ctx}\n\nReturn 15 hashtags as a single space-separated line: 5 niche, 5 local, 5 broad. No commentary.`,
      };
    case "image_prompt":
      return {
        maxTokens: 300,
        user: `Business profile:\n${ctx}\n\nWrite ONE detailed image-generation prompt${
          extra ? ` for: ${extra}` : ""
        } that an AI image model can use. Describe subject, setting, lighting, lens, and mood. One paragraph, no lists.`,
      };
  }
}

export interface PlannedItem {
  day: number;
  type: ContentType;
  title: string;
  body: string;
  hashtags?: string;
  image_prompt?: string;
}

export function monthlyPlanPrompt(profile: BusinessProfile): SinglePrompt {
  return {
    maxTokens: 8000,
    user: `Business profile:\n${profileSummary(
      profile,
    )}\n\nGenerate a 30-day social media content calendar. Mix post types so the feed feels varied:\n- 12 instagram_caption\n- 8 reel_idea\n- 4 before_after\n- 4 promo\n- 2 image_prompt\nVary topics; reference the business's services and location naturally.\n\nReturn JSON only matching this shape — no markdown, no commentary:\n{\n  "items": [\n    {\n      "day": 1,\n      "type": "instagram_caption" | "reel_idea" | "before_after" | "promo" | "image_prompt",\n      "title": "short label",\n      "body": "the post body / idea",\n      "hashtags": "space separated hashtags (only for instagram_caption / before_after / promo)",\n      "image_prompt": "optional image prompt"\n    }\n  ]\n}\nReturn exactly 30 items, day 1 through 30.`,
  };
}
