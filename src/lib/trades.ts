/*
 * Trade definitions. Each trade has a slug, label, plural, keywords for
 * auto-detection, and a value-prop for the recruitment landing page.
 */

export interface Trade {
  slug: string;
  label: string;
  labelPlural: string;
  keywords: string[];   // matched case-insensitively against service_type + notes
  hero: string;
  bullets: string[];
}

export const TRADES: Trade[] = [
  {
    slug: "electricians",
    label: "Electrician",
    labelPlural: "Electricians",
    keywords: [
      "electric", "electrical", "electrician", "wiring", "rewire", "outlet",
      "panel", "panel upgrade", "200 amp", "ev charger", "level 2",
      "ceiling fan", "recessed light", "fixture", "lighting", "gfci", "afci",
      "smoke detector", "generator", "transfer switch", "knob and tube",
    ],
    hero: "MA homeowners need electricians. We send you the leads.",
    bullets: [
      "Real residential leads — name, phone, address — every weekday",
      "Permits + form-fills + skip-traced property owners",
      "No bidding wars — leads delivered exclusive to you in your zip",
      "Cancel anytime — pay per lead, not per month",
    ],
  },
  {
    slug: "plumbers",
    label: "Plumber",
    labelPlural: "Plumbers",
    keywords: [
      "plumb", "plumber", "plumbing", "leak", "water heater", "tankless",
      "drain", "drain cleaning", "clog", "toilet", "faucet", "sink",
      "sewer", "sump pump", "garbage disposal", "boiler", "shower install",
      "tub install", "re-pipe", "repipe", "gas line",
    ],
    hero: "MA homeowners with leaks, clogs, and water heaters need you.",
    bullets: [
      "Emergency + non-emergency leads, prioritized by urgency",
      "Direct phone numbers — no platform middleman",
      "Permit-triggered leads for major fixture installs",
      "Same-day notifications for urgent jobs",
    ],
  },
  {
    slug: "hvac",
    label: "HVAC pro",
    labelPlural: "HVAC pros",
    keywords: [
      "hvac", "ac unit", "central air", "ductless", "mini split",
      "furnace", "heat pump", "duct", "ductwork", "thermostat",
      "heating", "cooling", "ac install", "boiler",
    ],
    hero: "MA homeowners replacing furnaces, heat pumps, and AC need you.",
    bullets: [
      "Seasonal surge leads (winter heat outages, summer AC failures)",
      "New-install leads from major remodels + additions",
      "Heat pump rebate-eligibility leads (IRA tax credit demand)",
      "Annual maintenance plan opportunities",
    ],
  },
  {
    slug: "roofers",
    label: "Roofer",
    labelPlural: "Roofers",
    keywords: [
      "roof", "roofing", "roofer", "shingle", "metal roof", "slate",
      "asphalt", "gutter", "soffit", "fascia", "chimney", "skylight",
      "ice dam", "storm damage",
    ],
    hero: "MA roof-replacement and storm-damage leads, delivered exclusive.",
    bullets: [
      "Storm-triggered surge leads after wind + hail events",
      "Insurance claim leads where homeowner needs a roofer FAST",
      "Permit-pulled leads from roofing permits across MA cities",
      "Average MA roof job: $9k–$28k — high margin per lead",
    ],
  },
  {
    slug: "painters",
    label: "Painter",
    labelPlural: "Painters",
    keywords: [
      "paint", "painter", "painting", "interior paint", "exterior paint",
      "trim", "wallpaper", "color", "primer",
    ],
    hero: "MA homeowners need painters — interior, exterior, both.",
    bullets: [
      "Pre-listing prep paint leads from real-estate signals",
      "New-mover leads — fresh houses need fresh colors",
      "Multi-room interior projects + full exterior",
      "Quick-turn jobs (1–5 days typical)",
    ],
  },
  {
    slug: "flooring",
    label: "Flooring installer",
    labelPlural: "Flooring installers",
    keywords: [
      "floor", "flooring", "hardwood", "refinish", "tile", "carpet",
      "luxury vinyl", "lvp", "lvt", "laminate", "engineered wood",
    ],
    hero: "MA homeowners doing hardwood, LVP, tile — we send the leads.",
    bullets: [
      "Whole-home flooring replacement leads",
      "Refinish + repair leads",
      "Rental turnover flooring jobs (high volume)",
      "New-construction leads from builder partnerships",
    ],
  },
  {
    slug: "general-contractors",
    label: "General contractor",
    labelPlural: "General contractors",
    keywords: [
      "general contractor", "remodel", "renovation", "renovate", "addition",
      "construction", "build", "rebuild", "kitchen", "bathroom", "basement",
      "framing", "drywall", "second story", "in-law",
    ],
    hero: "MA homeowners planning kitchens, baths, and additions need you.",
    bullets: [
      "High-ticket projects: $15k–$200k+ per job",
      "Kitchen + bathroom remodel leads (highest residential volume)",
      "Addition + basement-finish leads",
      "Permit-triggered leads with budget signals built in",
    ],
  },
  {
    slug: "siding",
    label: "Siding installer",
    labelPlural: "Siding installers",
    keywords: [
      "siding", "vinyl siding", "fiber cement", "stucco", "hardie",
      "exterior", "cladding",
    ],
    hero: "MA siding replacement leads — vinyl, fiber cement, repair.",
    bullets: [
      "Full-replacement leads ($7k–$25k jobs)",
      "Storm-damage triggered leads",
      "New-construction siding partnerships",
      "Color-match repair leads",
    ],
  },
  {
    slug: "concrete-masonry",
    label: "Concrete & masonry pro",
    labelPlural: "Concrete & masonry pros",
    keywords: [
      "concrete", "masonry", "brick", "stone", "stonework", "foundation",
      "driveway", "asphalt", "paver", "walkway", "patio", "retaining wall",
      "chimney",
    ],
    hero: "MA driveway, foundation, patio, and chimney leads.",
    bullets: [
      "Driveway replacement leads (high volume in MA)",
      "Foundation repair leads (older MA housing stock)",
      "Patio + walkway leads",
      "Chimney + brickwork leads",
    ],
  },
  {
    slug: "landscapers",
    label: "Landscaper",
    labelPlural: "Landscapers",
    keywords: [
      "landscape", "landscaping", "lawn", "mowing", "mulch", "sod",
      "tree", "tree removal", "stump", "garden", "hedge", "shrub",
      "irrigation", "sprinkler",
    ],
    hero: "MA landscaping, tree, and lawn-care leads — recurring revenue.",
    bullets: [
      "Subscription lawn-care leads (recurring revenue)",
      "Tree removal + emergency leads after storms",
      "Hardscape leads (patios, walkways, retaining walls)",
      "Seasonal cleanup leads (spring + fall)",
    ],
  },
  {
    slug: "cleaners",
    label: "Cleaning service",
    labelPlural: "Cleaning services",
    keywords: [
      "clean", "cleaning", "deep clean", "house clean", "move out clean",
      "move in clean", "post-construction", "carpet cleaning",
      "upholstery", "pressure wash", "power wash",
    ],
    hero: "MA cleaning leads — recurring residential + one-time jobs.",
    bullets: [
      "Recurring weekly/biweekly cleaning leads (subscription revenue)",
      "Move-in / move-out cleaning leads",
      "Post-construction cleaning leads",
      "Pre-listing cleaning partnerships with realtors",
    ],
  },
];

const TRADE_BY_SLUG: Record<string, Trade> = Object.fromEntries(TRADES.map((t) => [t.slug, t]));

export function getTrade(slug: string): Trade | null {
  return TRADE_BY_SLUG[slug] ?? null;
}

/*
 * Classify a lead into one of the trades by scanning text. Returns the
 * matched trade slug, or "general-contractors" as a sensible default.
 * Used as the in-memory fallback when marketplace_leads doesn't have a
 * trade_tag column populated.
 */
export function classifyTrade(text: string | null | undefined): string {
  if (!text) return "general-contractors";
  const lower = text.toLowerCase();

  // Score each trade by how many of its keywords appear, weighted by length.
  // Longer keywords are more specific so they beat shorter ones.
  let bestSlug = "general-contractors";
  let bestScore = 0;
  for (const trade of TRADES) {
    let score = 0;
    for (const kw of trade.keywords) {
      if (lower.includes(kw)) {
        score += kw.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestSlug = trade.slug;
    }
  }
  return bestSlug;
}
