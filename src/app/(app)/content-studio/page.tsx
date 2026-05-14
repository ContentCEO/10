import Link from "next/link";
import { ArrowRight, Camera, FileText, Globe, PenLine } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BlogGenerator } from "./BlogGenerator";
import { GBPGenerator } from "./GBPGenerator";
import { PhotoAdder } from "./PhotoAdder";

export const dynamic = "force-dynamic";

interface BlogPost { id: string; title: string; slug: string; status: string; created_at: string }
interface GbpPost  { id: string; title: string | null; body: string; kind: string; status: string; created_at: string }
interface Photo    { id: string; url: string; kind: string; caption: string | null; created_at: string }

export default async function ContentStudioPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: blogs }, { data: gbps }, { data: photos }] = await Promise.all([
    supabase.from("profiles").select("services,service_cities").eq("id", user.id).single(),
    supabase.from("blog_posts").select("id,title,slug,status,created_at").order("created_at", { ascending: false }).limit(10),
    supabase.from("gbp_posts").select("id,title,body,kind,status,created_at").order("created_at", { ascending: false }).limit(10),
    supabase.from("job_photos").select("id,url,kind,caption,created_at").order("created_at", { ascending: false }).limit(12),
  ]);

  const p = profile as { services?: string[] | null; service_cities?: string[] | null } | null;
  const defaultService = p?.services?.[0] ?? "";
  const defaultCity = p?.service_cities?.[0] ?? "";

  return (
    <div className="space-y-8 max-w-5xl">
      <header className="card p-7 sm:p-9 relative overflow-hidden">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-gradient opacity-20 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><PenLine className="h-3.5 w-3.5" /> Content studio</span>
          <h1 className="mt-2 display-h2">
            Local SEO + social <span className="gradient-text">on autopilot</span>
          </h1>
          <p className="mt-3 lede max-w-2xl">
            AI-drafted blog posts for local long-tail keywords, Google Business
            Profile updates that boost your map ranking, and a photo library
            you can post anywhere with one tap.
          </p>
        </div>
      </header>

      {/* Blog generator */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-glow">
            <FileText className="h-4 w-4" />
          </span>
          <div>
            <h2 className="section-title">AI blog generator</h2>
            <p className="text-xs text-ink-500">600-1000 word SEO posts targeting local long-tail keywords. Drop into your site or CMS.</p>
          </div>
        </div>
        <BlogGenerator defaultService={defaultService} defaultCity={defaultCity} />
        {(blogs?.length ?? 0) > 0 && (
          <ul className="mt-4 space-y-2">
            {(blogs as BlogPost[]).map((b) => (
              <li key={b.id} className="card p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium tracking-tight truncate">{b.title}</div>
                  <div className="text-xs text-ink-500">{b.slug} · {new Date(b.created_at).toLocaleDateString()}</div>
                </div>
                <span className="badge bg-ink-100 text-ink-700 ring-ink-200 text-[10px]">{b.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* GBP generator */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-glow">
            <Globe className="h-4 w-4" />
          </span>
          <div>
            <h2 className="section-title">Google Business Profile post drafter</h2>
            <p className="text-xs text-ink-500">Quick updates, offers, events — AI drafts, you copy/paste into GBP. Posting weekly boosts your map ranking.</p>
          </div>
        </div>
        <GBPGenerator defaultService={defaultService} defaultCity={defaultCity} />
        {(gbps?.length ?? 0) > 0 && (
          <ul className="mt-4 space-y-2">
            {(gbps as GbpPost[]).map((g) => (
              <li key={g.id} className="card p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="badge bg-emerald-100 text-emerald-700 ring-emerald-200 text-[10px]">{g.kind}</span>
                  <span className="text-xs text-ink-500">{new Date(g.created_at).toLocaleDateString()}</span>
                </div>
                {g.title && <div className="mt-1 font-medium tracking-tight text-sm">{g.title}</div>}
                <p className="mt-1 text-sm text-ink-700 line-clamp-3">{g.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Photo organizer */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-glow">
            <Camera className="h-4 w-4" />
          </span>
          <div>
            <h2 className="section-title">Before / after photo library</h2>
            <p className="text-xs text-ink-500">Add photo URLs (Imgur / Drive / S3) and tag them. Re-use across social, proposals, and your website.</p>
          </div>
        </div>
        <PhotoAdder defaultService={defaultService} defaultCity={defaultCity} />
        {(photos?.length ?? 0) > 0 && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {(photos as Photo[]).map((ph) => (
              <div key={ph.id} className="card p-2">
                <div className="aspect-square rounded-lg overflow-hidden bg-ink-100">
                  <img src={ph.url} alt={ph.caption ?? ""} className="w-full h-full object-cover" />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="badge bg-ink-100 text-ink-700 ring-ink-200 text-[10px]">{ph.kind}</span>
                  <span className="text-[10px] text-ink-500">{new Date(ph.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick link to marketing hub */}
      <Link href="/marketing-hub" className="card card-hover p-5 flex items-center gap-3 group">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow">
          <PenLine className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <div className="font-semibold tracking-tight">Want to post these to social media?</div>
          <div className="text-sm text-ink-600">Marketing hub has the AI post generator for Instagram, TikTok, Facebook, LinkedIn.</div>
        </div>
        <ArrowRight className="h-4 w-4 text-ink-400 group-hover:text-brand-600 transition" />
      </Link>
    </div>
  );
}
