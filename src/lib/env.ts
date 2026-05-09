export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  anthropicKey: process.env.ANTHROPIC_API_KEY ?? "",
  openaiKey: process.env.OPENAI_API_KEY ?? "",
  stripeSecret: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
export const isAiConfigured = Boolean(env.anthropicKey || env.openaiKey);
export const isStripeConfigured = Boolean(env.stripeSecret && env.stripePriceId);
