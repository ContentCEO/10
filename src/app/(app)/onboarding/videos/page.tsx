import { revalidatePath } from "next/cache";
import Link from "next/link";
import { Play, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface VideoEntry {
  title: string;
  youtube_id: string;
}

function ytIdFromInput(input: string): string {
  const s = input.trim();
  // youtu.be/<id>
  const short = s.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
  if (short) return short[1];
  // youtube.com/watch?v=<id>
  const watch = s.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
  if (watch) return watch[1];
  // youtube.com/embed/<id>
  const embed = s.match(/embed\/([A-Za-z0-9_-]{6,})/);
  if (embed) return embed[1];
  // assume already an ID
  return s;
}

async function addVideo(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const title = String(formData.get("title") ?? "").trim() || "Walkthrough";
  const url = String(formData.get("youtube") ?? "").trim();
  if (!url) return;
  const id = ytIdFromInput(url);

  const { data: profile } = await supabase
    .from("profiles").select("onboarding_videos").eq("id", user.id).single();
  const current = (profile?.onboarding_videos as VideoEntry[] | null) ?? [];
  const next = [...current, { title, youtube_id: id }].slice(0, 12);
  await supabase.from("profiles").update({ onboarding_videos: next }).eq("id", user.id);
  revalidatePath("/onboarding");
  revalidatePath("/onboarding/videos");
}

async function removeVideo(index: number) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: profile } = await supabase
    .from("profiles").select("onboarding_videos").eq("id", user.id).single();
  const current = (profile?.onboarding_videos as VideoEntry[] | null) ?? [];
  const next = current.filter((_, i) => i !== index);
  await supabase.from("profiles").update({ onboarding_videos: next }).eq("id", user.id);
  revalidatePath("/onboarding");
  revalidatePath("/onboarding/videos");
}

export default async function OnboardingVideosPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("onboarding_videos").eq("id", user.id).single();
  const videos = (profile?.onboarding_videos as VideoEntry[] | null) ?? [];

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/onboarding" className="text-sm text-slate-500">← Get started</Link>

      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Play className="h-5 w-5 text-brand-600" /> Onboarding videos
        </h1>
        <p className="text-sm text-slate-500">
          Paste YouTube URLs or IDs. Each video shows on your team's onboarding
          page — paste the same set for each contractor account, or customize per team.
        </p>
      </header>

      <section className="card p-5 space-y-3">
        <form action={addVideo} className="grid sm:grid-cols-[1fr_2fr_auto] gap-2">
          <input name="title" className="input" placeholder="Video title" defaultValue="Walkthrough" />
          <input name="youtube" required className="input"
            placeholder="https://youtu.be/XXXXX or video ID" />
          <button className="btn-primary"><Plus className="h-4 w-4" /> Add</button>
        </form>
      </section>

      {videos.length === 0 ? (
        <div className="card p-6 text-center text-sm text-slate-500">
          No videos yet. Paste a YouTube URL above.
        </div>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-3">
          {videos.map((v, i) => (
            <li key={`${v.youtube_id}-${i}`} className="card p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <strong className="text-sm">{v.title}</strong>
                <form action={removeVideo.bind(null, i)}>
                  <button className="btn-secondary !py-1 text-xs">
                    <X className="h-3 w-3" />
                  </button>
                </form>
              </div>
              <div className="aspect-video">
                <iframe
                  className="w-full h-full rounded-lg"
                  src={`https://www.youtube.com/embed/${v.youtube_id}`}
                  title={v.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
