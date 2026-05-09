import { requireCustomer } from "@/lib/auth";
import Shell from "@/components/Shell";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireCustomer();
  return (
    <Shell
      title="My Membership"
      user={{ name: profile.full_name, email: profile.email }}
      nav={[
        { href: "/portal", label: "Overview" },
        { href: "/portal/membership", label: "Membership" },
        { href: "/portal/requests", label: "Service requests" },
        { href: "/portal/appointments", label: "Appointments" },
        { href: "/portal/invoices", label: "Invoices" },
        { href: "/portal/profile", label: "Profile" }
      ]}
    >
      {children}
    </Shell>
  );
}
