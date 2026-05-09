function read(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function readOptional(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const env = {
  SITE_URL: read("NEXT_PUBLIC_SITE_URL", "http://localhost:3000"),

  SUPABASE_URL: read("NEXT_PUBLIC_SUPABASE_URL", ""),
  SUPABASE_ANON_KEY: read("NEXT_PUBLIC_SUPABASE_ANON_KEY", ""),
  SUPABASE_SERVICE_ROLE_KEY: readOptional("SUPABASE_SERVICE_ROLE_KEY"),

  TWILIO_ACCOUNT_SID: readOptional("TWILIO_ACCOUNT_SID"),
  TWILIO_AUTH_TOKEN: readOptional("TWILIO_AUTH_TOKEN"),
  TWILIO_MESSAGING_SERVICE_SID: readOptional("TWILIO_MESSAGING_SERVICE_SID"),
  TWILIO_FROM_NUMBER: readOptional("TWILIO_FROM_NUMBER"),

  ANTHROPIC_API_KEY: readOptional("ANTHROPIC_API_KEY"),
  OPENAI_API_KEY: readOptional("OPENAI_API_KEY"),

  STRIPE_SECRET_KEY: readOptional("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: readOptional("STRIPE_WEBHOOK_SECRET"),
  STRIPE_PRICE_ID: readOptional("STRIPE_PRICE_ID"),

  WEBHOOK_VERIFY_SIGNATURES:
    (process.env.WEBHOOK_VERIFY_SIGNATURES ?? "true") !== "false"
};
