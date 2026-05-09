import { requireCustomer } from "@/lib/auth";
import ProfileForm from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await requireCustomer();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
      <div className="card p-6">
        <ProfileForm profile={profile} />
      </div>
    </div>
  );
}
