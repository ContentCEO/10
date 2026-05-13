import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { WelcomeWizard } from "@/components/WelcomeWizard";
import { FloatingHelp } from "@/components/FloatingHelp";
import { Toaster } from "@/components/Toaster";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { AppTopBar } from "@/components/AppTopBar";
import { PreferencesApplier } from "@/components/PreferencesApplier";
import { isOwnerEmail } from "@/lib/owner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type,is_admin,business_name,services")
    // is_admin selected so we can show admin-only sidebar items
    .eq("id", user.id)
    .single();
  if (profile?.account_type === "homeowner") redirect("/home");
  if (profile?.account_type === "employee")  redirect("/work");
  if (profile?.account_type === "agency")    redirect("/agency");

  const alreadyOnboarded = Boolean(
    profile?.business_name && Array.isArray(profile?.services) && profile.services.length > 0,
  );

  return (
    <div className="min-h-screen flex bg-ink-50">
      <Sidebar
        email={user.email ?? null}
        isAdmin={Boolean(profile?.is_admin)}
        isOwner={isOwnerEmail(user.email)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <AppTopBar />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>
      <MobileNav />
      <FloatingHelp />
      <Toaster />
      <KeyboardShortcuts />
      <PreferencesApplier />
      <WelcomeWizard
        userId={user.id}
        initialBusinessName={profile?.business_name ?? null}
        alreadyOnboarded={alreadyOnboarded}
      />
    </div>
  );
}
