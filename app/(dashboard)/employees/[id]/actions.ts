"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/auth";

export async function setPublished(employeeId: string, isPublished: boolean) {
  const { org, supabase } = await requireOrg();
  const { error } = await supabase
    .from("ai_employees")
    .update({ is_published: isPublished, updated_at: new Date().toISOString() })
    .eq("id", employeeId)
    .eq("org_id", org.id);
  if (error) throw new Error(error.message);
  revalidatePath(`/employees/${employeeId}`);
}

export async function deleteEmployee(employeeId: string) {
  const { org, supabase } = await requireOrg();
  const { error } = await supabase
    .from("ai_employees")
    .delete()
    .eq("id", employeeId)
    .eq("org_id", org.id);
  if (error) throw new Error(error.message);
  revalidatePath("/employees");
}
