import { requireOrg } from "@/lib/auth";

export default async function SettingsPage() {
  const { org, user } = await requireOrg();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>

      <section className="card p-5">
        <h2 className="text-sm font-semibold text-slate-900">Workspace</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <Row k="Name" v={org.name} />
          <Row k="Plan" v={org.plan} />
        </dl>
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-semibold text-slate-900">Account</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <Row k="Email" v={user.email ?? "—"} />
          <Row k="User ID" v={user.id} />
        </dl>
      </section>
    </div>
  );
}

function Row({ k, v }: { k: string; v?: string | null }) {
  return (
    <div className="flex gap-3">
      <dt className="w-28 shrink-0 text-slate-500">{k}</dt>
      <dd className="text-slate-900">{v || "—"}</dd>
    </div>
  );
}
