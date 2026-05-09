"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOrg } from "@/lib/auth";
import { randomSlugSuffix, slugify } from "@/lib/slug";

const ServiceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price_range: z.string().optional(),
});

const FaqSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

const PolicySchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
});

const CreateEmployeeSchema = z.object({
  role: z.enum(["receptionist", "sales", "estimator", "support"]),
  name: z.string().min(1),
  business_name: z.string().optional(),
  business_phone: z.string().optional(),
  business_email: z.string().email().optional().or(z.literal("")),
  business_address: z.string().optional(),
  business_hours: z.string().optional(),
  service_area: z.string().optional(),
  about: z.string().optional(),
  greeting: z.string().optional(),
  tone: z.string().optional(),
  services: z.array(ServiceSchema).default([]),
  pricing: z
    .object({
      labor_rate: z.string().optional(),
      minimum: z.string().optional(),
      notes: z.string().optional(),
    })
    .default({}),
  faqs: z.array(FaqSchema).default([]),
  policies: z.array(PolicySchema).default([]),
});

export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;

export async function createEmployee(input: CreateEmployeeInput) {
  const parsed = CreateEmployeeSchema.parse(input);
  const { org, supabase } = await requireOrg();

  const baseSlug = slugify(parsed.business_name || parsed.name) || "ai";
  const slug = `${baseSlug}-${randomSlugSuffix()}`;

  const { data, error } = await supabase
    .from("ai_employees")
    .insert({
      org_id: org.id,
      role: parsed.role,
      name: parsed.name,
      business_name: parsed.business_name || null,
      business_phone: parsed.business_phone || null,
      business_email: parsed.business_email || null,
      business_address: parsed.business_address || null,
      business_hours: parsed.business_hours || null,
      service_area: parsed.service_area || null,
      about: parsed.about || null,
      greeting: parsed.greeting || null,
      tone: parsed.tone || "friendly-professional",
      services: parsed.services,
      pricing: parsed.pricing,
      faqs: parsed.faqs,
      policies: parsed.policies,
      public_slug: slug,
      is_published: false,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create AI employee: ${error?.message ?? "unknown"}`);
  }

  redirect(`/employees/${data.id}`);
}
