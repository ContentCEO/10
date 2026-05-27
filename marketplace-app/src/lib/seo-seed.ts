// Seed list for programmatic local-SEO landing pages. Services × cities =
// each combination gets a /local/<service>/<city> page that Next.js renders
// on demand and caches for 24 hours.

export const SERVICES = [
  "kitchen-remodel",
  "bathroom-remodel",
  "deck-builder",
  "roofing",
  "siding",
  "windows",
  "flooring",
  "painting",
  "general-contractor",
  "hvac",
  "plumber",
  "electrician",
  "fence-installation",
  "house-cleaning",
  "deep-cleaning",
  "post-construction-cleaning",
  "landscaping",
  "tree-service",
  "concrete-driveway",
  "basement-finishing",
];

export const MA_CITIES = [
  "boston", "cambridge", "somerville", "worcester", "springfield",
  "lowell", "brockton", "quincy", "lynn", "new-bedford",
  "fall-river", "newton", "lawrence", "framingham", "waltham",
  "haverhill", "malden", "brookline", "plymouth", "medford",
  "taunton", "chicopee", "weymouth", "revere", "peabody",
  "methuen", "barnstable", "pittsfield", "attleboro", "arlington",
  "salem", "everett", "westfield", "leominster", "fitchburg",
  "beverly", "holyoke", "marlborough", "woburn", "amherst",
  "chelsea", "braintree", "natick", "randolph", "watertown",
  "franklin", "lexington", "milford", "norwood", "andover",
  "needham", "wellesley", "concord", "winchester", "acton",
  "sudbury", "hudson", "stow", "carlisle", "boxborough",
];

export interface SeedRow {
  service: string;       // slug
  city: string;          // slug
  service_label: string; // titled
  city_label: string;    // titled
}

function titleCase(slug: string) {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export function allSeedPairs(): SeedRow[] {
  const rows: SeedRow[] = [];
  for (const s of SERVICES) {
    for (const c of MA_CITIES) {
      rows.push({
        service: s, city: c,
        service_label: titleCase(s),
        city_label: titleCase(c),
      });
    }
  }
  return rows;
}
