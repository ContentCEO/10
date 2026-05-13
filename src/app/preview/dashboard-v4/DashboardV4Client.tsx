"use client";

import { useState, useEffect, useRef, type ReactNode, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Search, Bell, Plus, Sparkles, Send, RotateCcw, ArrowUpRight,
  LayoutDashboard, Users, Briefcase, Calendar, Inbox, Settings, ChevronRight,
  ChevronDown, Phone, MessageSquare, DollarSign, Clock,
  TrendingUp, AlertCircle, Building2, Radio, ShoppingCart, Star,
  ArrowRight, Wallet, Hammer, Bot, CalendarClock, CircleDollarSign, Zap,
  type LucideIcon,
} from "lucide-react";
import type { FollowUp, Lead } from "@/lib/types";
import { PipelineBoard } from "@/app/(app)/dashboard/PipelineBoard";
import { ActivityStrip } from "@/app/(app)/dashboard/ActivityStrip";
import { StuckLeadAlert } from "@/app/(app)/dashboard/StuckLeadAlert";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import { WeatherWidget } from "@/components/WeatherWidget";
import { WeeklyDigest } from "@/components/WeeklyDigest";
import { YearOverYear } from "@/components/YearOverYear";
import { ARAging } from "@/components/ARAging";
import { ProfitInsights } from "@/components/ProfitInsights";
import { SourceChannelRoi } from "@/components/SourceChannelRoi";
import { SourceRoi } from "@/components/SourceRoi";
import type { MapMarker } from "./LeafletMap";

const LeafletMap = dynamic(() => import("./LeafletMap"), { ssr: false });

/* ================================================================== */
/*  PALETTE & FONTS                                                   */
/* ================================================================== */
const P = {
  bg:        "#FAFAFB",
  surface:   "#FFFFFF",
  surface2:  "#F4F4F7",
  surface3:  "#EBEBF0",
  border:    "rgba(15,23,42,0.07)",
  borderHi:  "rgba(15,23,42,0.14)",
  text:      "#0F172A",
  muted:     "#64748B",
  subtle:    "#94A3B8",
  ghost:     "#CBD5E1",
  brand:     "#2563EB",
  brandHi:   "#3B82F6",
  brandDim:  "#1D4ED8",
  indigo:    "#6366F1",
  violet:    "#8B5CF6",
  fuchsia:   "#D946EF",
  pink:      "#EC4899",
  emerald:   "#10B981",
  teal:      "#14B8A6",
  amber:     "#F59E0B",
  orange:    "#F97316",
  rose:      "#F43F5E",
  cyan:      "#06B6D4",
};
const SERIF = '"Instrument Serif", "Times New Roman", serif';
const SANS  = 'Geist, -apple-system, BlinkMacSystemFont, sans-serif';
const MONO  = '"Geist Mono", "SF Mono", ui-monospace, monospace';

/* ================================================================== */
/*  HOOKS                                                             */
/* ================================================================== */
const isTouchDevice = () =>
  typeof window !== "undefined" && matchMedia("(hover: none)").matches;

function useMagnetic<T extends HTMLElement>(strength = 0.22) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || isTouchDevice()) return;
    el.style.transition = "transform 380ms cubic-bezier(.2,.7,.2,1)";
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      el.style.transform =
        `translate(${(e.clientX - (r.left + r.width / 2)) * strength}px, ${(e.clientY - (r.top + r.height / 2)) * strength}px)`;
    };
    const onLeave = () => { el.style.transform = "translate(0,0)"; };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [strength]);
  return ref;
}

function useTilt<T extends HTMLElement>(max = 4) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || isTouchDevice()) return;
    el.style.transformStyle = "preserve-3d";
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transition = "transform 140ms linear";
      el.style.transform =
        `perspective(1400px) rotateX(${-y * max}deg) rotateY(${x * max}deg) scale(1.005)`;
    };
    const onLeave = () => {
      el.style.transition = "transform 600ms cubic-bezier(.2,.7,.2,1)";
      el.style.transform = "perspective(1400px) rotateX(0) rotateY(0) scale(1)";
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [max]);
  return ref;
}

/* ================================================================== */
/*  PRIMITIVES                                                        */
/* ================================================================== */
function Reveal({ children, delay = 0, y = 18, className = "" }: {
  children: ReactNode; delay?: number; y?: number; className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setV(true),
      { threshold: 0.05 }
    );
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} style={{
      opacity: v ? 1 : 0,
      transform: v ? "translateY(0)" : `translateY(${y}px)`,
      transition: `opacity 700ms cubic-bezier(.2,.7,.2,1) ${delay}ms, transform 700ms cubic-bezier(.2,.7,.2,1) ${delay}ms`,
    }}>{children}</div>
  );
}

function CountUp({ to, duration = 1400, prefix = "", suffix = "", sep = false }: {
  to: number; duration?: number; prefix?: string; suffix?: string; sep?: boolean;
}) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    let started = false; let raf = 0;
    const run = () => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / duration);
        const e = 1 - Math.pow(1 - p, 3);
        setVal(Math.round(to * e));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started) { started = true; run(); }
    }, { threshold: 0.4 });
    if (ref.current) io.observe(ref.current);
    return () => { io.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [to, duration]);
  return <span ref={ref}>{prefix}{sep ? val.toLocaleString() : val}{suffix}</span>;
}

function ScrambleText({ to, duration = 1500, prefix = "", suffix = "", sep = false }: {
  to: number; duration?: number; prefix?: string; suffix?: string; sep?: boolean;
}) {
  const target = sep ? to.toLocaleString() : String(to);
  const [val, setVal] = useState(target.replace(/\d/g, "0"));
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    let started = false; let raf = 0;
    const run = () => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / duration);
        const settled = Math.floor(p * target.length);
        let out = "";
        for (let i = 0; i < target.length; i++) {
          const ch = target[i];
          if (i < settled || !/\d/.test(ch)) out += ch;
          else out += Math.floor(Math.random() * 10);
        }
        setVal(out);
        if (p < 1) raf = requestAnimationFrame(tick);
        else setVal(target);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started) { started = true; run(); }
    }, { threshold: 0.4 });
    if (ref.current) io.observe(ref.current);
    return () => { io.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [target, duration]);
  return <span ref={ref}>{prefix}{val}{suffix}</span>;
}

/* ================================================================== */
/*  GLOBAL OVERLAYS                                                   */
/* ================================================================== */
function CursorGlow() {
  const dot = useRef<HTMLDivElement | null>(null);
  const ring = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (isTouchDevice()) return;
    let raf = 0, tx = -100, ty = -100, x = -100, y = -100, rx = -100, ry = -100;
    const onMove = (e: MouseEvent) => { tx = e.clientX; ty = e.clientY; };
    const loop = () => {
      x  += (tx - x)  * 0.24;
      y  += (ty - y)  * 0.24;
      rx += (tx - rx) * 0.08;
      ry += (ty - ry) * 0.08;
      if (dot.current)  dot.current.style.transform  = `translate3d(${x - 14}px, ${y - 14}px, 0)`;
      if (ring.current) ring.current.style.transform = `translate3d(${rx - 16}px, ${ry - 16}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(loop);
    return () => { window.removeEventListener("mousemove", onMove); cancelAnimationFrame(raf); };
  }, []);
  return (
    <>
      <div ref={dot} className="pointer-events-none fixed top-0 left-0 z-[60] hidden md:block"
        style={{
          width: 28, height: 28,
          background: `radial-gradient(circle, ${P.brand}66 0%, transparent 65%)`,
          filter: "blur(8px)",
          mixBlendMode: "multiply",
        }} />
      <div ref={ring} className="pointer-events-none fixed top-0 left-0 z-[60] hidden md:block"
        style={{
          width: 32, height: 32,
          border: `1px solid ${P.brand}55`,
          borderRadius: "50%",
        }} />
    </>
  );
}

function ScrollProgress() {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const on = () => {
      const h = document.documentElement;
      const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
      if (ref.current) ref.current.style.transform = `scaleX(${p})`;
    };
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <div className="fixed top-0 left-0 right-0 h-[2px] z-[55]"
      style={{ background: "rgba(15,23,42,0.04)" }}>
      <div ref={ref} className="h-full"
        style={{
          background: `linear-gradient(90deg, ${P.brand}, ${P.indigo}, ${P.violet}, ${P.fuchsia})`,
          transform: "scaleX(0)",
          transformOrigin: "left",
          boxShadow: `0 0 10px ${P.brand}88`,
        }} />
    </div>
  );
}

function PageBackground() {
  return (
    <>
      <div className="pointer-events-none fixed -z-10 left-1/2 -top-20 h-[600px] w-[1200px] -translate-x-1/2 rounded-full"
        style={{
          background: `radial-gradient(ellipse at center, ${P.brand}1f 0%, ${P.indigo}14 30%, ${P.violet}10 50%, transparent 70%)`,
          filter: "blur(40px)",
          animation: "auroraShiftV4 18s ease-in-out infinite alternate",
        }} />
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[700px]" style={{
        backgroundImage: `linear-gradient(rgba(37,99,235,0.06) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(37,99,235,0.06) 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
        WebkitMaskImage: "linear-gradient(to bottom, black, transparent)",
        maskImage: "linear-gradient(to bottom, black, transparent)",
      }} />
    </>
  );
}

/* ================================================================== */
/*  BUTTONS                                                           */
/* ================================================================== */
function PrimaryButton({ children, icon: Icon, compact = false, href, onClick }: {
  children: ReactNode; icon?: LucideIcon; compact?: boolean; href?: string; onClick?: () => void;
}) {
  const ref = useMagnetic<HTMLAnchorElement>(0.22);
  const refBtn = useMagnetic<HTMLButtonElement>(0.22);
  const pad = compact ? "7px 12px" : "10px 18px";
  const sty: CSSProperties = {
    padding: pad,
    background: `linear-gradient(135deg, ${P.brand}, ${P.indigo})`,
    color: "#fff",
    fontFamily: SANS,
    fontWeight: 600,
    fontSize: compact ? 13 : 14,
    boxShadow: `0 10px 22px -8px ${P.brand}88, inset 0 1px 0 rgba(255,255,255,0.3)`,
  };
  const inner = (
    <>
      <span className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)",
          animation: "shimmerV4 1.6s linear infinite",
        }} />
      <span className="relative inline-flex items-center gap-1.5">
        {Icon && <Icon size={compact ? 13 : 14} />}
        {children}
      </span>
    </>
  );
  if (href) {
    return (
      <Link ref={ref} href={href}
        className="relative inline-flex items-center gap-1.5 rounded-lg overflow-hidden group"
        style={sty}>
        {inner}
      </Link>
    );
  }
  return (
    <button ref={refBtn} onClick={onClick}
      className="relative inline-flex items-center gap-1.5 rounded-lg overflow-hidden group"
      style={sty}>
      {inner}
    </button>
  );
}

/* ================================================================== */
/*  TOP BAR                                                           */
/* ================================================================== */
function TopBar({ businessName, walletDollars, lowWallet }: {
  businessName: string | null; walletDollars: string; lowWallet: boolean;
}) {
  const initials = (businessName ?? "Y")
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "").join("");
  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl"
      style={{ background: "rgba(250,250,251,0.78)", borderBottom: `1px solid ${P.border}` }}>
      <div className="max-w-[1320px] mx-auto px-5 py-3 flex items-center gap-4">
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${P.brand}, ${P.indigo}, ${P.violet})`,
              boxShadow: `0 10px 20px -6px ${P.brand}66, inset 0 1px 0 rgba(255,255,255,0.4)`,
              color: "#fff", fontFamily: SERIF, fontSize: 15, fontWeight: 600,
            }}>
            CF
          </div>
          <span style={{ fontFamily: SANS, fontWeight: 600, color: P.text, fontSize: 15 }}
            className="hidden sm:inline">
            ContractorFlow
          </span>
        </Link>

        <div className="hidden md:flex flex-1 max-w-md mx-2 group">
          <div className="relative w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: P.subtle }} />
            <input
              placeholder="Search leads, jobs, customers…"
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-sm outline-none transition-all"
              style={{
                background: P.surface,
                border: `1px solid ${P.border}`,
                color: P.text,
                fontFamily: SANS,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = P.brand;
                e.currentTarget.style.boxShadow = `0 0 0 4px ${P.brand}22`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = P.border;
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            <kbd className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px]"
              style={{ background: P.surface2, color: P.subtle, fontFamily: MONO, border: `1px solid ${P.border}` }}>
              ⌘K
            </kbd>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
            style={{
              background: lowWallet ? `${P.amber}1a` : P.surface,
              color: lowWallet ? P.amber : P.muted,
              border: `1px solid ${lowWallet ? `${P.amber}55` : P.border}`,
              fontFamily: SANS,
            }}>
            <Wallet size={12} />
            <span style={{ color: lowWallet ? P.amber : P.text, fontWeight: 600, fontFamily: MONO }}>
              ${walletDollars}
            </span>
            {lowWallet && <Link href="/marketplace" style={{ color: P.amber, fontWeight: 600 }}>top up</Link>}
          </div>
          <Link href="/inbox" className="relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-slate-100"
            style={{ color: P.muted, background: P.surface, border: `1px solid ${P.border}` }}>
            <Bell size={15} />
          </Link>
          <PrimaryButton compact icon={Plus} href="/leads/new">New lead</PrimaryButton>
          <Link href="/profile" className="w-9 h-9 rounded-full flex items-center justify-center text-xs"
            style={{
              background: `linear-gradient(135deg, ${P.brand}, ${P.violet})`,
              color: "#fff", fontFamily: SANS, fontWeight: 600,
              boxShadow: `0 6px 14px -4px ${P.brand}66`,
            }}>
            {initials || "Y"}
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ================================================================== */
/*  SIDEBAR                                                           */
/* ================================================================== */
interface SidebarItem { I: LucideIcon; l: string; href: string; }
const SIDEBAR_ITEMS: SidebarItem[] = [
  { I: LayoutDashboard, l: "Dashboard",   href: "/dashboard" },
  { I: Users,           l: "Leads",       href: "/leads" },
  { I: Briefcase,       l: "Jobs",        href: "/jobs" },
  { I: Users,           l: "Customers",   href: "/customers" },
  { I: Calendar,        l: "Calendar",    href: "/calendar" },
  { I: Inbox,           l: "Inbox",       href: "/inbox" },
  { I: ShoppingCart,    l: "Marketplace", href: "/marketplace" },
  { I: Settings,        l: "Settings",    href: "/preferences" },
];

function Sidebar() {
  const ITEM_H = 36;
  return (
    <aside className="hidden lg:block w-56 shrink-0 sticky top-[64px] self-start py-5 pr-2">
      <div className="text-[10px] uppercase px-3 mb-2"
        style={{ color: P.subtle, fontFamily: SANS, letterSpacing: "0.16em", fontWeight: 600 }}>
        Workspace
      </div>
      <nav className="relative">
        <div className="absolute left-0 w-[3px] rounded-r-full"
          style={{
            top: 8,
            height: ITEM_H - 16,
            background: `linear-gradient(180deg, ${P.brand}, ${P.indigo})`,
            boxShadow: `0 0 12px ${P.brand}aa`,
          }} />
        {SIDEBAR_ITEMS.map((item, i) => (
          <Link key={i} href={item.href}
            className="w-full flex items-center gap-2.5 pl-4 pr-3 rounded-md transition-colors"
            style={{
              height: ITEM_H,
              color: i === 0 ? P.text : P.muted,
              background: i === 0 ? P.surface2 : "transparent",
              fontFamily: SANS,
              fontWeight: i === 0 ? 600 : 500,
              fontSize: 13.5,
            }}>
            <item.I size={15} style={{ color: i === 0 ? P.brand : P.subtle }} />
            <span className="flex-1 text-left">{item.l}</span>
          </Link>
        ))}
      </nav>

      <Link href="/auto-bid" className="mt-6 block p-3 rounded-xl relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${P.brand}11, ${P.violet}11)`,
          border: `1px solid ${P.brand}22`,
        }}>
        <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full"
          style={{
            background: `radial-gradient(circle, ${P.brand}33, transparent 70%)`,
            filter: "blur(12px)",
            animation: "breatheV4 4s ease-in-out infinite",
          }} />
        <div className="relative flex items-center gap-1.5 mb-1">
          <Sparkles size={12} style={{ color: P.brand }} />
          <span className="text-[10px] uppercase"
            style={{ color: P.brand, fontFamily: SANS, letterSpacing: "0.14em", fontWeight: 700 }}>
            AI Auto-Bid
          </span>
        </div>
        <div className="text-xs relative" style={{ color: P.text, fontFamily: SANS, fontWeight: 500 }}>
          Bid on leads while you sleep
        </div>
        <div className="text-[11px] mt-0.5 relative" style={{ color: P.muted, fontFamily: SANS }}>
          Configure rules →
        </div>
      </Link>
    </aside>
  );
}

/* ================================================================== */
/*  GREETING                                                          */
/* ================================================================== */
function Greeting({ businessName, brief }: { businessName: string | null; brief: string }) {
  const today = new Date();
  const hour = today.getHours();
  const partOfDay =
    hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  return (
    <Reveal>
      <div>
        <div className="text-xs" style={{ color: P.muted, fontFamily: SANS }}>
          {dateStr}
        </div>
        <h1 className="mt-1" style={{
          fontFamily: SERIF,
          fontSize: "clamp(28px, 4vw, 40px)",
          fontWeight: 400,
          color: P.text,
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}>
          Good <span style={{ fontStyle: "italic" }}>{partOfDay}</span>
          {businessName ? <>, <span>{businessName}</span></> : null}
        </h1>
        <p className="mt-1.5 text-sm flex items-start gap-1.5"
          style={{ color: P.muted, fontFamily: SANS }}>
          <Sparkles size={13} className="mt-0.5 shrink-0" style={{ color: P.brand }} />
          <span>{brief}</span>
        </p>
      </div>
    </Reveal>
  );
}

/* ================================================================== */
/*  STAT TILES                                                        */
/* ================================================================== */
function StatTile({ label, value, prefix = "", sep = false, scramble = false,
  gradient, icon: Icon, sub, delay = 0 }: {
  label: string; value: number; prefix?: string; sep?: boolean; scramble?: boolean;
  gradient: string; icon?: LucideIcon; sub?: string; delay?: number;
}) {
  const ref = useTilt<HTMLDivElement>(3);
  return (
    <Reveal delay={delay}>
      <div ref={ref}
        className="relative rounded-xl overflow-hidden p-4 text-white"
        style={{
          background: gradient,
          boxShadow: "0 14px 30px -10px rgba(15,23,42,0.18), inset 0 1px 0 rgba(255,255,255,0.25)",
          minHeight: 110,
        }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "linear-gradient(120deg, transparent 32%, rgba(255,255,255,0.32) 50%, transparent 68%)",
          animation: `shimmerSweepV4 1.4s ease-out ${delay + 350}ms 1 both`,
          transform: "translateX(-120%)",
        }} />
        <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(255,255,255,0.35), transparent 70%)",
            filter: "blur(8px)",
          }} />
        <div className="flex items-start justify-between relative">
          <div className="text-[10px] uppercase tracking-wider opacity-90"
            style={{ fontFamily: SANS, fontWeight: 600, letterSpacing: "0.14em" }}>
            {label}
          </div>
          {Icon && <Icon size={14} className="opacity-80" />}
        </div>
        <div className="mt-2 relative tabular-nums"
          style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 500,
                   letterSpacing: "-0.02em", lineHeight: 1 }}>
          {scramble
            ? <ScrambleText to={value} prefix={prefix} sep={sep} />
            : <CountUp to={value} prefix={prefix} sep={sep} />}
        </div>
        {sub && (
          <div className="mt-2 text-[11px] relative opacity-90"
            style={{ fontFamily: SANS }}>
            {sub}
          </div>
        )}
      </div>
    </Reveal>
  );
}

/* ================================================================== */
/*  AI FOLLOW-UP (rotates through draft samples; same as v3)          */
/* ================================================================== */
const AI_MESSAGES = [
  { name: "Maria S.",  job: "Bathroom remodel · $12k",
    text: "Hey Maria, just checking in on the bathroom remodel quote. Happy to walk through any questions — when works for a quick call this week?" },
  { name: "Priya R.",  job: "Fence install · $3.2k",
    text: "Hi Priya, following up on the fence install. I can get you on the calendar next Tuesday — does morning or afternoon work better?" },
  { name: "John D.",   job: "Roof repair · $4.8k",
    text: "John, thanks for the roof repair inquiry. A couple photos of the damage would help me get you a quick, accurate estimate." },
];

function AIFollowUp() {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"thinking" | "typing" | "done">("thinking");
  const [typed, setTyped] = useState("");
  const sendRef = useMagnetic<HTMLButtonElement>(0.25);

  useEffect(() => {
    setTyped("");
    setPhase("thinking");
    let typeI: ReturnType<typeof setInterval> | undefined;
    const startTyping = setTimeout(() => {
      setPhase("typing");
      const full = AI_MESSAGES[idx].text;
      let i = 0;
      typeI = setInterval(() => {
        i++;
        setTyped(full.slice(0, i));
        if (i >= full.length) {
          if (typeI) clearInterval(typeI);
          setPhase("done");
        }
      }, 20);
    }, 1100);
    const nextCycle = setTimeout(() => {
      setIdx((x) => (x + 1) % AI_MESSAGES.length);
    }, 1100 + AI_MESSAGES[idx].text.length * 20 + 4200);
    return () => {
      clearTimeout(startTyping);
      clearTimeout(nextCycle);
      if (typeI) clearInterval(typeI);
    };
  }, [idx]);

  const m = AI_MESSAGES[idx];

  return (
    <Reveal delay={160}>
      <div className="rounded-2xl overflow-hidden"
        style={{
          background: P.surface,
          border: `1px solid ${P.border}`,
          boxShadow: "0 8px 24px -12px rgba(15,23,42,0.08)",
        }}>
        <div className="flex items-center gap-2 px-5 py-3"
          style={{
            background: `linear-gradient(135deg, ${P.brand}0c, ${P.violet}0c)`,
            borderBottom: `1px solid ${P.border}`,
          }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${P.brand}, ${P.violet})`,
              boxShadow: `0 6px 14px -4px ${P.brand}88`,
              color: "#fff",
            }}>
            <Sparkles size={13} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm" style={{ color: P.text, fontFamily: SANS, fontWeight: 600 }}>
              AI Follow-up
            </div>
            <div className="text-[11px]" style={{ color: P.muted, fontFamily: SANS }}>
              Drafting reply to <span style={{ color: P.text, fontWeight: 600 }}>{m.name}</span> · {m.job}
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full"
            style={{
              background: `${P.brand}15`, color: P.brand,
              fontFamily: SANS, fontWeight: 700, letterSpacing: "0.08em",
            }}>
            CLAUDE
          </span>
        </div>

        <div className="p-5 min-h-[150px] relative">
          {phase === "thinking" && (
            <div className="flex items-center gap-2 text-sm"
              style={{ color: P.muted, fontFamily: SANS }}>
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full"
                    style={{ background: P.brand,
                             animation: `thinkDotV4 1.2s ease-in-out ${i * 0.15}s infinite` }} />
                ))}
              </span>
              <span className="italic" style={{ color: P.subtle }}>AI is thinking…</span>
            </div>
          )}
          {phase !== "thinking" && (
            <div className="text-sm leading-relaxed"
              style={{ color: P.text, fontFamily: SANS }}>
              {typed}
              {phase === "typing" && (
                <span className="inline-block w-[2px] h-[14px] align-middle ml-0.5"
                  style={{ background: P.brand, animation: "caretV4 1s steps(2) infinite" }} />
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-3"
          style={{ borderTop: `1px solid ${P.border}`, background: P.surface2 }}>
          <div className="flex gap-2">
            <button className="text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-md transition-colors hover:bg-white"
              style={{ color: P.muted, fontFamily: SANS, fontWeight: 500 }}>
              <RotateCcw size={11} /> Regenerate
            </button>
          </div>
          <button ref={sendRef} disabled={phase !== "done"}
            className="relative inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg overflow-hidden group"
            style={{
              background: phase === "done"
                ? `linear-gradient(135deg, ${P.brand}, ${P.indigo})`
                : P.ghost,
              color: "#fff",
              fontFamily: SANS, fontWeight: 600, fontSize: 13,
              boxShadow: phase === "done"
                ? `0 8px 18px -6px ${P.brand}88, inset 0 1px 0 rgba(255,255,255,0.3)`
                : "none",
              transition: "background 300ms, box-shadow 300ms",
            }}>
            <span className="relative inline-flex items-center gap-1.5">
              <Send size={12} /> Send to {m.name}
            </span>
          </button>
        </div>
      </div>
    </Reveal>
  );
}

/* ================================================================== */
/*  REMINDERS RAIL — wired to real follow-ups                         */
/* ================================================================== */
function CircularProgress({ pct, color, size = 36 }: { pct: number; color: string; size?: number }) {
  const r = (size - 4) / 2;
  const c = 2 * Math.PI * r;
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 200);
    return () => clearTimeout(t);
  }, []);
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={P.surface3} strokeWidth="2.5" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth="2.5" strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={drawn ? c * (1 - pct / 100) : c}
        style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(.6,.04,.34,.99)" }} />
    </svg>
  );
}

function RemindersRail({ followUps }: { followUps: FollowUp[] }) {
  return (
    <Reveal delay={120}>
      <div className="rounded-2xl p-4"
        style={{
          background: P.surface,
          border: `1px solid ${P.border}`,
          boxShadow: "0 8px 24px -12px rgba(15,23,42,0.08)",
        }}>
        <div className="flex items-center justify-between mb-3">
          <h3 style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 500, color: P.text, letterSpacing: "-0.01em" }}>
            Due <span style={{ fontStyle: "italic" }}>today</span>
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: P.surface2, color: P.muted, fontFamily: MONO, fontWeight: 600 }}>
            {followUps.length}
          </span>
        </div>
        {followUps.length === 0 ? (
          <div className="text-sm py-6 text-center"
            style={{ color: P.subtle, fontFamily: SANS, fontStyle: "italic" }}>
            Nothing due today. Nice.
          </div>
        ) : (
          <div className="space-y-2">
            {followUps.slice(0, 5).map((r, i) => {
              const dueDate = new Date(r.due_at);
              const dueStr = dueDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
              const hoursUntil = (dueDate.getTime() - Date.now()) / 3600_000;
              const urgent = hoursUntil < 2;
              return (
                <Link key={r.id} href={r.lead_id ? `/leads/${r.lead_id}` : "/calendar"}
                  className="flex items-start gap-3 p-2.5 rounded-lg transition-colors hover:bg-slate-50"
                  style={{ animation: `reminderInV4 600ms cubic-bezier(.2,.7,.2,1) ${250 + i * 100}ms backwards` }}>
                  <div className="relative w-9 h-9 shrink-0">
                    <CircularProgress
                      pct={Math.max(15, Math.min(95, 100 - hoursUntil * 8))}
                      color={urgent ? P.rose : P.brand} size={36}
                    />
                    <div className="absolute inset-1 rounded-full flex items-center justify-center text-[10px]"
                      style={{
                        background: `linear-gradient(135deg, ${P.brand}, ${P.indigo})`,
                        color: "#fff", fontFamily: SANS, fontWeight: 600,
                      }}>
                      {r.title.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm truncate" style={{ color: P.text, fontFamily: SANS, fontWeight: 600 }}>
                        {r.title}
                      </span>
                      {urgent && <AlertCircle size={11} style={{ color: P.rose }} />}
                    </div>
                    {r.notes && (
                      <div className="text-[11px] truncate"
                        style={{ color: P.muted, fontFamily: SANS }}>
                        {r.notes}
                      </div>
                    )}
                    <div className="text-[10px] mt-1 flex items-center gap-1"
                      style={{ color: urgent ? P.rose : P.subtle, fontFamily: MONO, fontWeight: 600 }}>
                      <Clock size={9} /> {dueStr}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Reveal>
  );
}

/* ================================================================== */
/*  LEADS MAP CARD                                                    */
/* ================================================================== */
function LeadsMapCard({ markers, hqLat, hqLng, businessName }: {
  markers: MapMarker[]; hqLat: number | null; hqLng: number | null; businessName: string | null;
}) {
  const stageCounts = markers.reduce<Record<string, number>>((acc, m) => {
    const k = m.status ?? "new";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const counts = [
    { k: "new",       label: "New",       color: "#94A3B8" },
    { k: "contacted", label: "Contacted", color: "#3B82F6" },
    { k: "estimate",  label: "Estimate",  color: "#F59E0B" },
    { k: "won",       label: "Won",       color: "#10B981" },
  ];
  return (
    <Reveal delay={100}>
      <div className="rounded-2xl overflow-hidden"
        style={{
          background: P.surface,
          border: `1px solid ${P.border}`,
          boxShadow: "0 20px 50px -18px rgba(15,23,42,0.18)",
        }}>
        <div className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: `1px solid ${P.border}` }}>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 500,
                         color: P.text, letterSpacing: "-0.01em" }}>
              Leads <span style={{ fontStyle: "italic" }}>nearby</span>
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1"
              style={{
                background: `${P.brand}1a`, color: P.brand,
                fontFamily: SANS, fontWeight: 700, letterSpacing: "0.1em",
              }}>
              <Radio size={10} style={{ animation: "spinV4 2.4s linear infinite" }} />
              LIVE
            </span>
            <span className="text-[10px]"
              style={{ color: P.subtle, fontFamily: MONO }}>
              {markers.length} pin{markers.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-xs flex-wrap"
            style={{ fontFamily: SANS, color: P.muted }}>
            {counts.map((c) => (
              <span key={c.k} className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full"
                  style={{ background: c.color, boxShadow: `0 0 6px ${c.color}` }} />
                <span style={{ color: P.text, fontWeight: 600, fontFamily: MONO }}>
                  {stageCounts[c.k] || 0}
                </span>
                <span style={{ color: P.subtle }}>{c.label}</span>
              </span>
            ))}
          </div>
        </div>

        {markers.length === 0 ? (
          <div className="px-4 py-12 text-center" style={{ background: "#0F172A" }}>
            <Building2 size={32} className="mx-auto mb-3" style={{ color: "#475569" }} />
            <div style={{ color: "#CBD5E1", fontFamily: SANS, fontWeight: 600, fontSize: 14 }}>
              No geocoded leads or jobs yet
            </div>
            <p className="mt-1.5 text-sm max-w-sm mx-auto"
              style={{ color: "#94A3B8", fontFamily: SANS }}>
              Once leads have addresses, they&apos;ll appear here on the map.
              Use the geocode endpoint or paste an address into a lead.
            </p>
            <Link href="/leads/new" className="inline-flex items-center gap-1.5 mt-4 px-3.5 py-1.5 rounded-lg text-xs"
              style={{
                background: `linear-gradient(135deg, ${P.brand}, ${P.indigo})`,
                color: "#fff", fontFamily: SANS, fontWeight: 600,
                boxShadow: `0 6px 14px -4px ${P.brand}88`,
              }}>
              <Plus size={11} /> Add a lead
            </Link>
          </div>
        ) : (
          <LeafletMap
            markers={markers}
            hqLat={hqLat}
            hqLng={hqLng}
            hqName={businessName}
            height="440px"
          />
        )}
      </div>
    </Reveal>
  );
}

/* ================================================================== */
/*  TODAY'S MISSION CARD                                              */
/* ================================================================== */
function MissionCard({ mission }: {
  mission: Array<{ kind: "followup" | "lead"; title: string; href: string }>;
}) {
  return (
    <Reveal delay={80}>
      <div className="rounded-2xl p-5"
        style={{
          background: P.surface,
          border: `1px solid ${P.border}`,
          boxShadow: "0 8px 24px -12px rgba(15,23,42,0.08)",
        }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap size={14} style={{ color: P.brand }} />
            <h3 style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 500,
                         color: P.text, letterSpacing: "-0.01em" }}>
              Today&apos;s <span style={{ fontStyle: "italic" }}>mission</span>
            </h3>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: P.surface2, color: P.muted, fontFamily: MONO, fontWeight: 600 }}>
            {mission.length} item{mission.length === 1 ? "" : "s"}
          </span>
        </div>
        {mission.length === 0 ? (
          <div className="text-sm text-center py-6"
            style={{ color: P.subtle, fontFamily: SANS, fontStyle: "italic" }}>
            No critical actions today. Maybe browse{" "}
            <Link href="/marketplace" style={{ color: P.brand, fontStyle: "normal", fontWeight: 600 }}>
              the marketplace
            </Link>.
          </div>
        ) : (
          <ol className="space-y-2">
            {mission.map((m, i) => (
              <li key={i}
                style={{ animation: `reminderInV4 500ms cubic-bezier(.2,.7,.2,1) ${250 + i * 90}ms backwards` }}>
                <Link href={m.href}
                  className="flex items-center gap-3 p-2.5 rounded-lg transition-colors hover:bg-slate-50">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${P.brand}, ${P.indigo})`,
                      color: "#fff", fontFamily: SANS, fontWeight: 700,
                      boxShadow: `0 4px 10px -3px ${P.brand}66`,
                    }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate"
                      style={{ color: P.text, fontFamily: SANS }}>
                      {m.title}
                    </div>
                    <div className="text-[11px]" style={{ color: P.subtle, fontFamily: SANS }}>
                      {m.kind === "followup" ? "Follow-up due today" : "New lead — needs first touch"}
                    </div>
                  </div>
                  <span className="text-[11px] shrink-0 inline-flex items-center gap-1"
                    style={{ color: P.brand, fontFamily: SANS, fontWeight: 600 }}>
                    {m.kind === "followup" ? <CalendarClock size={11} /> : <Phone size={11} />}
                    Open
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Reveal>
  );
}

/* ================================================================== */
/*  AI TIP / NEXT BEST ACTION CARD                                    */
/* ================================================================== */
interface NextBest {
  id: string;
  service_type: string | null;
  city: string | null;
  ai_score: number | null;
  price_cents: number;
  source_channel: string;
  notes: string | null;
}

function NextBestActionCard({ nextBest }: { nextBest: NextBest | null }) {
  if (!nextBest) {
    return (
      <Reveal delay={200}>
        <div className="relative rounded-2xl p-5 overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${P.brand}, ${P.indigo}, ${P.violet})`,
            color: "#fff",
            boxShadow: `0 16px 36px -12px ${P.brand}66, inset 0 1px 0 rgba(255,255,255,0.3)`,
          }}>
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(255,255,255,0.35), transparent 70%)",
              filter: "blur(20px)",
              animation: "breatheV4 4s ease-in-out infinite",
            }} />
          <div className="relative">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles size={13} />
              <span className="text-[10px] uppercase"
                style={{ letterSpacing: "0.16em", fontWeight: 700 }}>
                AI Tip
              </span>
            </div>
            <h3 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500,
                         letterSpacing: "-0.01em", lineHeight: 1.15 }}>
              Quiet on the marketplace right now.
            </h3>
            <p className="mt-2 text-sm opacity-90"
              style={{ fontFamily: SANS, lineHeight: 1.5 }}>
              No high-score leads available — turn on AI auto-bid to claim them the moment they appear.
            </p>
            <Link href="/auto-bid" className="mt-3 text-xs px-3 py-1.5 rounded-md inline-flex items-center gap-1"
              style={{
                background: "#fff",
                color: P.brand,
                fontFamily: SANS, fontWeight: 600,
              }}>
              Set up auto-bid <ChevronRight size={12} />
            </Link>
          </div>
        </div>
      </Reveal>
    );
  }
  return (
    <Reveal delay={200}>
      <div className="relative rounded-2xl p-5 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${P.amber}, ${P.orange}, ${P.fuchsia})`,
          color: "#fff",
          boxShadow: `0 16px 36px -12px ${P.amber}66, inset 0 1px 0 rgba(255,255,255,0.3)`,
        }}>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(255,255,255,0.35), transparent 70%)",
            filter: "blur(20px)",
            animation: "breatheV4 4s ease-in-out infinite",
          }} />
        <div className="relative">
          <div className="flex items-center gap-1.5 mb-2">
            <Star size={13} className="fill-current" />
            <span className="text-[10px] uppercase"
              style={{ letterSpacing: "0.16em", fontWeight: 700 }}>
              Best lead right now · score {nextBest.ai_score}
            </span>
          </div>
          <h3 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500,
                       letterSpacing: "-0.01em", lineHeight: 1.15 }}>
            {nextBest.service_type ?? "Marketplace lead"}
            {nextBest.city ? <> · <span style={{ fontStyle: "italic" }}>{nextBest.city}</span></> : null}
          </h3>
          {nextBest.notes && (
            <p className="mt-2 text-sm opacity-90 line-clamp-2"
              style={{ fontFamily: SANS, lineHeight: 1.5 }}>
              {nextBest.notes.slice(0, 200)}
            </p>
          )}
          <Link href={`/marketplace?lead=${nextBest.id}`}
            className="mt-3 text-xs px-3 py-1.5 rounded-md inline-flex items-center gap-1"
            style={{
              background: "#fff", color: P.text,
              fontFamily: SANS, fontWeight: 600,
            }}>
            Claim · ${(nextBest.price_cents / 100).toFixed(0)} <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </Reveal>
  );
}

/* ================================================================== */
/*  RECENT LEADS PANEL                                                */
/* ================================================================== */
function RecentLeadsPanel({ leads }: { leads: Lead[] }) {
  return (
    <Reveal delay={100}>
      <div className="rounded-2xl p-5"
        style={{
          background: P.surface,
          border: `1px solid ${P.border}`,
          boxShadow: "0 8px 24px -12px rgba(15,23,42,0.08)",
        }}>
        <div className="flex items-center justify-between mb-3">
          <h3 style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 500, color: P.text, letterSpacing: "-0.01em" }}>
            Recent <span style={{ fontStyle: "italic" }}>leads</span>
          </h3>
          <Link href="/leads" className="text-xs flex items-center gap-1"
            style={{ color: P.brand, fontFamily: SANS, fontWeight: 600 }}>
            All <ArrowUpRight size={11} />
          </Link>
        </div>
        {leads.length === 0 ? (
          <div className="text-sm text-center py-6"
            style={{ color: P.subtle, fontFamily: SANS, fontStyle: "italic" }}>
            No leads yet. <Link href="/leads/new" style={{ color: P.brand, fontStyle: "normal", fontWeight: 600 }}>Add one.</Link>
          </div>
        ) : (
          <ul className="divide-y" style={{ borderColor: P.border }}>
            {leads.map((l) => (
              <li key={l.id} className="py-2.5">
                <Link href={`/leads/${l.id}`} className="block">
                  <div className="text-sm font-medium truncate"
                    style={{ color: P.text, fontFamily: SANS }}>
                    {l.name}
                  </div>
                  <div className="text-[11px] truncate"
                    style={{ color: P.subtle, fontFamily: SANS }}>
                    {l.service_type ?? l.email ?? l.phone ?? "—"}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Reveal>
  );
}

/* ================================================================== */
/*  QUICK ACTION CHIPS                                                */
/* ================================================================== */
const QUICK_ACTIONS = [
  { href: "/auto-bid",  label: "AI auto-bid", icon: Bot,           gradient: `linear-gradient(135deg, #6366F1, #8B5CF6)` },
  { href: "/inbox",     label: "SMS inbox",   icon: MessageSquare, gradient: `linear-gradient(135deg, #06B6D4, #3B82F6)` },
  { href: "/booking",   label: "Booking",     icon: CalendarClock, gradient: `linear-gradient(135deg, #10B981, #14B8A6)` },
  { href: "/customers", label: "Customers",   icon: Users,         gradient: `linear-gradient(135deg, #F59E0B, #F97316)` },
];

function QuickActions() {
  return (
    <Reveal delay={140}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {QUICK_ACTIONS.map((qa) => (
          <Link key={qa.href} href={qa.href}
            className="rounded-xl p-3.5 flex items-center gap-3 transition-all hover:-translate-y-0.5"
            style={{
              background: P.surface,
              border: `1px solid ${P.border}`,
              boxShadow: "0 6px 14px -10px rgba(15,23,42,0.12)",
            }}>
            <span className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0"
              style={{
                background: qa.gradient,
                boxShadow: `0 6px 14px -4px rgba(15,23,42,0.2)`,
              }}>
              <qa.icon size={15} />
            </span>
            <span className="font-medium text-sm flex-1" style={{ color: P.text, fontFamily: SANS }}>
              {qa.label}
            </span>
            <ArrowRight size={13} style={{ color: P.subtle }} />
          </Link>
        ))}
      </div>
    </Reveal>
  );
}

/* ================================================================== */
/*  MAIN PAGE                                                         */
/* ================================================================== */
interface Props {
  businessName: string | null;
  walletDollars: string;
  lowWallet: boolean;
  brief: string;
  mission: Array<{ kind: "followup" | "lead"; title: string; href: string }>;
  nextBest: NextBest | null;
  pipeline: Array<{ id: string; name: string; status: string; service_type: string | null; price: number | null }>;
  kpis: {
    leadCount: number;
    activeJobCount: number;
    forecast: number;
    earnedToday: number;
    revenue: number;
    dueToday: number;
  };
  followUps: FollowUp[];
  recentLeads: Lead[];
  mapMarkers: MapMarker[];
  hqLat: number | null;
  hqLng: number | null;
}

export default function DashboardV4Client(props: Props) {
  // Inject Geist + Instrument Serif fonts.
  useEffect(() => {
    if (document.getElementById("cf-fonts-v4")) return;
    const link = document.createElement("link");
    link.id = "cf-fonts-v4";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap";
    document.head.appendChild(link);
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes breatheV4      { 0%,100% { opacity: 0.55; } 50% { opacity: 1; } }
        @keyframes shimmerV4      { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes shimmerSweepV4 { from { transform: translateX(-120%); } to { transform: translateX(120%); } }
        @keyframes auroraShiftV4  { 0% { transform: translate(-50%, 0) scale(1); opacity: 0.85; } 50% { transform: translate(-48%, 1%) scale(1.05); opacity: 1; } 100% { transform: translate(-52%, -1%) scale(1); opacity: 0.85; } }
        @keyframes thinkDotV4     { 0%, 100% { transform: scale(0.6); opacity: 0.4; } 50% { transform: scale(1.2); opacity: 1; } }
        @keyframes caretV4        { 50% { opacity: 0; } }
        @keyframes reminderInV4   { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes spinV4         { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      ` }} />

      <div style={{ background: P.bg, color: P.text, minHeight: "100vh",
                    fontFamily: SANS, position: "relative" }}>
        <PageBackground />
        <CursorGlow />
        <ScrollProgress />
        <TopBar
          businessName={props.businessName}
          walletDollars={props.walletDollars}
          lowWallet={props.lowWallet}
        />

        <div className="max-w-[1320px] mx-auto px-5 flex gap-5">
          <Sidebar />

          <main className="flex-1 min-w-0 py-6 space-y-5">
            <Greeting businessName={props.businessName} brief={props.brief} />

            {/* Stuck-lead alert (auto-hides if none) */}
            <StuckLeadAlert />

            {/* Recently viewed chip strip */}
            <RecentlyViewed />

            {/* 6 KPI tiles */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
              <StatTile label="Total leads" value={props.kpis.leadCount} icon={Users}
                gradient={`linear-gradient(135deg, ${P.indigo}, ${P.violet})`} delay={0} />
              <StatTile label="Pipeline · est" value={props.kpis.forecast} prefix="$" sep icon={TrendingUp}
                gradient={`linear-gradient(135deg, ${P.fuchsia}, ${P.pink})`} delay={60} />
              <StatTile label="Active jobs" value={props.kpis.activeJobCount} icon={Hammer}
                gradient={`linear-gradient(135deg, ${P.violet}, ${P.fuchsia})`} delay={120} />
              <StatTile label="Earned today" value={props.kpis.earnedToday} prefix="$" sep icon={CircleDollarSign}
                gradient={`linear-gradient(135deg, ${P.cyan}, ${P.brandHi})`} delay={180} />
              <StatTile label="Revenue" value={props.kpis.revenue} prefix="$" sep scramble icon={DollarSign}
                gradient={`linear-gradient(135deg, ${P.emerald}, ${P.teal})`} delay={240} />
              <StatTile label="Due today" value={props.kpis.dueToday} icon={Clock}
                gradient={`linear-gradient(135deg, ${P.amber}, ${P.orange})`} delay={300} />
            </div>

            {/* Mission + AI Tip side-by-side */}
            <div className="grid lg:grid-cols-5 gap-5">
              <div className="lg:col-span-3">
                <MissionCard mission={props.mission} />
              </div>
              <div className="lg:col-span-2">
                <NextBestActionCard nextBest={props.nextBest} />
              </div>
            </div>

            {/* Pipeline (existing drag-drop, wrapped in card) */}
            <Reveal delay={120}>
              <div className="rounded-2xl overflow-hidden"
                style={{
                  background: P.surface,
                  border: `1px solid ${P.border}`,
                  boxShadow: "0 16px 40px -16px rgba(15,23,42,0.12)",
                }}>
                <div className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: `1px solid ${P.border}` }}>
                  <div className="flex items-center gap-2">
                    <h3 style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 500,
                                 color: P.text, letterSpacing: "-0.01em" }}>
                      Lead <span style={{ fontStyle: "italic" }}>pipeline</span>
                    </h3>
                    <span className="text-[10px]"
                      style={{ color: P.subtle, fontFamily: SANS, fontStyle: "italic" }}>
                      drag to reclassify
                    </span>
                  </div>
                  <Link href="/leads" className="text-xs flex items-center gap-1"
                    style={{ color: P.brand, fontFamily: SANS, fontWeight: 600 }}>
                    View all <ArrowUpRight size={11} />
                  </Link>
                </div>
                <div className="p-4">
                  <PipelineBoard initial={props.pipeline} />
                </div>
              </div>
            </Reveal>

            {/* Real Leaflet map */}
            <LeadsMapCard
              markers={props.mapMarkers}
              hqLat={props.hqLat}
              hqLng={props.hqLng}
              businessName={props.businessName}
            />

            {/* Quick action chips */}
            <QuickActions />

            {/* AI Follow-up + Reminders side-by-side */}
            <div className="grid lg:grid-cols-5 gap-5">
              <div className="lg:col-span-3">
                <AIFollowUp />
              </div>
              <div className="lg:col-span-2">
                <RemindersRail followUps={props.followUps} />
              </div>
            </div>

            {/* Recent leads + Activity strip */}
            <div className="grid lg:grid-cols-3 gap-5">
              <RecentLeadsPanel leads={props.recentLeads} />
              <Reveal delay={140} className="lg:col-span-2">
                <div className="rounded-2xl p-5 h-full"
                  style={{
                    background: P.surface,
                    border: `1px solid ${P.border}`,
                    boxShadow: "0 8px 24px -12px rgba(15,23,42,0.08)",
                  }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 500,
                                 color: P.text, letterSpacing: "-0.01em" }}>
                      Live <span style={{ fontStyle: "italic" }}>activity</span>
                    </h3>
                  </div>
                  <ActivityStrip />
                </div>
              </Reveal>
            </div>

            {/* Weather widget */}
            <Reveal delay={120}>
              <div className="rounded-2xl p-5"
                style={{
                  background: P.surface,
                  border: `1px solid ${P.border}`,
                  boxShadow: "0 8px 24px -12px rgba(15,23,42,0.08)",
                }}>
                <WeatherWidget />
              </div>
            </Reveal>

            {/* Insights collapsible */}
            <Reveal delay={140}>
              <details className="group rounded-2xl p-5 [&_summary::-webkit-details-marker]:hidden"
                style={{
                  background: P.surface,
                  border: `1px solid ${P.border}`,
                  boxShadow: "0 8px 24px -12px rgba(15,23,42,0.08)",
                }}>
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <div className="flex items-center gap-2">
                    <CircleDollarSign size={14} style={{ color: P.brand }} />
                    <h3 style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 500,
                                 color: P.text, letterSpacing: "-0.01em" }}>
                      Insights · <span style={{ fontStyle: "italic" }}>revenue, ROI, year-over-year</span>
                    </h3>
                  </div>
                  <ChevronDown size={16} className="transition-transform group-open:rotate-180"
                    style={{ color: P.subtle }} />
                </summary>
                <div className="mt-4 space-y-3">
                  <WeeklyDigest />
                  <YearOverYear />
                  <ARAging />
                  <ProfitInsights />
                  <SourceChannelRoi />
                  <SourceRoi />
                </div>
              </details>
            </Reveal>

            <div className="mt-10 mb-6 text-center text-[10px] uppercase"
              style={{ color: P.subtle, fontFamily: SANS,
                       letterSpacing: "0.24em", fontWeight: 600 }}>
              ContractorFlow · Built for crews · v4 preview
              {" · "}
              <Link href="/dashboard?stay=1" style={{ color: P.brand }}>old dashboard</Link>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

