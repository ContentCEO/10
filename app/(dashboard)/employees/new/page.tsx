import { EmployeeWizard } from "@/components/EmployeeWizard";

export default function NewEmployeePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-slate-900">Create AI Employee</h1>
      <p className="mt-1 text-sm text-slate-600">
        We&apos;ll start with the AI Receptionist for contractors. You can edit
        anything later.
      </p>
      <div className="mt-8">
        <EmployeeWizard />
      </div>
    </div>
  );
}
