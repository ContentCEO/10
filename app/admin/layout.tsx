import { requireAdmin } from "@/lib/auth";
import Shell from "@/components/Shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin();
  return (
    <Shell
      title="Admin"
      user={{ name: profile.full_name, email: profile.email }}
      nav={[
        { href: "/admin", label: "Overview" },
        { href: "/admin/customers", label: "Customers" },
        { href: "/admin/requests", label: "Service requests" },
        { href: "/admin/jobs", label: "Jobs" },
        { href: "/admin/plans", label: "Plans" },
        { href: "/admin/payments", label: "Payments" },
        { href: "/admin/invoices", label: "Invoices" },
        { href: "/admin/reminders", label: "Reminders" }
      ]}
    >
      {children}
    </Shell>
  );
}
