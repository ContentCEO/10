"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function signupAction(formData: FormData) {
  const email         = String(formData.get("email")         ?? "").trim().toLowerCase();
  const password      = String(formData.get("password")      ?? "");
  const businessName  = String(formData.get("business_name") ?? "").trim();
  const plan          = String(formData.get("plan")          ?? "").trim();

  if (!email || !password || !businessName) {
    redirect(`/signup?error=${encodeURIComponent("All fields are required")}`);
  }
  if (password.length < 8) {
    redirect(`/signup?error=${encodeURIComponent("Password must be at least 8 characters")}`);
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { business_name: businessName, source: "marketplace_signup" },
    },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  // Best-effort: create the contractor's profile row immediately so the
  // dashboard has business_name to show. Failures here are non-fatal —
  // the dashboard falls back to email if profile is missing.
  try {
    if (data.user?.id) {
      const admin = createAdminClient();
      await admin.from("profiles").upsert({
        id:            data.user.id,
        email,
        business_name: businessName,
        role:          "contractor",
      }, { onConflict: "id" });
    }
  } catch {
    // ignore — non-blocking
  }

  // If they came in via a pricing CTA, take them straight to checkout for that plan.
  if (plan === "starter" || plan === "growth" || plan === "pro") {
    redirect(`/dashboard?welcome=1&plan=${plan}`);
  }

  redirect("/dashboard?welcome=1");
}
