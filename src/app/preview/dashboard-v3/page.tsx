"use client";

import { useState, useEffect, useRef, type ReactNode, type CSSProperties } from "react";
import {
  Search, Bell, Plus, Sparkles, Send, RotateCcw, ArrowUpRight, MoreHorizontal,
  LayoutDashboard, Users, Briefcase, Calendar, Inbox, Settings, ChevronRight,
  Phone, MessageSquare, ShoppingBag, DollarSign, CheckCircle2, Clock,
  TrendingUp, AlertCircle, Building2, Radio,
  type LucideIcon,
} from "lucide-react";

/* ================================================================== */
/*  PALETTE (light mode, blue brand)                                  */
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

function useMagnetic<T extends HTMLElement>(strength = 0.28) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || isTouchDevice()) return;
    el.style.transition = "transform 380ms cubic-bezier(.2,.7,.2,1)";
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) * strength;
      const dy = (e.clientY - (r.top + r.height / 2)) * strength;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
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

function useSpotlight<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || isTouchDevice()) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
      el.style.setProperty("--so", "1");
    };
    const onLeave = () => el.style.setProperty("--so", "0");
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);
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
          animation: "auroraShiftV3 18s ease-in-out infinite alternate",
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
function PrimaryButton({ children, icon: Icon, compact = false, onClick }: {
  children: ReactNode; icon?: LucideIcon; compact?: boolean; onClick?: () => void;
}) {
  const ref = useMagnetic<HTMLButtonElement>(0.22);
  const pad = compact ? "7px 12px" : "10px 18px";
  return (
    <button ref={ref} onClick={onClick}
      className="relative inline-flex items-center gap-1.5 rounded-lg overflow-hidden group"
      style={{
        padding: pad,
        background: `linear-gradient(135deg, ${P.brand}, ${P.indigo})`,
        color: "#fff",
        fontFamily: SANS,
        fontWeight: 600,
        fontSize: compact ? 13 : 14,
        boxShadow: `0 10px 22px -8px ${P.brand}88, inset 0 1px 0 rgba(255,255,255,0.3)`,
      }}>
      <span className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)",
          animation: "shimmerV3 1.6s linear infinite",
        }} />
      <span className="relative inline-flex items-center gap-1.5">
        {Icon && <Icon size={compact ? 13 : 14} />}
        {children}
      </span>
    </button>
  );
}

/* ================================================================== */
/*  TOP BAR                                                           */
/* ================================================================== */
function TopBar() {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl"
      style={{ background: "rgba(250,250,251,0.78)", borderBottom: `1px solid ${P.border}` }}>
      <div className="max-w-[1320px] mx-auto px-5 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${P.brand}, ${P.indigo}, ${P.violet})`,
              boxShadow: `0 10px 20px -6px ${P.brand}66, inset 0 1px 0 rgba(255,255,255,0.4)`,
              color: "#fff", fontFamily: SERIF, fontSize: 15, fontWeight: 600,
            }}>
            CF
          </div>
          <span style={{ fontFamily: SANS, fontWeight: 600, color: P.text, fontSize: 15 }}>
            ContractorFlow
          </span>
        </div>

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
          <button className="relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-slate-100"
            style={{ color: P.muted, background: P.surface, border: `1px solid ${P.border}` }}>
            <Bell size={15} />
            <span className="absolute top-1.5 right-1.5 flex w-2 h-2">
              <span className="absolute inline-flex h-full w-full rounded-full"
                style={{ background: P.rose, animation: "pulseDotV3 1.8s infinite" }} />
              <span className="relative inline-flex rounded-full h-2 w-2"
                style={{ background: P.rose }} />
            </span>
          </button>
          <PrimaryButton compact icon={Plus}>New lead</PrimaryButton>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs"
            style={{
              background: `linear-gradient(135deg, ${P.brand}, ${P.violet})`,
              color: "#fff", fontFamily: SANS, fontWeight: 600,
              boxShadow: `0 6px 14px -4px ${P.brand}66`,
            }}>
            DR
          </div>
        </div>
      </div>
    </header>
  );
}

/* ================================================================== */
/*  SIDEBAR                                                           */
/* ================================================================== */
interface SidebarItem { I: LucideIcon; l: string; badge?: number; }
const SIDEBAR_ITEMS: SidebarItem[] = [
  { I: LayoutDashboard, l: "Dashboard" },
  { I: Users,           l: "Leads",      badge: 47 },
  { I: Briefcase,       l: "Jobs",       badge: 12 },
  { I: Users,           l: "Customers" },
  { I: Calendar,        l: "Calendar" },
  { I: Inbox,           l: "AI Inbox",   badge: 4 },
  { I: Settings,        l: "Settings" },
];

function Sidebar() {
  const [active, setActive] = useState(0);
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
            top: active * ITEM_H + 8,
            height: ITEM_H - 16,
            background: `linear-gradient(180deg, ${P.brand}, ${P.indigo})`,
            transition: "top 380ms cubic-bezier(.6,.04,.34,.99)",
            boxShadow: `0 0 12px ${P.brand}aa`,
          }} />
        {SIDEBAR_ITEMS.map((item, i) => (
          <button key={i}
            onClick={() => setActive(i)}
            className="w-full flex items-center gap-2.5 pl-4 pr-3 rounded-md transition-colors"
            style={{
              height: ITEM_H,
              color: i === active ? P.text : P.muted,
              background: i === active ? P.surface2 : "transparent",
              fontFamily: SANS,
              fontWeight: i === active ? 600 : 500,
              fontSize: 13.5,
            }}>
            <item.I size={15} style={{ color: i === active ? P.brand : P.subtle }} />
            <span className="flex-1 text-left">{item.l}</span>
            {item.badge && (
              <span className="text-[10px] px-1.5 py-0.5 rounded"
                style={{
                  background: i === active ? P.brand : P.surface3,
                  color: i === active ? "#fff" : P.muted,
                  fontFamily: MONO, fontWeight: 600,
                }}>
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="mt-6 p-3 rounded-xl relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${P.brand}11, ${P.violet}11)`,
          border: `1px solid ${P.brand}22`,
        }}>
        <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full"
          style={{
            background: `radial-gradient(circle, ${P.brand}33, transparent 70%)`,
            filter: "blur(12px)",
            animation: "breatheV3 4s ease-in-out infinite",
          }} />
        <div className="relative flex items-center gap-1.5 mb-1">
          <Sparkles size={12} style={{ color: P.brand }} />
          <span className="text-[10px] uppercase"
            style={{ color: P.brand, fontFamily: SANS, letterSpacing: "0.14em", fontWeight: 700 }}>
            AI Assist
          </span>
        </div>
        <div className="text-xs relative" style={{ color: P.text, fontFamily: SANS, fontWeight: 500 }}>
          3 follow-ups ready to send
        </div>
        <div className="text-[11px] mt-0.5 relative" style={{ color: P.muted, fontFamily: SANS }}>
          Review and approve →
        </div>
      </div>
    </aside>
  );
}

/* ================================================================== */
/*  GREETING                                                          */
/* ================================================================== */
function Greeting() {
  return (
    <Reveal>
      <div>
        <div className="text-xs" style={{ color: P.muted, fontFamily: SANS }}>
          Tuesday, May 12
        </div>
        <h1 className="mt-1" style={{
          fontFamily: SERIF,
          fontSize: "clamp(28px, 4vw, 40px)",
          fontWeight: 400,
          color: P.text,
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}>
          Good <span style={{ fontStyle: "italic" }}>afternoon</span>, Davi
        </h1>
        <p className="mt-1.5 text-sm" style={{ color: P.muted, fontFamily: SANS }}>
          You have <span style={{ color: P.text, fontWeight: 600 }}>3 follow-ups</span> due
          and <span style={{ color: P.text, fontWeight: 600 }}>1 new lead</span> since yesterday.
        </p>
      </div>
    </Reveal>
  );
}

/* ================================================================== */
/*  STAT TILES                                                        */
/* ================================================================== */
function StatTile({ label, value, prefix = "", sep = false, scramble = false,
  gradient, icon: Icon, delta, delay = 0 }: {
  label: string; value: number; prefix?: string; sep?: boolean; scramble?: boolean;
  gradient: string; icon?: LucideIcon; delta?: string; delay?: number;
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
          animation: `shimmerSweepV3 1.4s ease-out ${delay + 350}ms 1 both`,
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
          style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 500,
                   letterSpacing: "-0.02em", lineHeight: 1 }}>
          {scramble
            ? <ScrambleText to={value} prefix={prefix} sep={sep} />
            : <CountUp to={value} prefix={prefix} sep={sep} />}
        </div>
        {delta && (
          <div className="mt-2 flex items-center gap-1 text-[11px] relative opacity-90"
            style={{ fontFamily: SANS }}>
            <TrendingUp size={11} />
            <span style={{ fontFamily: MONO }}>{delta}</span>
            <span className="opacity-75">vs last week</span>
          </div>
        )}
      </div>
    </Reveal>
  );
}

function StatTiles() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatTile label="Total leads" value={47} icon={Users}
        gradient={`linear-gradient(135deg, ${P.indigo}, ${P.violet})`}
        delta="+8" delay={0} />
      <StatTile label="Active jobs" value={12} icon={Briefcase}
        gradient={`linear-gradient(135deg, ${P.violet}, ${P.fuchsia})`}
        delta="+2" delay={80} />
      <StatTile label="Revenue" value={48200} prefix="$" sep scramble icon={DollarSign}
        gradient={`linear-gradient(135deg, ${P.emerald}, ${P.teal})`}
        delta="+24%" delay={160} />
      <StatTile label="Due today" value={3} icon={Clock}
        gradient={`linear-gradient(135deg, ${P.amber}, ${P.orange})`}
        delta="2 hot" delay={240} />
    </div>
  );
}

/* ================================================================== */
/*  PIPELINE KANBAN                                                   */
/* ================================================================== */
type ColId = "new" | "cont" | "est" | "won" | "lost";
interface Col { id: ColId; label: string; color: string; bg: string; }
interface KLead { col: ColId; name: string; desc: string; val: string; when: string; }

const COLS: Col[] = [
  { id: "new",  label: "New",           color: P.subtle,  bg: "#F1F5F9" },
  { id: "cont", label: "Contacted",     color: P.brand,   bg: "#EFF6FF" },
  { id: "est",  label: "Estimate sent", color: P.amber,   bg: "#FEF3C7" },
  { id: "won",  label: "Won",           color: P.emerald, bg: "#D1FAE5" },
  { id: "lost", label: "Lost",          color: P.rose,    bg: "#FFE4E6" },
];
const KLEADS: KLead[] = [
  { col: "new",  name: "John D.",   desc: "Roof repair",         val: "$4.8k", when: "2h" },
  { col: "new",  name: "Sam T.",    desc: "Driveway sealcoat",   val: "$2.2k", when: "4h" },
  { col: "cont", name: "Priya R.",  desc: "Fence install",       val: "$3.2k", when: "1d" },
  { col: "cont", name: "Hassan A.", desc: "Gutter clean + repair", val: "$1.4k", when: "2d" },
  { col: "est",  name: "Maria S.",  desc: "Bathroom remodel",    val: "$12k",  when: "3d" },
  { col: "won",  name: "Chen K.",   desc: "Deck build",          val: "$8k",   when: "today" },
  { col: "won",  name: "Tasha K.",  desc: "Kitchen plumbing",    val: "$980",  when: "today" },
];
const AVATAR_GRAD = [
  `linear-gradient(135deg, ${P.brand},   ${P.indigo})`,
  `linear-gradient(135deg, ${P.violet},  ${P.fuchsia})`,
  `linear-gradient(135deg, ${P.emerald}, ${P.teal})`,
  `linear-gradient(135deg, ${P.amber},   ${P.orange})`,
  `linear-gradient(135deg, ${P.cyan},    ${P.brand})`,
  `linear-gradient(135deg, ${P.pink},    ${P.rose})`,
  `linear-gradient(135deg, ${P.indigo},  ${P.cyan})`,
];

function LeadCard({ lead, idx, highlight }: { lead: KLead; idx: number; highlight: boolean }) {
  const spot = useSpotlight<HTMLDivElement>();
  return (
    <div ref={spot}
      className="relative rounded-lg p-2.5 cursor-pointer transition-all duration-300 hover:-translate-y-0.5"
      style={{
        background: P.surface,
        border: `1px solid ${highlight ? P.brand : P.border}`,
        boxShadow: highlight
          ? `0 8px 20px -8px ${P.brand}66, 0 0 0 3px ${P.brand}22`
          : "0 1px 2px rgba(15,23,42,0.04)",
      } as CSSProperties}>
      <div className="absolute inset-0 pointer-events-none rounded-lg transition-opacity duration-300"
        style={{
          background: `radial-gradient(220px circle at var(--mx,50%) var(--my,50%), ${P.brand}18, transparent 45%)`,
          opacity: "var(--so, 0)" as unknown as number,
        }} />
      <div className="relative flex items-start gap-2">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] shrink-0"
          style={{
            background: AVATAR_GRAD[idx % AVATAR_GRAD.length],
            color: "#fff", fontFamily: SANS, fontWeight: 600,
            boxShadow: "0 2px 6px rgba(15,23,42,0.15)",
          }}>
          {lead.name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm truncate"
              style={{ color: P.text, fontFamily: SANS, fontWeight: 600 }}>
              {lead.name}
            </span>
            <span className="text-[10px]" style={{ color: P.subtle, fontFamily: MONO }}>
              {lead.when}
            </span>
          </div>
          <div className="text-[11px] truncate mt-0.5"
            style={{ color: P.muted, fontFamily: SANS }}>
            {lead.desc}
          </div>
          <div className="text-xs mt-1.5"
            style={{ color: P.text, fontFamily: MONO, fontWeight: 600 }}>
            {lead.val}
          </div>
        </div>
      </div>
    </div>
  );
}

function PipelineKanban() {
  const tilt = useTilt<HTMLDivElement>(2);
  const [flying, setFlying] = useState(false);
  useEffect(() => {
    const t = setInterval(() => {
      setFlying(true);
      setTimeout(() => setFlying(false), 3200);
    }, 6500);
    const t0 = setTimeout(() => {
      setFlying(true);
      setTimeout(() => setFlying(false), 3200);
    }, 2200);
    return () => { clearInterval(t); clearTimeout(t0); };
  }, []);

  return (
    <Reveal delay={120}>
      <div ref={tilt} className="rounded-2xl overflow-hidden"
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
              Lead pipeline
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: `${P.emerald}1c`, color: P.emerald,
                       fontFamily: SANS, fontWeight: 600 }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle"
                style={{ background: P.emerald, animation: "pulseDotV3 1.6s infinite" }} />
              Live
            </span>
          </div>
          <button className="text-xs flex items-center gap-1"
            style={{ color: P.brand, fontFamily: SANS, fontWeight: 600 }}>
            View all <ArrowUpRight size={11} />
          </button>
        </div>

        <div className="relative overflow-x-auto">
          <div className="flex gap-3 p-4 min-w-max">
            {COLS.map((col, ci) => {
              const colLeads = KLEADS.filter((L) => L.col === col.id);
              return (
                <div key={col.id} className="w-[200px] shrink-0"
                  style={{ animation: `colInV3 600ms cubic-bezier(.2,.7,.2,1) ${ci * 80}ms backwards` }}>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: col.color }} />
                      <span className="text-[11px] uppercase"
                        style={{ color: P.text, fontFamily: SANS,
                                 fontWeight: 700, letterSpacing: "0.1em" }}>
                        {col.label}
                      </span>
                      <span className="text-[10px]"
                        style={{ color: P.subtle, fontFamily: MONO }}>
                        {colLeads.length}
                      </span>
                    </div>
                    <MoreHorizontal size={13} style={{ color: P.subtle }} />
                  </div>
                  <div className="space-y-2 p-1.5 rounded-lg min-h-[100px]"
                    style={{ background: col.bg }}>
                    {colLeads.map((L, li) => (
                      <div key={li}
                        style={{ animation: `leadInV3 550ms cubic-bezier(.2,.7,.2,1) ${300 + ci * 80 + li * 60}ms backwards` }}>
                        <LeadCard lead={L}
                          idx={KLEADS.indexOf(L)}
                          highlight={flying && col.id === "cont" && L.name === "Priya R."} />
                      </div>
                    ))}
                    {colLeads.length === 0 && (
                      <div className="text-[11px] text-center py-3"
                        style={{ color: P.subtle, fontFamily: SANS, fontStyle: "italic" }}>
                        Empty
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {flying && (
            <div className="absolute pointer-events-none z-20"
              style={{ top: 60, left: 0, animation: "leadFlyV3 3.2s cubic-bezier(.45,.05,.3,1) forwards" }}>
              <div className="rounded-lg p-2.5 w-[180px]"
                style={{
                  background: P.surface,
                  border: `1.5px solid ${P.brand}`,
                  boxShadow: `0 18px 36px -10px ${P.brand}99, 0 0 0 4px ${P.brand}22`,
                }}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] shrink-0"
                    style={{
                      background: AVATAR_GRAD[2],
                      color: "#fff", fontFamily: SANS, fontWeight: 600,
                    }}>P</div>
                  <div className="min-w-0">
                    <div className="text-sm" style={{ color: P.text, fontFamily: SANS, fontWeight: 600 }}>
                      Priya R.
                    </div>
                    <div className="flex items-center gap-1 text-[10px] mt-0.5"
                      style={{ color: P.brand, fontFamily: SANS, fontWeight: 600 }}>
                      <Sparkles size={9} /> AI moving to Estimate sent
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Reveal>
  );
}

/* ================================================================== */
/*  REVENUE CHART                                                     */
/* ================================================================== */
function RevenueChart() {
  const data = [12, 18, 15, 22, 28, 26, 35, 42, 48];
  const W = 420, H = 110;
  const maxV = Math.max(...data);
  const stepX = W / (data.length - 1);
  const pts = data.map((v, i) => [i * stepX, H - (v / maxV) * H * 0.78 - 6]);
  const linePath = pts.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(" ");
  const areaPath = `${linePath} L ${W} ${H} L 0 ${H} Z`;
  const [drawn, setDrawn] = useState(false);
  const ref = useRef<SVGSVGElement | null>(null);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setDrawn(true),
      { threshold: 0.4 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return (
    <Reveal delay={80}>
      <div className="rounded-2xl p-5"
        style={{
          background: P.surface,
          border: `1px solid ${P.border}`,
          boxShadow: "0 8px 24px -12px rgba(15,23,42,0.08)",
        }}>
        <div className="flex items-baseline justify-between mb-2">
          <div>
            <h3 style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 500,
                         color: P.text, letterSpacing: "-0.01em" }}>
              Revenue this <span style={{ fontStyle: "italic" }}>quarter</span>
            </h3>
            <div className="flex items-baseline gap-2 mt-1">
              <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600, color: P.text }}>
                $<ScrambleText to={246} sep />K
              </span>
              <span className="text-xs flex items-center gap-0.5"
                style={{ color: P.emerald, fontFamily: SANS, fontWeight: 600 }}>
                <TrendingUp size={11} /> +24% vs Q1
              </span>
            </div>
          </div>
          <div className="flex gap-1 text-[11px]" style={{ fontFamily: SANS }}>
            {["Week", "Month", "Quarter"].map((p, i) => (
              <button key={p} className="px-2.5 py-1 rounded transition-colors"
                style={{
                  background: i === 2 ? P.surface2 : "transparent",
                  color: i === 2 ? P.text : P.muted,
                  fontWeight: i === 2 ? 600 : 500,
                }}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <svg ref={ref} viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full" style={{ height: 110 }}>
          <defs>
            <linearGradient id="rev-grad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%"   stopColor={P.brand} stopOpacity="0.28" />
              <stop offset="100%" stopColor={P.brand} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#rev-grad)" style={{
            opacity: drawn ? 1 : 0,
            transition: "opacity 800ms ease-out 1300ms",
          }} />
          <path d={linePath} fill="none" stroke={P.brand}
            strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" style={{
              strokeDasharray: 800,
              strokeDashoffset: drawn ? 0 : 800,
              transition: "stroke-dashoffset 1600ms cubic-bezier(.6,.04,.34,.99)",
              filter: `drop-shadow(0 2px 6px ${P.brand}55)`,
            }} />
          {pts.map((p, i) => (
            <g key={i}>
              <circle cx={p[0]} cy={p[1]} r="6" fill={P.brand} style={{
                opacity: drawn ? 0.18 : 0,
                transition: `opacity 300ms ease-out ${1100 + i * 90}ms`,
              }} />
              <circle cx={p[0]} cy={p[1]} r="2.5" fill={P.brand} style={{
                opacity: drawn ? 1 : 0,
                transition: `opacity 300ms ease-out ${1100 + i * 90}ms`,
              }} />
            </g>
          ))}
        </svg>
      </div>
    </Reveal>
  );
}

/* ================================================================== */
/*  AI FOLLOW-UP                                                      */
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
              background: `${P.brand}15`,
              color: P.brand,
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
                             animation: `thinkDotV3 1.2s ease-in-out ${i * 0.15}s infinite` }} />
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
                  style={{ background: P.brand, animation: "caretV3 1s steps(2) infinite" }} />
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
            <button className="text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-md transition-colors hover:bg-white"
              style={{ color: P.muted, fontFamily: SANS, fontWeight: 500 }}>
              Edit tone
            </button>
          </div>
          <button ref={sendRef}
            disabled={phase !== "done"}
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
            {phase === "done" && (
              <span className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background: "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)",
                  animation: "shimmerV3 1.6s linear infinite",
                }} />
            )}
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
/*  REMINDERS RAIL                                                    */
/* ================================================================== */
interface Reminder { who: string; what: string; when: string; pct: number; idx: number; urgent?: boolean; }
const REMINDERS: Reminder[] = [
  { who: "Priya R.",  what: "Call back re: fence quote",     when: "2:00 PM",  pct: 75, idx: 2, urgent: true },
  { who: "Maria S.",  what: "Send revised bathroom estimate", when: "4:30 PM",  pct: 40, idx: 4 },
  { who: "John D.",   what: "Confirm site visit Wednesday",   when: "Tomorrow", pct: 15, idx: 0 },
];

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

function RemindersRail() {
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
            {REMINDERS.length}
          </span>
        </div>
        <div className="space-y-2">
          {REMINDERS.map((r, i) => (
            <div key={i}
              className="flex items-start gap-3 p-2.5 rounded-lg transition-colors hover:bg-slate-50"
              style={{ animation: `reminderInV3 600ms cubic-bezier(.2,.7,.2,1) ${250 + i * 100}ms backwards` }}>
              <div className="relative w-9 h-9 shrink-0">
                <CircularProgress pct={r.pct} color={r.urgent ? P.rose : P.brand} size={36} />
                <div className="absolute inset-1 rounded-full flex items-center justify-center text-[10px]"
                  style={{
                    background: AVATAR_GRAD[r.idx % AVATAR_GRAD.length],
                    color: "#fff", fontFamily: SANS, fontWeight: 600,
                  }}>
                  {r.who.charAt(0)}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm" style={{ color: P.text, fontFamily: SANS, fontWeight: 600 }}>
                    {r.who}
                  </span>
                  {r.urgent && <AlertCircle size={11} style={{ color: P.rose }} />}
                </div>
                <div className="text-[11px] truncate"
                  style={{ color: P.muted, fontFamily: SANS }}>
                  {r.what}
                </div>
                <div className="text-[10px] mt-1 flex items-center gap-1"
                  style={{ color: r.urgent ? P.rose : P.subtle, fontFamily: MONO, fontWeight: 600 }}>
                  <Clock size={9} /> {r.when}
                </div>
              </div>
              <button className="text-[10px] px-2 py-1 rounded-md shrink-0"
                style={{ background: P.brand, color: "#fff", fontFamily: SANS, fontWeight: 600 }}>
                Done
              </button>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

/* ================================================================== */
/*  ACTIVITY FEED                                                     */
/* ================================================================== */
interface Activity { I: LucideIcon; color: string; t: string; s: string; }
const ACTIVITIES: Activity[] = [
  { I: CheckCircle2,    color: P.emerald, t: "Job won",                s: "Chen K. · +$8,200" },
  { I: Sparkles,        color: P.brand,   t: "AI drafted follow-up",   s: "To Maria S. · sent in 28s" },
  { I: Phone,           color: P.indigo,  t: "Inbound call routed",    s: "Priya R. · transcript saved" },
  { I: ShoppingBag,     color: P.violet,  t: "New marketplace lead",   s: "Apex Fencing · 2 mi away" },
  { I: MessageSquare,   color: P.cyan,    t: "Reply received",         s: "John D. · sending photos now" },
];

interface FeedItem extends Activity { id: number; }

function ActivityFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const idxRef = useRef(0);
  useEffect(() => {
    const push = () => {
      const a = ACTIVITIES[idxRef.current % ACTIVITIES.length];
      idxRef.current++;
      const id = Date.now();
      setItems((p) => [{ ...a, id }, ...p].slice(0, 3));
      setTimeout(() => {
        setItems((p) => p.filter((x) => x.id !== id));
      }, 5800);
    };
    const t0 = setTimeout(push, 1500);
    const t1 = setInterval(push, 3400);
    return () => { clearTimeout(t0); clearInterval(t1); };
  }, []);

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-2 w-[300px] pointer-events-none">
      {items.map((it) => (
        <div key={it.id}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg backdrop-blur-md pointer-events-auto"
          style={{
            background: "rgba(255,255,255,0.92)",
            border: `1px solid ${P.border}`,
            boxShadow: `0 16px 32px -10px rgba(15,23,42,0.18), 0 0 0 1px ${it.color}33`,
            animation: "toastInV3 380ms cubic-bezier(.2,.9,.3,1.1)",
          }}>
          <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
            style={{ background: `${it.color}1a`, color: it.color }}>
            <it.I size={13} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs" style={{ color: P.text, fontFamily: SANS, fontWeight: 600 }}>
              {it.t}
            </div>
            <div className="text-[10px] truncate" style={{ color: P.muted, fontFamily: SANS }}>
              {it.s}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  LEADS MAP — dark canvas radar                                     */
/* ================================================================== */
const MAP_HQ = { x: 50, y: 54 };
interface MapPin {
  id: number; x: number; y: number; name: string; job: string;
  val: string; mi: string; stage: "new" | "cont" | "est" | "won"; city: string;
}
const MAP_PINS: MapPin[] = [
  { id: 1, x: 28, y: 30, name: "Maria S.",  job: "Bathroom remodel",  val: "$12k",  mi: "6.4",  stage: "est",  city: "Worcester, MA" },
  { id: 2, x: 68, y: 26, name: "Chen K.",   job: "Deck build",        val: "$8k",   mi: "12.1", stage: "won",  city: "Cambridge, MA" },
  { id: 3, x: 54, y: 76, name: "Priya R.",  job: "Fence install",     val: "$3.2k", mi: "4.8",  stage: "cont", city: "Quincy, MA" },
  { id: 4, x: 22, y: 64, name: "John D.",   job: "Roof repair",       val: "$4.8k", mi: "9.3",  stage: "new",  city: "Providence, RI" },
  { id: 5, x: 76, y: 62, name: "Sam T.",    job: "Driveway sealcoat", val: "$2.2k", mi: "7.0",  stage: "new",  city: "Braintree, MA" },
  { id: 6, x: 74, y: 16, name: "Hassan A.", job: "Gutter clean",      val: "$1.4k", mi: "14.2", stage: "cont", city: "Lowell, MA" },
  { id: 7, x: 36, y: 14, name: "Tasha K.",  job: "Kitchen plumbing",  val: "$980",  mi: "16.8", stage: "won",  city: "Manchester, NH" },
  { id: 8, x: 84, y: 80, name: "Diego P.",  job: "Interior paint",    val: "$5.4k", mi: "11.4", stage: "est",  city: "Brockton, MA" },
];
const STAGE_MAP: Record<"new" | "cont" | "est" | "won", { color: string; label: string }> = {
  new:  { color: "#94A3B8", label: "New" },
  cont: { color: "#3B82F6", label: "Contacted" },
  est:  { color: "#F59E0B", label: "Estimate sent" },
  won:  { color: "#10B981", label: "Won" },
};

function LeadPin({ pin, active, flashing, onClick }: {
  pin: MapPin; active: boolean; flashing: boolean; onClick: () => void;
}) {
  const stage = STAGE_MAP[pin.stage] || STAGE_MAP.new;
  const showHalo = active || flashing;
  return (
    <button onClick={onClick}
      className="absolute pointer-events-auto"
      style={{
        left: `${pin.x}%`,
        top: `${pin.y}%`,
        transform: "translate(-50%, -50%)",
        zIndex: active ? 20 : flashing ? 15 : 8,
      }}>
      <span className="absolute left-1/2 top-1/2 block w-10 h-10 rounded-full"
        style={{
          background: `radial-gradient(circle, ${stage.color}40, transparent 70%)`,
          transform: "translate(-50%, -50%)",
          animation: "pingSoftV3 2.6s ease-out infinite",
        }} />
      {showHalo && (
        <>
          <span className="absolute left-1/2 top-1/2 block w-14 h-14 rounded-full"
            style={{
              background: `radial-gradient(circle, ${stage.color}88, transparent 65%)`,
              transform: "translate(-50%, -50%)",
              animation: "pingSoftV3 1.4s ease-out infinite",
            }} />
          <span className="absolute left-1/2 top-1/2 block w-9 h-9 rounded-full"
            style={{
              background: `radial-gradient(circle, ${stage.color}aa, transparent 65%)`,
              transform: "translate(-50%, -50%)",
              animation: "pingSoftV3 1.4s ease-out 0.45s infinite",
            }} />
        </>
      )}
      <div className="relative rounded-full"
        style={{
          width: active ? 14 : 10,
          height: active ? 14 : 10,
          background: stage.color,
          boxShadow: `0 0 0 2px rgba(15,23,42,0.95), 0 0 ${active ? 22 : 12}px ${stage.color}`,
          transition: "all 320ms cubic-bezier(.2,.7,.2,1)",
        }} />
      {(active || flashing) && (
        <div className="absolute left-1/2 -translate-x-1/2 mt-2 px-2 py-0.5 rounded-md whitespace-nowrap"
          style={{
            top: "100%",
            background: "rgba(15,23,42,0.95)",
            border: `1px solid ${stage.color}66`,
            animation: "tagInV3 280ms cubic-bezier(.2,.7,.2,1)",
          }}>
          <div className="text-[10px]" style={{ color: "#fff", fontFamily: SANS, fontWeight: 600 }}>
            {pin.name}
          </div>
        </div>
      )}
    </button>
  );
}

function LeadsMap() {
  const tilt = useTilt<HTMLDivElement>(2);
  const [active, setActive] = useState(2);
  const [flashing, setFlashing] = useState<number | null>(null);

  useEffect(() => {
    const fire = () => {
      const ids = MAP_PINS.map((p) => p.id).filter((id) => id !== active);
      const r = ids[Math.floor(Math.random() * ids.length)];
      setFlashing(r);
      setTimeout(() => setFlashing(null), 2400);
    };
    const t0 = setTimeout(fire, 3000);
    const t = setInterval(fire, 6500);
    return () => { clearTimeout(t0); clearInterval(t); };
  }, [active]);

  const activePin = MAP_PINS.find((p) => p.id === active);
  const stageCounts: Record<string, number> = MAP_PINS.reduce((acc, p) => {
    acc[p.stage] = (acc[p.stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Reveal delay={100}>
      <div ref={tilt} className="rounded-2xl overflow-hidden"
        style={{
          background: P.surface,
          border: `1px solid ${P.border}`,
          boxShadow: "0 20px 50px -18px rgba(15,23,42,0.18)",
        }}>
        <div className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: `1px solid ${P.border}` }}>
          <div className="flex items-center gap-2">
            <h3 style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 500,
                         color: P.text, letterSpacing: "-0.01em" }}>
              Leads <span style={{ fontStyle: "italic" }}>nearby</span>
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1"
              style={{
                background: `${P.brand}1a`, color: P.brand,
                fontFamily: SANS, fontWeight: 700, letterSpacing: "0.1em",
              }}>
              <Radio size={10} style={{ animation: "spinV3 2.4s linear infinite" }} />
              SCANNING
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-xs"
            style={{ fontFamily: SANS, color: P.muted }}>
            <div><span style={{ color: P.subtle }}>Avg · </span>
              <span style={{ color: P.text, fontWeight: 600, fontFamily: MONO }}>8.4mi</span></div>
            <div><span style={{ color: P.subtle }}>Sources · </span>
              <span style={{ color: P.text, fontWeight: 600, fontFamily: MONO }}>
                <CountUp to={13} />
              </span></div>
            <button className="text-xs flex items-center gap-1"
              style={{ color: P.brand, fontWeight: 600 }}>
              View all <ArrowUpRight size={11} />
            </button>
          </div>
        </div>

        <div className="relative overflow-hidden"
          style={{
            height: "clamp(320px, 50vw, 440px)",
            background: "radial-gradient(ellipse at 50% 55%, #1E293B 0%, #0F172A 70%, #020617 100%)",
          }}>
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300"
            preserveAspectRatio="none">
            <defs>
              <linearGradient id="contourGrad-v3" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%"   stopColor="#3B82F6" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.12" />
              </linearGradient>
            </defs>
            {Array.from({ length: 22 }).map((_, i) => (
              <path key={i}
                d={`M -20 ${10 + i * 14} Q 100 ${5 + i * 14 + Math.sin(i * 1.4) * 12}, 200 ${12 + i * 14}, T 420 ${10 + i * 14}`}
                stroke="url(#contourGrad-v3)" strokeWidth="0.5" fill="none"
                opacity={i % 3 === 0 ? 0.55 : 0.18} />
            ))}
          </svg>

          {[
            { x: 30, y: 25, c: "#F59E0B" },
            { x: 70, y: 22, c: "#10B981" },
            { x: 28, y: 65, c: "#94A3B8" },
            { x: 80, y: 72, c: "#F59E0B" },
          ].map((b, i) => (
            <div key={i} className="absolute pointer-events-none"
              style={{
                left: `${b.x}%`, top: `${b.y}%`,
                width: 140, height: 140,
                transform: "translate(-50%, -50%)",
                background: `radial-gradient(circle, ${b.c}40, transparent 70%)`,
                filter: "blur(24px)",
                animation: `breatheV3 4.5s ease-in-out ${i * 0.6}s infinite`,
              }} />
          ))}

          {[0, 2, 4].map((d, i) => (
            <div key={i} className="absolute rounded-full pointer-events-none"
              style={{
                left: `${MAP_HQ.x}%`, top: `${MAP_HQ.y}%`,
                width: 380, height: 380,
                border: "1px dashed rgba(59,130,246,0.45)",
                animation: `ringExpandV3 6s ease-out ${d}s infinite`,
                transformOrigin: "center",
              }} />
          ))}

          <div className="absolute pointer-events-none"
            style={{
              left: `${MAP_HQ.x}%`, top: `${MAP_HQ.y}%`,
              width: "160%", aspectRatio: "1",
              transform: "translate(-50%, -50%)",
              background: "conic-gradient(from 0deg, transparent 0deg, rgba(59,130,246,0.22) 10deg, rgba(99,102,241,0.06) 40deg, transparent 70deg, transparent 360deg)",
              animation: "radarSweepV3 4.5s linear infinite",
              borderRadius: "50%",
              maskImage: "radial-gradient(circle, black 22%, transparent 60%)",
              WebkitMaskImage: "radial-gradient(circle, black 22%, transparent 60%)",
            }} />

          <svg className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100" preserveAspectRatio="none">
            {MAP_PINS.map((p) => {
              const stage = STAGE_MAP[p.stage] || STAGE_MAP.new;
              const isActive = p.id === active;
              const isFlashing = p.id === flashing;
              return (
                <line key={p.id}
                  x1={MAP_HQ.x} y1={MAP_HQ.y}
                  x2={p.x} y2={p.y}
                  stroke={isActive || isFlashing ? stage.color : "#3B82F6"}
                  strokeWidth={isActive || isFlashing ? 1.4 : 0.7}
                  strokeDasharray="3 4"
                  opacity={isActive ? 0.75 : isFlashing ? 0.55 : 0.18}
                  vectorEffect="non-scaling-stroke"
                  style={{
                    animation: `dashFlowV3 ${isActive ? 1.4 : 2}s linear infinite`,
                    transition: "opacity 400ms, stroke 400ms, stroke-width 400ms",
                  }} />
              );
            })}
          </svg>

          <div className="absolute"
            style={{
              left: `${MAP_HQ.x}%`, top: `${MAP_HQ.y}%`,
              transform: "translate(-50%, -50%)",
              zIndex: 7,
            }}>
            <span className="absolute left-1/2 top-1/2 block w-24 h-24 rounded-full"
              style={{
                background: `radial-gradient(circle, ${P.brand}66, transparent 65%)`,
                transform: "translate(-50%, -50%)",
                filter: "blur(10px)",
                animation: "breatheV3 3s ease-in-out infinite",
              }} />
            <span className="absolute left-1/2 top-1/2 block w-12 h-12 rounded-full"
              style={{
                border: `1.5px solid ${P.brandHi}`,
                transform: "translate(-50%, -50%)",
                boxShadow: `0 0 24px ${P.brand}`,
              }} />
            <div className="relative w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${P.brand}, ${P.indigo}, ${P.violet})`,
                boxShadow: `0 6px 20px ${P.brand}aa, inset 0 1px 0 rgba(255,255,255,0.35)`,
              }}>
              <Building2 size={16} color="#fff" />
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap px-2.5 py-1 rounded-md"
              style={{
                top: "100%",
                background: "rgba(15,23,42,0.92)",
                border: `1px solid ${P.brand}55`,
                boxShadow: "0 6px 14px rgba(0,0,0,0.4)",
              }}>
              <div className="text-[9px] uppercase text-center" style={{
                color: P.brandHi, fontFamily: SANS, fontWeight: 700, letterSpacing: "0.14em",
              }}>HQ</div>
              <div className="text-[11px] -mt-0.5" style={{
                color: "#fff", fontFamily: SANS, fontWeight: 600,
              }}>Reliable Roofing</div>
            </div>
          </div>

          {MAP_PINS.map((p, i) => (
            <div key={p.id}
              style={{ animation: `pinDropV3 700ms cubic-bezier(.5,1.4,.5,1) ${400 + i * 90}ms backwards` }}>
              <LeadPin pin={p}
                active={p.id === active}
                flashing={p.id === flashing}
                onClick={() => setActive(p.id)} />
            </div>
          ))}

          <div className="absolute top-3 left-3 px-2.5 py-2 rounded-lg backdrop-blur-md"
            style={{
              background: "rgba(15,23,42,0.7)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}>
            <div className="text-[9px] uppercase mb-1.5" style={{
              color: "#94A3B8", fontFamily: SANS, fontWeight: 700, letterSpacing: "0.14em",
            }}>STAGE</div>
            {(Object.entries(STAGE_MAP) as Array<[keyof typeof STAGE_MAP, { color: string; label: string }]>).map(([k, s]) => (
              <div key={k} className="flex items-center gap-1.5 text-[10px]"
                style={{ color: "#CBD5E1", fontFamily: SANS, fontWeight: 500 }}>
                <span className="w-1.5 h-1.5 rounded-full"
                  style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
                <span className="flex-1">{s.label}</span>
                <span className="opacity-60" style={{ fontFamily: MONO }}>
                  {stageCounts[k] || 0}
                </span>
              </div>
            ))}
          </div>

          {flashing && (() => {
            const fp = MAP_PINS.find((p) => p.id === flashing);
            if (!fp) return null;
            const fc = STAGE_MAP[fp.stage]?.color || P.brand;
            return (
              <div className="absolute top-3 right-3 flex items-center gap-2.5 px-3 py-2 rounded-lg backdrop-blur-md"
                style={{
                  background: "rgba(15,23,42,0.88)",
                  border: `1px solid ${fc}66`,
                  boxShadow: `0 0 28px ${fc}55`,
                  animation: "toastInV3 380ms cubic-bezier(.2,.9,.3,1.1)",
                }}>
                <span className="relative flex w-2 h-2">
                  <span className="absolute inline-flex h-full w-full rounded-full"
                    style={{ background: fc, animation: "pulseDotV3 1.4s infinite" }} />
                  <span className="relative inline-flex rounded-full h-2 w-2"
                    style={{ background: fc }} />
                </span>
                <div>
                  <div className="text-[9px] uppercase" style={{
                    color: fc, fontFamily: SANS, fontWeight: 700, letterSpacing: "0.16em",
                  }}>NEW LEAD</div>
                  <div className="text-xs" style={{ color: "#fff", fontFamily: SANS, fontWeight: 500 }}>
                    <span style={{ fontFamily: MONO }}>{fp.mi}mi</span> · {fp.val} · {fp.city}
                  </div>
                </div>
              </div>
            );
          })()}

          {activePin && (
            <div key={activePin.id}
              className="absolute left-3 right-3 sm:left-auto sm:right-3 sm:max-w-md bottom-3 rounded-xl backdrop-blur-md p-3 flex items-center gap-3"
              style={{
                background: "rgba(15,23,42,0.92)",
                border: `1px solid ${STAGE_MAP[activePin.stage]?.color}66`,
                boxShadow: `0 20px 40px -10px rgba(0,0,0,0.6), 0 0 0 1px ${STAGE_MAP[activePin.stage]?.color}33`,
                animation: "slideUpFadeV3 420ms cubic-bezier(.2,.7,.2,1)",
              }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs shrink-0"
                style={{
                  background: AVATAR_GRAD[activePin.id % AVATAR_GRAD.length],
                  color: "#fff", fontFamily: SANS, fontWeight: 600,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                }}>
                {activePin.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span style={{ color: "#fff", fontFamily: SANS, fontWeight: 600, fontSize: 14 }}>
                    {activePin.name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{
                      background: `${STAGE_MAP[activePin.stage]?.color}26`,
                      color: STAGE_MAP[activePin.stage]?.color,
                      fontFamily: SANS, fontWeight: 700, letterSpacing: "0.05em",
                    }}>
                    {STAGE_MAP[activePin.stage]?.label}
                  </span>
                </div>
                <div className="text-[11px] truncate"
                  style={{ color: "#94A3B8", fontFamily: SANS }}>
                  {activePin.job} · {activePin.city} ·{" "}
                  <span style={{ fontFamily: MONO, color: "#CBD5E1" }}>{activePin.mi}mi</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div style={{ color: "#fff", fontFamily: MONO, fontWeight: 600, fontSize: 15 }}>
                  {activePin.val}
                </div>
              </div>
              <button className="hidden sm:flex text-[11px] items-center gap-1 px-2.5 py-1.5 rounded-md shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${P.brand}, ${P.indigo})`,
                  color: "#fff", fontFamily: SANS, fontWeight: 600,
                  boxShadow: `0 6px 14px -4px ${P.brand}88`,
                }}>
                Open <ChevronRight size={11} />
              </button>
            </div>
          )}
        </div>
      </div>
    </Reveal>
  );
}

/* ================================================================== */
/*  PAGE                                                              */
/* ================================================================== */
export default function DashboardV3() {
  useEffect(() => {
    if (document.getElementById("cf-fonts-v3-dash")) return;
    const link = document.createElement("link");
    link.id = "cf-fonts-v3-dash";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap";
    document.head.appendChild(link);
  }, []);

  return (
    <>
      <style>{`
        @keyframes pulseDotV3     { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(2.4); opacity: 0; } }
        @keyframes breatheV3      { 0%,100% { opacity: 0.55; } 50% { opacity: 1; } }
        @keyframes shimmerV3      { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes shimmerSweepV3 { from { transform: translateX(-120%); } to { transform: translateX(120%); } }
        @keyframes auroraShiftV3  { 0% { transform: translate(-50%, 0) scale(1); opacity: 0.85; } 50% { transform: translate(-48%, 1%) scale(1.05); opacity: 1; } 100% { transform: translate(-52%, -1%) scale(1); opacity: 0.85; } }
        @keyframes thinkDotV3     { 0%, 100% { transform: scale(0.6); opacity: 0.4; } 50% { transform: scale(1.2); opacity: 1; } }
        @keyframes caretV3        { 50% { opacity: 0; } }
        @keyframes colInV3        { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes leadInV3       { from { opacity: 0; transform: translateY(6px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes reminderInV3   { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes toastInV3      { from { opacity: 0; transform: translateY(14px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes leadFlyV3 {
          0% { left: 290px; top: 70px; opacity: 0; transform: scale(0.92) rotate(-3deg); }
          12% { opacity: 1; }
          50% { left: 480px; top: 30px; opacity: 1; transform: scale(1.04) rotate(-1deg); }
          88% { opacity: 1; }
          100% { left: 680px; top: 70px; opacity: 0; transform: scale(0.96) rotate(2deg); }
        }
        @keyframes radarSweepV3   { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
        @keyframes dashFlowV3     { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -14; } }
        @keyframes ringExpandV3   { 0% { transform: translate(-50%, -50%) scale(0.25); opacity: 0; } 15% { opacity: 0.6; } 100% { transform: translate(-50%, -50%) scale(1.6); opacity: 0; } }
        @keyframes pingSoftV3     { 0% { transform: translate(-50%, -50%) scale(0.55); opacity: 0.95; } 80%, 100% { transform: translate(-50%, -50%) scale(2); opacity: 0; } }
        @keyframes pinDropV3      { from { opacity: 0; transform: translateY(-16px) scale(0.7); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes tagInV3        { from { opacity: 0; transform: translate(-50%, -6px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes slideUpFadeV3  { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spinV3         { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (hover: hover) { .cf-dash-v3, .cf-dash-v3 a, .cf-dash-v3 button { cursor: none; } .cf-dash-v3 input { cursor: text; } }
      `}</style>

      <div className="cf-dash-v3" style={{ background: P.bg, color: P.text, minHeight: "100vh",
                    fontFamily: SANS, position: "relative" }}>
        <PageBackground />
        <CursorGlow />
        <ScrollProgress />
        <TopBar />

        <div className="max-w-[1320px] mx-auto px-5 flex gap-5">
          <Sidebar />

          <main className="flex-1 min-w-0 py-6">
            <Greeting />

            <div className="mt-6"><StatTiles /></div>
            <div className="mt-5"><PipelineKanban /></div>
            <div className="mt-5"><LeadsMap /></div>

            <div className="mt-5 grid lg:grid-cols-5 gap-5">
              <div className="lg:col-span-3 space-y-5">
                <AIFollowUp />
                <RevenueChart />
              </div>
              <div className="lg:col-span-2 space-y-5">
                <RemindersRail />
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
                        animation: "breatheV3 4s ease-in-out infinite",
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
                        Maria S. opened your estimate <span style={{ fontStyle: "italic" }}>3 times</span> yesterday.
                      </h3>
                      <p className="mt-2 text-sm opacity-90"
                        style={{ fontFamily: SANS, lineHeight: 1.5 }}>
                        She&apos;s interested. A quick call now could close it — want me to draft a script?
                      </p>
                      <button className="mt-3 text-xs px-3 py-1.5 rounded-md inline-flex items-center gap-1"
                        style={{
                          background: "#fff",
                          color: P.brand,
                          fontFamily: SANS, fontWeight: 600,
                        }}>
                        Draft script <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                </Reveal>
              </div>
            </div>

            <div className="mt-10 mb-6 text-center text-[10px] uppercase"
              style={{ color: P.subtle, fontFamily: SANS,
                       letterSpacing: "0.24em", fontWeight: 600 }}>
              ContractorFlow · Built for crews · v2.0
            </div>
          </main>
        </div>

        <ActivityFeed />
      </div>
    </>
  );
}
