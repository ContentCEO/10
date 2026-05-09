"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import { createEmployee, type CreateEmployeeInput } from "@/app/(dashboard)/employees/new/actions";
import type { FAQ, Policy, Service } from "@/lib/types";

const ROLES = [
  {
    id: "receptionist",
    title: "AI Receptionist",
    body: "Greets visitors, answers questions, qualifies leads, books appointments.",
    available: true,
  },
  {
    id: "sales",
    title: "Sales Rep",
    body: "Follows up, sends quotes, books demos.",
    available: false,
  },
  {
    id: "estimator",
    title: "Estimator",
    body: "Quotes from your price book and scope.",
    available: false,
  },
  {
    id: "support",
    title: "Support Agent",
    body: "Answers FAQs and tier-1 tickets.",
    available: false,
  },
] as const;

const STEPS = ["Role", "Business", "Services", "Pricing", "FAQs", "Policies", "Voice"] as const;

const RECEPTIONIST_DEFAULT_FAQS: FAQ[] = [
  {
    question: "Do you offer free estimates?",
    answer:
      "Yes — we provide free, no-obligation estimates for most projects. I can book one for you right now.",
  },
  {
    question: "What areas do you serve?",
    answer: "We typically serve the local metro area. Tell me your zip code and I can confirm.",
  },
  {
    question: "Are you licensed and insured?",
    answer: "Yes, we are fully licensed and insured.",
  },
];

export function EmployeeWizard() {
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<CreateEmployeeInput>({
    role: "receptionist",
    name: "Riley — AI Receptionist",
    business_name: "",
    business_phone: "",
    business_email: "",
    business_address: "",
    business_hours: "Mon–Fri 8am–6pm",
    service_area: "",
    about: "",
    greeting:
      "Hi there! I'm Riley, the virtual receptionist. How can I help you today?",
    tone: "friendly-professional",
    services: [
      { name: "Kitchen remodel", price_range: "$15k–$60k" },
      { name: "Bathroom remodel", price_range: "$8k–$30k" },
      { name: "Deck build", price_range: "$5k–$20k" },
    ],
    pricing: { labor_rate: "", minimum: "$500", notes: "" },
    faqs: RECEPTIONIST_DEFAULT_FAQS,
    policies: [
      {
        title: "Estimates",
        body: "Free, no-obligation estimates. Visits are scheduled within 3–5 business days.",
      },
    ],
  });

  function patch<K extends keyof CreateEmployeeInput>(
    key: K,
    value: CreateEmployeeInput[K],
  ) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function onSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        await createEmployee(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <div>
      <ol className="mb-6 flex flex-wrap gap-2 text-xs">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={clsx(
              "rounded-full px-3 py-1 font-medium",
              i === step
                ? "bg-brand-600 text-white"
                : i < step
                  ? "bg-brand-100 text-brand-700"
                  : "bg-slate-100 text-slate-500",
            )}
          >
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      <div className="card p-6">
        {step === 0 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Pick a role</h2>
            <p className="mt-1 text-sm text-slate-600">
              Only the AI Receptionist is available today. More are coming soon.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  disabled={!r.available}
                  onClick={() => patch("role", r.id as CreateEmployeeInput["role"])}
                  className={clsx(
                    "rounded-lg border p-4 text-left",
                    data.role === r.id
                      ? "border-brand-500 bg-brand-50"
                      : "border-slate-200 bg-white",
                    !r.available && "opacity-50 cursor-not-allowed",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{r.title}</span>
                    {!r.available && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        Soon
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{r.body}</p>
                </button>
              ))}
            </div>
            <div className="mt-6">
              <label className="label" htmlFor="emp-name">Employee name</label>
              <input
                id="emp-name"
                className="input"
                value={data.name}
                onChange={(e) => patch("name", e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500">
                Visitors will see this name in the chat. Pick something friendly.
              </p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Business info</h2>
            <Field label="Business name">
              <input
                className="input"
                value={data.business_name ?? ""}
                onChange={(e) => patch("business_name", e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone">
                <input
                  className="input"
                  value={data.business_phone ?? ""}
                  onChange={(e) => patch("business_phone", e.target.value)}
                />
              </Field>
              <Field label="Email">
                <input
                  className="input"
                  type="email"
                  value={data.business_email ?? ""}
                  onChange={(e) => patch("business_email", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Address">
              <input
                className="input"
                value={data.business_address ?? ""}
                onChange={(e) => patch("business_address", e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Hours">
                <input
                  className="input"
                  value={data.business_hours ?? ""}
                  onChange={(e) => patch("business_hours", e.target.value)}
                />
              </Field>
              <Field label="Service area">
                <input
                  className="input"
                  placeholder="e.g. Greater Austin, TX"
                  value={data.service_area ?? ""}
                  onChange={(e) => patch("service_area", e.target.value)}
                />
              </Field>
            </div>
            <Field label="About">
              <textarea
                className="input min-h-24"
                placeholder="Years in business, specialties, certifications…"
                value={data.about ?? ""}
                onChange={(e) => patch("about", e.target.value)}
              />
            </Field>
          </div>
        )}

        {step === 2 && (
          <ListEditor<Service>
            title="Services"
            help="Add the services you offer. Price range is optional but helps qualify leads."
            items={data.services}
            empty={{ name: "", description: "", price_range: "" }}
            onChange={(v) => patch("services", v)}
            renderItem={(item, update) => (
              <div className="grid gap-3 md:grid-cols-3">
                <input
                  className="input"
                  placeholder="Name"
                  value={item.name}
                  onChange={(e) => update({ ...item, name: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="Description (optional)"
                  value={item.description ?? ""}
                  onChange={(e) => update({ ...item, description: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="Price range (optional)"
                  value={item.price_range ?? ""}
                  onChange={(e) => update({ ...item, price_range: e.target.value })}
                />
              </div>
            )}
          />
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Pricing</h2>
            <p className="text-sm text-slate-600">
              The AI will reference these when asked about cost.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Labor rate">
                <input
                  className="input"
                  placeholder="$95/hr"
                  value={data.pricing.labor_rate ?? ""}
                  onChange={(e) =>
                    patch("pricing", { ...data.pricing, labor_rate: e.target.value })
                  }
                />
              </Field>
              <Field label="Minimum job">
                <input
                  className="input"
                  placeholder="$500"
                  value={data.pricing.minimum ?? ""}
                  onChange={(e) =>
                    patch("pricing", { ...data.pricing, minimum: e.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="Pricing notes">
              <textarea
                className="input min-h-24"
                placeholder="Travel fees, materials markup, financing options…"
                value={data.pricing.notes ?? ""}
                onChange={(e) =>
                  patch("pricing", { ...data.pricing, notes: e.target.value })
                }
              />
            </Field>
          </div>
        )}

        {step === 4 && (
          <ListEditor<FAQ>
            title="FAQs"
            help="Common questions you want the AI to answer in your own words."
            items={data.faqs}
            empty={{ question: "", answer: "" }}
            onChange={(v) => patch("faqs", v)}
            renderItem={(item, update) => (
              <div className="space-y-2">
                <input
                  className="input"
                  placeholder="Question"
                  value={item.question}
                  onChange={(e) => update({ ...item, question: e.target.value })}
                />
                <textarea
                  className="input min-h-20"
                  placeholder="Answer"
                  value={item.answer}
                  onChange={(e) => update({ ...item, answer: e.target.value })}
                />
              </div>
            )}
          />
        )}

        {step === 5 && (
          <ListEditor<Policy>
            title="Policies"
            help="Things like deposits, warranties, cancellations. The AI will respect these."
            items={data.policies}
            empty={{ title: "", body: "" }}
            onChange={(v) => patch("policies", v)}
            renderItem={(item, update) => (
              <div className="space-y-2">
                <input
                  className="input"
                  placeholder="Title"
                  value={item.title}
                  onChange={(e) => update({ ...item, title: e.target.value })}
                />
                <textarea
                  className="input min-h-20"
                  placeholder="Body"
                  value={item.body}
                  onChange={(e) => update({ ...item, body: e.target.value })}
                />
              </div>
            )}
          />
        )}

        {step === 6 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Voice</h2>
            <Field label="Greeting">
              <input
                className="input"
                value={data.greeting ?? ""}
                onChange={(e) => patch("greeting", e.target.value)}
              />
            </Field>
            <Field label="Tone">
              <select
                className="input"
                value={data.tone ?? "friendly-professional"}
                onChange={(e) => patch("tone", e.target.value)}
              >
                <option value="friendly-professional">Friendly &amp; professional</option>
                <option value="warm-casual">Warm &amp; casual</option>
                <option value="direct-formal">Direct &amp; formal</option>
              </select>
            </Field>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || pending}
            className="btn-secondary"
          >
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="btn-primary"
              disabled={pending}
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={onSubmit}
              className="btn-primary"
              disabled={pending}
            >
              {pending ? "Creating…" : "Create AI Employee"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function ListEditor<T>({
  title,
  help,
  items,
  empty,
  onChange,
  renderItem,
}: {
  title: string;
  help?: string;
  items: T[];
  empty: T;
  onChange: (next: T[]) => void;
  renderItem: (item: T, update: (next: T) => void) => React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {help && <p className="mt-1 text-sm text-slate-600">{help}</p>}
      </div>
      <div className="space-y-3">
        {items.map((it, i) => (
          <div key={i} className="rounded-md border border-slate-200 p-3">
            {renderItem(it, (next) => {
              const copy = [...items];
              copy[i] = next;
              onChange(copy);
            })}
            <div className="mt-2 text-right">
              <button
                type="button"
                className="text-xs text-red-600 hover:text-red-700"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="btn-secondary"
        onClick={() => onChange([...items, { ...(empty as T) }])}
      >
        + Add
      </button>
    </div>
  );
}
