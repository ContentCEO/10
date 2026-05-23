// Google Places (New) text-search wrapper. Falls back to synthetic prospects
// when GOOGLE_PLACES_API_KEY isn't set so the system is fully demo-able
// without provisioning credentials.

import type { Prospect } from "./types";

export interface DiscoverOptions {
  query: string;          // e.g. "plumbers in Boston, MA"
  category: string;       // free-text trade label stored on the prospect
  maxResults?: number;
}

export interface DiscoveredBusiness {
  google_place_id: string | null;
  business_name: string;
  category: string;
  phone: string | null;
  website_url: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  review_count: number | null;
}

interface PlacesV1Response {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    primaryTypeDisplayName?: { text?: string };
    formattedAddress?: string;
    addressComponents?: Array<{ shortText?: string; longText?: string; types?: string[] }>;
    location?: { latitude?: number; longitude?: number };
    nationalPhoneNumber?: string;
    internationalPhoneNumber?: string;
    websiteUri?: string;
    rating?: number;
    userRatingCount?: number;
  }>;
}

const PLACES_FIELDS =
  "places.id,places.displayName,places.primaryTypeDisplayName,places.formattedAddress," +
  "places.addressComponents,places.location,places.nationalPhoneNumber,places.websiteUri," +
  "places.rating,places.userRatingCount";

export async function discoverFromPlaces(opts: DiscoverOptions): Promise<DiscoveredBusiness[]> {
  const max = Math.min(opts.maxResults ?? 20, 20);
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return synthesizeBusinesses(opts, max);

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": PLACES_FIELDS,
      },
      body: JSON.stringify({ textQuery: opts.query, pageSize: max }),
    });
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.warn(`[launchpad] Places API ${res.status}; falling back to synthetic`);
      return synthesizeBusinesses(opts, max);
    }
    const data = (await res.json()) as PlacesV1Response;
    return (data.places ?? []).map((p) => toBusiness(p, opts.category));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[launchpad] Places fetch failed", e);
    return synthesizeBusinesses(opts, max);
  }
}

function toBusiness(
  p: NonNullable<PlacesV1Response["places"]>[number],
  category: string,
): DiscoveredBusiness {
  const ac = p.addressComponents ?? [];
  const city = ac.find((c) => c.types?.includes("locality"))?.longText ?? null;
  const state = ac.find((c) => c.types?.includes("administrative_area_level_1"))?.shortText ?? null;
  const postal = ac.find((c) => c.types?.includes("postal_code"))?.shortText ?? null;
  return {
    google_place_id: p.id ?? null,
    business_name: p.displayName?.text ?? "(unnamed)",
    category: p.primaryTypeDisplayName?.text ?? category,
    phone: p.nationalPhoneNumber ?? p.internationalPhoneNumber ?? null,
    website_url: p.websiteUri ?? null,
    address: p.formattedAddress ?? null,
    city,
    state,
    postal_code: postal,
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
    rating: p.rating ?? null,
    review_count: p.userRatingCount ?? null,
  };
}

// Deterministic demo data so the dashboard isn't empty in dev / preview.
function synthesizeBusinesses(opts: DiscoverOptions, max: number): DiscoveredBusiness[] {
  const cityMatch = /in\s+([A-Za-z .'-]+?)(?:,|\s*$)/i.exec(opts.query);
  const stateMatch = /,\s*([A-Z]{2})\b/i.exec(opts.query);
  const city  = cityMatch?.[1]?.trim() ?? "Boston";
  const state = stateMatch?.[1]?.toUpperCase() ?? "MA";

  const surnames = ["Anderson","Brooks","Castro","Donovan","Esposito","Fernandez","Galloway","Hernandez","Iverson","Jansen","Kowalski","Linville","Moreno","Nakamura","O'Sullivan","Padilla","Quintero","Reyes","Sanderson","Thatcher"];
  return surnames.slice(0, max).map((n, i) => {
    const slug = n.toLowerCase().replace(/\W+/g, "");
    const placeId = `synthetic_${slug}_${opts.category.toLowerCase().replace(/\W+/g, "_")}`;
    return {
      google_place_id: placeId,
      business_name: `${n} ${titleize(opts.category)}`,
      category: opts.category,
      phone: `+1555${(2000000 + i).toString().padStart(7, "0")}`,
      website_url: i % 3 === 0 ? null : `https://www.${slug}-${opts.category.toLowerCase().replace(/\W+/g, "")}.example.com`,
      address: `${100 + i} Main St, ${city}, ${state}`,
      city,
      state,
      postal_code: `0${2100 + i}`,
      lat: 42.36 + i * 0.001,
      lng: -71.06 + i * 0.001,
      rating: round1(3.4 + (i % 7) * 0.2),
      review_count: 8 + i * 11,
    };
  });
}

function titleize(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function toProspectInsert(b: DiscoveredBusiness): Partial<Prospect> {
  return {
    source: "places",
    google_place_id: b.google_place_id,
    business_name: b.business_name,
    category: b.category,
    phone: b.phone,
    website_url: b.website_url,
    address: b.address,
    city: b.city,
    state: b.state,
    postal_code: b.postal_code,
    lat: b.lat,
    lng: b.lng,
    rating: b.rating,
    review_count: b.review_count,
  };
}
