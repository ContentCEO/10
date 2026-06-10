export type CredentialKind = "license" | "insurance" | "certification" | "bonded";

export const CREDENTIAL_LABELS: Record<CredentialKind, string> = {
  license:       "License",
  insurance:     "Insurance",
  certification: "Certification",
  bonded:        "Bonded",
};

export interface ContractorCredential {
  id: string;
  contractor_id: string;
  kind: CredentialKind;
  name: string;
  number: string | null;
  issuer: string | null;
  expires_at: string | null;
  document_url: string | null;
  created_at: string;
}

export interface ContractorPhoto {
  id: string;
  contractor_id: string;
  url: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

export interface ContractorReview {
  id: string;
  contractor_id: string;
  reviewer_name: string;
  rating: number;
  title: string | null;
  body: string;
  project_type: string | null;
  verified: boolean;
  created_at: string;
}

export interface DirectoryProfile {
  id: string;
  business_name: string | null;
  headline: string | null;
  bio: string | null;
  services: string[];
  service_zips: string[];
  service_cities: string[];
  years_in_business: number | null;
  phone_public: string | null;
  website: string | null;
  logo_url: string | null;
  hero_image_url: string | null;
  is_published: boolean;
}

export function averageRating(reviews: { rating: number }[]) {
  if (!reviews.length) return null;
  return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
}
