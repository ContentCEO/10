/**
 * Unified data access. Uses Supabase when configured, otherwise falls back to
 * the in-memory dev store so the MVP runs out of the box.
 */
import { getSupabaseServer, getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { db, DEMO_USER_ID, now, uid } from "@/lib/store";
import type {
  Audit,
  Business,
  ChecklistItem,
  Competitor,
  KeywordIdea,
  ReviewResponse,
  Task,
} from "@/lib/types";

export async function currentUserId(): Promise<string> {
  if (!isSupabaseConfigured) return DEMO_USER_ID;
  const user = await getCurrentUser();
  return user?.id ?? DEMO_USER_ID;
}

export async function listBusinesses(): Promise<Business[]> {
  const userId = await currentUserId();
  const supabase = await getSupabaseServer();
  if (supabase) {
    const { data } = await supabase
      .from("businesses")
      .select("*")
      .order("created_at", { ascending: false });
    return (data ?? []) as Business[];
  }
  return db().businesses.filter((b) => b.user_id === userId);
}

export async function getBusiness(id: string): Promise<Business | null> {
  const supabase = await getSupabaseServer();
  if (supabase) {
    const { data } = await supabase.from("businesses").select("*").eq("id", id).maybeSingle();
    return (data as Business | null) ?? null;
  }
  return db().businesses.find((b) => b.id === id) ?? null;
}

export async function getActiveBusiness(): Promise<Business | null> {
  const list = await listBusinesses();
  return list[0] ?? null;
}

export async function upsertBusiness(input: Partial<Business> & { name: string }): Promise<Business> {
  const userId = await currentUserId();
  const supabase = await getSupabaseServer();
  const payload = { ...input, user_id: userId, updated_at: now() };
  if (supabase) {
    if (input.id) {
      const { data } = await supabase
        .from("businesses")
        .update(payload)
        .eq("id", input.id)
        .select("*")
        .single();
      return data as Business;
    }
    const { data } = await supabase
      .from("businesses")
      .insert({ ...payload, created_at: now() })
      .select("*")
      .single();
    return data as Business;
  }
  const store = db();
  if (input.id) {
    const idx = store.businesses.findIndex((b) => b.id === input.id);
    if (idx >= 0) {
      store.businesses[idx] = { ...store.businesses[idx], ...payload } as Business;
      return store.businesses[idx];
    }
  }
  const created: Business = {
    id: uid(),
    user_id: userId,
    name: input.name,
    website: input.website ?? null,
    category: input.category ?? null,
    address: input.address ?? null,
    city: input.city ?? null,
    region: input.region ?? null,
    postal_code: input.postal_code ?? null,
    country: input.country ?? null,
    phone: input.phone ?? null,
    gbp_url: input.gbp_url ?? null,
    primary_keyword: input.primary_keyword ?? null,
    service_area: input.service_area ?? null,
    description: input.description ?? null,
    created_at: now(),
    updated_at: now(),
  };
  store.businesses.unshift(created);
  return created;
}

export async function listAudits(businessId: string): Promise<Audit[]> {
  const supabase = await getSupabaseServer();
  if (supabase) {
    const { data } = await supabase
      .from("audits")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });
    return (data ?? []) as Audit[];
  }
  return db().audits.filter((a) => a.business_id === businessId);
}

export async function latestAudit(businessId: string): Promise<Audit | null> {
  const list = await listAudits(businessId);
  return list[0] ?? null;
}

export async function createAudit(audit: Omit<Audit, "id" | "created_at" | "user_id">): Promise<Audit> {
  const userId = await currentUserId();
  const supabase = await getSupabaseServer();
  if (supabase) {
    const { data } = await supabase
      .from("audits")
      .insert({ ...audit, user_id: userId })
      .select("*")
      .single();
    return data as Audit;
  }
  const created: Audit = { id: uid(), created_at: now(), user_id: userId, ...audit };
  db().audits.unshift(created);
  return created;
}

export async function listChecklist(businessId: string): Promise<ChecklistItem[]> {
  const supabase = await getSupabaseServer();
  if (supabase) {
    const { data } = await supabase
      .from("checklist_items")
      .select("*")
      .eq("business_id", businessId)
      .order("updated_at", { ascending: false });
    return (data ?? []) as ChecklistItem[];
  }
  return db().checklist.filter((c) => c.business_id === businessId);
}

export async function upsertChecklistItem(item: Partial<ChecklistItem> & { business_id: string; title: string }): Promise<ChecklistItem> {
  const supabase = await getSupabaseServer();
  if (supabase) {
    if (item.id) {
      const { data } = await supabase
        .from("checklist_items")
        .update({ ...item, updated_at: now() })
        .eq("id", item.id)
        .select("*")
        .single();
      return data as ChecklistItem;
    }
    const { data } = await supabase
      .from("checklist_items")
      .insert(item)
      .select("*")
      .single();
    return data as ChecklistItem;
  }
  const store = db();
  if (item.id) {
    const idx = store.checklist.findIndex((c) => c.id === item.id);
    if (idx >= 0) {
      store.checklist[idx] = { ...store.checklist[idx], ...item, updated_at: now() } as ChecklistItem;
      return store.checklist[idx];
    }
  }
  const created: ChecklistItem = {
    id: uid(),
    business_id: item.business_id,
    title: item.title,
    category: item.category ?? null,
    status: item.status ?? "open",
    priority: item.priority ?? "medium",
    notes: item.notes ?? null,
    updated_at: now(),
  };
  store.checklist.unshift(created);
  return created;
}

export async function bulkInsertChecklist(items: Array<Omit<ChecklistItem, "id" | "updated_at">>): Promise<void> {
  const supabase = await getSupabaseServer();
  if (supabase) {
    await supabase.from("checklist_items").insert(items);
    return;
  }
  const store = db();
  for (const it of items) {
    store.checklist.unshift({ id: uid(), updated_at: now(), ...it });
  }
}

export async function listTasks(businessId: string): Promise<Task[]> {
  const supabase = await getSupabaseServer();
  if (supabase) {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });
    return (data ?? []) as Task[];
  }
  return db().tasks.filter((t) => t.business_id === businessId);
}

export async function upsertTask(task: Partial<Task> & { business_id: string; title: string }): Promise<Task> {
  const userId = await currentUserId();
  const supabase = await getSupabaseServer();
  const payload = { ...task, user_id: userId };
  if (supabase) {
    if (task.id) {
      const { data } = await supabase
        .from("tasks")
        .update(payload)
        .eq("id", task.id)
        .select("*")
        .single();
      return data as Task;
    }
    const { data } = await supabase.from("tasks").insert(payload).select("*").single();
    return data as Task;
  }
  const store = db();
  if (task.id) {
    const idx = store.tasks.findIndex((t) => t.id === task.id);
    if (idx >= 0) {
      store.tasks[idx] = { ...store.tasks[idx], ...payload } as Task;
      return store.tasks[idx];
    }
  }
  const created: Task = {
    id: uid(),
    business_id: task.business_id,
    user_id: userId,
    title: task.title,
    description: task.description ?? null,
    due_date: task.due_date ?? null,
    status: task.status ?? "todo",
    priority: task.priority ?? "medium",
    created_at: now(),
  };
  store.tasks.unshift(created);
  return created;
}

export async function deleteTask(id: string): Promise<void> {
  const supabase = await getSupabaseServer();
  if (supabase) {
    await supabase.from("tasks").delete().eq("id", id);
    return;
  }
  const store = db();
  store.tasks = store.tasks.filter((t) => t.id !== id);
}

export async function listCompetitors(businessId: string): Promise<Competitor[]> {
  const supabase = await getSupabaseServer();
  if (supabase) {
    const { data } = await supabase
      .from("competitors")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });
    return (data ?? []) as Competitor[];
  }
  return db().competitors.filter((c) => c.business_id === businessId);
}

export async function addCompetitor(c: Omit<Competitor, "id" | "created_at">): Promise<Competitor> {
  const supabase = await getSupabaseServer();
  if (supabase) {
    const { data } = await supabase.from("competitors").insert(c).select("*").single();
    return data as Competitor;
  }
  const created: Competitor = { id: uid(), created_at: now(), ...c };
  db().competitors.unshift(created);
  return created;
}

export async function listKeywords(businessId: string): Promise<KeywordIdea[]> {
  const supabase = await getSupabaseServer();
  if (supabase) {
    const { data } = await supabase
      .from("keyword_ideas")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });
    return (data ?? []) as KeywordIdea[];
  }
  return db().keywords.filter((k) => k.business_id === businessId);
}

export async function bulkInsertKeywords(items: Array<Omit<KeywordIdea, "id" | "created_at">>): Promise<void> {
  const supabase = await getSupabaseServer();
  if (supabase) {
    await supabase.from("keyword_ideas").insert(items);
    return;
  }
  const store = db();
  for (const it of items) {
    store.keywords.unshift({ id: uid(), created_at: now(), ...it });
  }
}

export async function listReviewResponses(businessId: string): Promise<ReviewResponse[]> {
  const supabase = await getSupabaseServer();
  if (supabase) {
    const { data } = await supabase
      .from("review_responses")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });
    return (data ?? []) as ReviewResponse[];
  }
  return db().reviews.filter((r) => r.business_id === businessId);
}

export async function saveReviewResponse(r: Omit<ReviewResponse, "id" | "created_at">): Promise<ReviewResponse> {
  const supabase = await getSupabaseServer();
  if (supabase) {
    const { data } = await supabase.from("review_responses").insert(r).select("*").single();
    return data as ReviewResponse;
  }
  const created: ReviewResponse = { id: uid(), created_at: now(), ...r };
  db().reviews.unshift(created);
  return created;
}
