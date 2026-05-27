// Top-up packs (cents). Bigger packs give bonus credit to encourage commitment.
export const TOPUP_PACKS = [
  { id: "starter", price_cents: 2500,  credit_cents: 2500,  label: "$25",  bonus: 0   },
  { id: "growth",  price_cents: 5000,  credit_cents: 5500,  label: "$50",  bonus: 500 },
  { id: "pro",     price_cents: 10000, credit_cents: 11500, label: "$100", bonus: 1500 },
  { id: "scale",   price_cents: 25000, credit_cents: 30000, label: "$250", bonus: 5000 },
] as const;

export type TopupPackId = (typeof TOPUP_PACKS)[number]["id"];

export function getPack(id: string) {
  return TOPUP_PACKS.find((p) => p.id === id) ?? null;
}

export function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}
