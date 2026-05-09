import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("user_id", user!.id)
    .maybeSingle();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Business profile</h1>
      <p className="mt-1 text-slate-600">
        Tell us about your business — every post is generated from this.
      </p>
      <div className="mt-6 card">
        <ProfileForm initial={profile ?? null} />
      </div>
    </div>
  );
}
