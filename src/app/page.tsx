"use client";

import { useState, useEffect, useRef, type ReactNode, type CSSProperties } from "react";
import Link from "next/link";
import {
  Sparkles, ArrowRight, Download, Play, Zap, DollarSign, Inbox,
  Briefcase, Calendar, Users, ShoppingBag, Phone,
  type LucideIcon,
} from "lucide-react";

/* ================================================================== */
/*  PALETTE & FONTS                                                   */
/* ================================================================== */
const P = {
  bg:        "#06060A",
  bg2:       "#11111A",
  bg3:       "#1B1B26",
  border:    "rgba(255,255,255,0.07)",
  borderHi:  "rgba(255,255,255,0.14)",
  text:      "#FAFAFA",
  muted:     "#A1A1AA",
  subtle:    "#71717A",
  indigo:    "#6366f1",
  indigoHi:  "#818cf8",
  indigoDim: "#4F46E5",
  green:     "#22c55e",
  amber:     "#F59E0B",
  violet:    "#A78BFA",
  pink:      "#F472B6",
};
const SERIF = 'var(--font-instrument-serif), "Times New Roman", serif';
const SANS  = 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, sans-serif';
const MONO  = 'var(--font-geist-mono), "SF Mono", ui-monospace, monospace';

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
    el.style.willChange = "transform";
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

function useTilt<T extends HTMLElement>(max = 7) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || isTouchDevice()) return;
    el.style.transformStyle = "preserve-3d";
    el.style.willChange = "transform";
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transition = "transform 120ms linear";
      el.style.transform =
        `perspective(1400px) rotateX(${-y * max}deg) rotateY(${x * max}deg) scale(1.01)`;
    };
    const onLeave = () => {
      el.style.transition = "transform 700ms cubic-bezier(.2,.7,.2,1)";
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
function Reveal({ children, delay = 0, y = 28, className = "" }: {
  children: ReactNode; delay?: number; y?: number; className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setV(true),
      { threshold: 0.1 }
    );
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} style={{
      opacity: v ? 1 : 0,
      transform: v ? "translateY(0)" : `translateY(${y}px)`,
      transition: `opacity 900ms cubic-bezier(.2,.7,.2,1) ${delay}ms, transform 900ms cubic-bezier(.2,.7,.2,1) ${delay}ms`,
    }}>{children}</div>
  );
}

function CountUp({ to, duration = 1600, prefix = "", suffix = "", sep = false }: {
  to: number; duration?: number; prefix?: string; suffix?: string; sep?: boolean;
}) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    let started = false;
    let raf = 0;
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

function ScrambleText({ to, duration = 1400, prefix = "", suffix = "", sep = false }: {
  to: number; duration?: number; prefix?: string; suffix?: string; sep?: boolean;
}) {
  const target = sep ? to.toLocaleString() : String(to);
  const [val, setVal] = useState(target.replace(/\d/g, "0"));
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    let started = false;
    let raf = 0;
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

function letters(text: string, baseDelay = 0, perChar = 24, extraStyle: CSSProperties = {}) {
  return [...text].map((ch, i) => (
    <span key={`${baseDelay}-${i}`} className="inline-block" style={{
      animation: `letterIn 800ms cubic-bezier(.2,.7,.2,1) ${baseDelay + i * perChar}ms backwards`,
      whiteSpace: "pre",
      ...extraStyle,
    }}>
      {ch === " " ? " " : ch}
    </span>
  ));
}

/* ================================================================== */
/*  GLOBAL OVERLAYS                                                   */
/* ================================================================== */
function CursorGlow() {
  const ref = useRef<HTMLDivElement | null>(null);
  const ring = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (isTouchDevice()) return;
    let raf = 0, tx = -100, ty = -100, x = -100, y = -100, rx = -100, ry = -100;
    const onMove = (e: MouseEvent) => { tx = e.clientX; ty = e.clientY; };
    const loop = () => {
      x += (tx - x) * 0.22;
      y += (ty - y) * 0.22;
      rx += (tx - rx) * 0.08;
      ry += (ty - ry) * 0.08;
      if (ref.current)
        ref.current.style.transform = `translate3d(${x - 18}px, ${y - 18}px, 0)`;
      if (ring.current)
        ring.current.style.transform = `translate3d(${rx - 16}px, ${ry - 16}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <>
      <div ref={ref} className="pointer-events-none fixed top-0 left-0 z-[60] hidden md:block"
        style={{
          width: 36, height: 36,
          background: `radial-gradient(circle, ${P.indigoHi}cc 0%, transparent 60%)`,
          filter: "blur(10px)",
          mixBlendMode: "screen",
        }} />
      <div ref={ring} className="pointer-events-none fixed top-0 left-0 z-[60] hidden md:block"
        style={{
          width: 32, height: 32,
          border: `1px solid ${P.indigoHi}55`,
          borderRadius: "50%",
          mixBlendMode: "screen",
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
      style={{ background: "rgba(255,255,255,0.04)" }}>
      <div ref={ref} className="h-full"
        style={{
          background: `linear-gradient(90deg, ${P.indigoHi}, ${P.violet}, ${P.pink})`,
          transform: "scaleX(0)",
          transformOrigin: "left",
          boxShadow: `0 0 12px ${P.indigo}`,
        }} />
    </div>
  );
}

function AuroraBg() {
  return (
    <>
      <div className="fixed inset-0 pointer-events-none -z-10" style={{
        background: `radial-gradient(ellipse 70% 50% at 18% 8%,  ${P.indigo}26, transparent 60%),
                     radial-gradient(ellipse 60% 45% at 82% 28%, ${P.violet}1f, transparent 60%),
                     radial-gradient(ellipse 70% 50% at 50% 92%, ${P.pink}14, transparent 60%)`,
        animation: "auroraShift 22s ease-in-out infinite alternate",
      }} />
      <div className="fixed inset-0 pointer-events-none -z-10 opacity-[0.12]" style={{
        backgroundImage: `linear-gradient(rgba(129,140,248,0.55) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(129,140,248,0.55) 1px, transparent 1px)`,
        backgroundSize: "64px 64px",
        WebkitMaskImage: "radial-gradient(ellipse 60% 50% at center, black 0%, transparent 80%)",
        maskImage: "radial-gradient(ellipse 60% 50% at center, black 0%, transparent 80%)",
        animation: "gridDrift 40s linear infinite",
      }} />
    </>
  );
}

/* ================================================================== */
/*  BUTTONS                                                           */
/* ================================================================== */
function MagneticButton({ children, primary = true, compact = false, href, onClick }: {
  children: ReactNode; primary?: boolean; compact?: boolean; href?: string; onClick?: () => void;
}) {
  const refBtn = useMagnetic<HTMLButtonElement>(0.28);
  const refLink = useMagnetic<HTMLAnchorElement>(0.28);
  const sty: CSSProperties = {
    ...(compact ? { padding: "6px 14px", fontSize: 13 } : { padding: "12px 20px", fontSize: 14 }),
    background: primary ? P.text : "transparent",
    color: primary ? P.bg : P.text,
    border: primary ? "none" : `1px solid ${P.borderHi}`,
    fontFamily: SANS,
    fontWeight: 600,
    boxShadow: primary
      ? `0 14px 30px -10px rgba(255,255,255,0.25), inset 0 1px 0 rgba(255,255,255,0.4)`
      : "none",
  };
  const inner = (
    <>
      {primary && (
        <span className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: `linear-gradient(120deg, transparent 30%, rgba(99,102,241,0.4) 50%, transparent 70%)`,
            animation: "shimmer 1.8s linear infinite",
          }} />
      )}
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </>
  );
  if (href) {
    return (
      <Link ref={refLink} href={href}
        className="relative inline-flex items-center gap-2 rounded-lg overflow-hidden group"
        style={sty}>
        {inner}
      </Link>
    );
  }
  return (
    <button ref={refBtn} onClick={onClick}
      className="relative inline-flex items-center gap-2 rounded-lg overflow-hidden group"
      style={sty}>
      {inner}
    </button>
  );
}

/* ================================================================== */
/*  NAV                                                               */
/* ================================================================== */
function TopNav() {
  return (
    <nav className="sticky top-0 z-30 w-full backdrop-blur-xl"
      style={{ background: "rgba(6,6,10,0.7)", borderBottom: `1px solid ${P.border}` }}>
      <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${P.indigoHi}, ${P.indigoDim})`,
              boxShadow: `0 8px 18px -4px ${P.indigo}88, inset 0 1px 0 ${P.indigoHi}`,
            }}>
            <span style={{ fontFamily: SERIF, fontSize: 14, fontWeight: 600, color: "#fff" }}>CF</span>
          </div>
          <span style={{ fontFamily: SANS, fontWeight: 600, color: P.text, fontSize: 15 }}>
            ContractorFlow
          </span>
        </div>
        <div className="hidden md:flex items-center gap-7 text-sm" style={{ fontFamily: SANS }}>
          {[
            { l: "Features", href: "#features" },
            { l: "Pricing",  href: "#pricing"  },
            { l: "Sign in",  href: "/login"    },
          ].map((nav) => (
            <a key={nav.l} href={nav.href} className="relative group cursor-pointer" style={{ color: P.muted }}>
              <span className="group-hover:text-white transition-colors duration-200">{nav.l}</span>
              <span className="absolute left-0 -bottom-1 h-px transition-all duration-300 w-0 group-hover:w-full"
                style={{ background: `linear-gradient(90deg, ${P.indigoHi}, ${P.violet})` }} />
            </a>
          ))}
        </div>
        <MagneticButton compact href="/download">
          <Download size={13} /> Download
        </MagneticButton>
      </div>
    </nav>
  );
}

/* ================================================================== */
/*  LIVE BADGE                                                        */
/* ================================================================== */
function LiveBadge() {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
      style={{ background: P.bg2, border: `1px solid ${P.border}` }}>
      <span className="relative flex w-2 h-2">
        <span className="absolute inline-flex h-full w-full rounded-full"
          style={{ background: P.green, animation: "pulseDot 1.8s infinite" }} />
        <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: P.green }} />
      </span>
      <span className="text-xs" style={{ color: P.muted, fontFamily: SANS }}>
        Live · <span style={{ color: P.text }}><CountUp to={500} suffix="+" /></span> leads pulled today
      </span>
    </div>
  );
}

/* ================================================================== */
/*  HERO                                                              */
/* ================================================================== */
function Hero() {
  const D = {
    start: 200,
    gradLand: 200 + "The contractor ".length * 24,
    c2: 200 + "The contractor CRM".length * 24,
    c3: 200 + "The contractor CRMthat lives on your ".length * 24,
  };
  return (
    <section className="relative pt-16 pb-12 px-5 overflow-hidden">
      <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[680px] h-[440px] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${P.indigo}55 0%, transparent 60%)`,
          filter: "blur(60px)",
          animation: "breathe 6s ease-in-out infinite",
        }} />
      <div className="absolute top-40 -left-10 w-[320px] h-[320px] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${P.violet}3a 0%, transparent 70%)`,
          filter: "blur(54px)",
          animation: "floatY 9s ease-in-out infinite",
        }} />
      <div className="absolute top-32 -right-10 w-[300px] h-[300px] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${P.pink}2e 0%, transparent 70%)`,
          filter: "blur(54px)",
          animation: "floatY 11s ease-in-out infinite 2s",
        }} />

      <div className="max-w-4xl mx-auto relative">
        <Reveal>
          <div className="flex justify-center mb-6"><LiveBadge /></div>
        </Reveal>

        <h1 className="text-center leading-[0.95]" style={{
          fontFamily: SERIF,
          fontSize: "clamp(46px, 8vw, 84px)",
          fontWeight: 400,
          color: P.text,
          letterSpacing: "-0.03em",
        }}>
          {letters("The contractor ", D.start)}
          <span className="inline-block" style={{
            backgroundImage: `linear-gradient(135deg, ${P.indigoHi} 0%, ${P.indigo} 35%, ${P.violet} 70%, ${P.pink} 100%)`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            color: "transparent",
            fontStyle: "italic",
            animation: `gradientPunch 950ms cubic-bezier(.2,.9,.3,1.25) ${D.gradLand}ms backwards`,
            filter: `drop-shadow(0 8px 30px ${P.indigo}66)`,
          }}>CRM</span>
          <br />
          {letters("that lives on your ", D.c2)}
          <span className="inline-block" style={{
            fontStyle: "italic",
            animation: `letterIn 800ms cubic-bezier(.2,.7,.2,1) ${D.c3}ms backwards`,
          }}>desktop.</span>
        </h1>

        <Reveal delay={1400}>
          <p className="text-center mt-6 max-w-xl mx-auto"
            style={{ color: P.muted, fontFamily: SANS, fontSize: 17, lineHeight: 1.55 }}>
            Native installer. AI that drafts your proposals and follow-ups.{" "}
            <span style={{ color: P.text }}>500+ fresh leads</span> pulled in daily. One window. Everything.
          </p>
        </Reveal>

        <Reveal delay={1550}>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-8">
            <MagneticButton href="/download">
              <Download size={15} /> Download for free <ArrowRight size={14} />
            </MagneticButton>
            <MagneticButton primary={false} href="#see-it-work">
              <Play size={13} /> See it work
            </MagneticButton>
          </div>
        </Reveal>

        <Reveal delay={1700}>
          <div className="text-center mt-4 text-xs" style={{ color: P.subtle, fontFamily: SANS }}>
            Free 14-day trial · No credit card · Cancel anytime
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  DASHBOARD MOCKUP                                                  */
/* ================================================================== */
const STAGE_LABELS = ["New", "Contacted", "Quoted", "Estimate sent", "Won"];
const STAGE_COLORS = [P.subtle, P.amber, P.violet, P.indigoHi, P.green];

interface ToastMsg { I: LucideIcon; t: string; s: string; }
const TOAST_MSGS: ToastMsg[] = [
  { I: ShoppingBag, t: "New marketplace lead",  s: "Apex Fencing · 2 mi away" },
  { I: Sparkles,    t: "AI drafted follow-up",  s: "To Maria S. · sent in 28s" },
  { I: DollarSign,  t: "Job won",               s: "Chen K. · +$8,200" },
  { I: Phone,       t: "Inbound call routed",   s: "Priya R. · transcript saved" },
];

function DashboardToast() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let i = 0;
    const fire = () => {
      setIdx(i % TOAST_MSGS.length);
      setVisible(true);
      setTimeout(() => setVisible(false), 2900);
      i++;
    };
    const t0 = setTimeout(fire, 1400);
    const t1 = setInterval(fire, 4800);
    return () => { clearTimeout(t0); clearInterval(t1); };
  }, []);
  const M = TOAST_MSGS[idx];
  return (
    <div className="absolute bottom-3 right-3 max-w-[260px] flex items-center gap-2.5 px-3 py-2 rounded-lg backdrop-blur-md pointer-events-none"
      style={{
        background: "rgba(27,27,38,0.92)",
        border: `1px solid ${P.borderHi}`,
        boxShadow: `0 16px 32px -10px rgba(0,0,0,0.6), 0 0 0 1px ${P.indigo}33`,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(14px)",
        transition: "all 400ms cubic-bezier(.2,.7,.2,1)",
      }}>
      <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
        style={{ background: `${P.indigo}33`, color: P.indigoHi }}>
        <M.I size={13} />
      </div>
      <div className="min-w-0">
        <div className="text-xs" style={{ color: P.text, fontFamily: SANS, fontWeight: 600 }}>{M.t}</div>
        <div className="text-[10px] truncate" style={{ color: P.muted, fontFamily: SANS }}>{M.s}</div>
      </div>
    </div>
  );
}

interface Lead { id: number; name: string; desc: string; value: string; stage: number; }

function DashboardMockup() {
  const tilt = useTilt<HTMLDivElement>(6);
  const [leads, setLeads] = useState<Lead[]>([
    { id: 1, name: "Maria S.", desc: "Bathroom remodel", value: "$12k",  stage: 3 },
    { id: 2, name: "Chen K.",  desc: "Deck build",       value: "$8k",   stage: 4 },
    { id: 3, name: "Priya R.", desc: "Fence install",    value: "$3.2k", stage: 1 },
    { id: 4, name: "John D.",  desc: "Roof repair",      value: "$4.8k", stage: 0 },
  ]);
  const [pulseId, setPulseId] = useState<number | null>(null);
  const cycle = useRef(0);

  useEffect(() => {
    const t = setInterval(() => {
      setLeads(prev => {
        const candidates = prev.filter(L => L.stage < 4);
        if (candidates.length === 0) {
          return prev.map(L =>
            L.id === 4 ? { ...L, stage: 0 } :
            L.id === 3 ? { ...L, stage: 1 } :
            L.id === 1 ? { ...L, stage: 3 } : L);
        }
        const target = candidates[cycle.current % candidates.length];
        setPulseId(target.id);
        setTimeout(() => setPulseId(null), 850);
        cycle.current++;
        return prev.map(L =>
          L.id === target.id ? { ...L, stage: L.stage + 1 } : L);
      });
    }, 2300);
    return () => clearInterval(t);
  }, []);

  const sidebarItems: { I: LucideIcon; l: string; active?: boolean }[] = [
    { I: Briefcase,   l: "Pipeline", active: true },
    { I: ShoppingBag, l: "Marketplace" },
    { I: Inbox,       l: "Inbox" },
    { I: Briefcase,   l: "Jobs" },
    { I: Users,       l: "Customers" },
    { I: Calendar,    l: "Calendar" },
  ];

  const tiles: { l: string; v: number; prefix?: string; sep?: boolean; scramble?: boolean }[] = [
    { l: "Leads",   v: 47 },
    { l: "Jobs",    v: 12 },
    { l: "Revenue", v: 48200, prefix: "$", sep: true, scramble: true },
    { l: "Due",     v: 3 },
  ];

  return (
    <section id="see-it-work" className="px-3 sm:px-5 pb-12 scroll-mt-20">
      <Reveal delay={80}>
        <div ref={tilt} className="relative max-w-5xl mx-auto">
          <div className="absolute inset-0 -m-6 rounded-3xl pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at center, ${P.indigo}40 0%, transparent 65%)`,
              filter: "blur(50px)",
              animation: "breathe 5s ease-in-out infinite",
            }} />

          <div className="relative rounded-2xl overflow-hidden"
            style={{
              background: P.bg2,
              border: `1px solid ${P.border}`,
              boxShadow:
                `0 40px 90px -20px rgba(0,0,0,0.7),
                 0 0 0 1px ${P.border},
                 inset 0 1px 0 ${P.borderHi}`,
            }}>
            <div className="flex items-center justify-between px-4 py-2.5"
              style={{ background: P.bg3, borderBottom: `1px solid ${P.border}` }}>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ background: "#FF5F57" }} />
                <span className="w-3 h-3 rounded-full" style={{ background: "#FEBC2E" }} />
                <span className="w-3 h-3 rounded-full" style={{ background: "#28C840" }} />
              </div>
              <div className="text-[11px]" style={{ color: P.subtle, fontFamily: MONO }}>
                ContractorFlow.app
              </div>
              <div className="w-12" />
            </div>

            <div className="flex relative">
              <div className="hidden sm:flex flex-col p-3 gap-0.5 w-44"
                style={{ background: P.bg2, borderRight: `1px solid ${P.border}` }}>
                <div className="text-[10px] uppercase mb-2 px-2"
                  style={{ color: P.subtle, fontFamily: SANS, fontWeight: 600, letterSpacing: "0.16em" }}>
                  Workspace
                </div>
                {sidebarItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm"
                    style={{
                      background: item.active ? P.bg3 : "transparent",
                      color: item.active ? P.text : P.muted,
                      fontFamily: SANS,
                      fontWeight: item.active ? 500 : 400,
                      animation: `sidebarIn 600ms cubic-bezier(.2,.7,.2,1) ${400 + i * 70}ms backwards`,
                    }}>
                    <item.I size={14} />
                    {item.l}
                  </div>
                ))}
              </div>

              <div className="flex-1 p-4 sm:p-5 min-w-0 relative">
                <div className="flex items-baseline justify-between mb-1">
                  <div className="text-[11px]" style={{ color: P.muted, fontFamily: SANS }}>
                    Tuesday, May 12
                  </div>
                  <div className="text-[11px] flex items-center gap-1"
                    style={{ color: P.muted, fontFamily: SANS }}>
                    Wallet{" "}
                    <span style={{ color: P.text, fontFamily: MONO }}>
                      $<CountUp to={482} />
                    </span>
                  </div>
                </div>
                <h3 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 400,
                             color: P.text, letterSpacing: "-0.02em", marginBottom: 14 }}>
                  Hey <span style={{ fontStyle: "italic" }}>Reliable Roofing</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                  {tiles.map((s, i) => (
                    <div key={i} className="p-2.5 rounded-lg"
                      style={{
                        background: P.bg,
                        border: `1px solid ${P.border}`,
                        animation: `tileIn 600ms cubic-bezier(.2,.7,.2,1) ${600 + i * 90}ms backwards`,
                      }}>
                      <div className="text-[9px] uppercase"
                        style={{ color: P.subtle, fontFamily: SANS,
                                 letterSpacing: "0.15em", fontWeight: 600 }}>
                        {s.l}
                      </div>
                      <div className="text-lg mt-0.5"
                        style={{ color: P.text, fontFamily: MONO, fontWeight: 500 }}>
                        {s.scramble
                          ? <ScrambleText to={s.v} prefix={s.prefix || ""} sep={s.sep} />
                          : <CountUp to={s.v} prefix={s.prefix || ""} sep={s.sep} />}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  {leads.map((L, i) => {
                    const pulsing = pulseId === L.id;
                    return (
                      <div key={L.id} className="relative flex items-center justify-between px-3 py-2.5 rounded-lg"
                        style={{
                          background: pulsing ? `${P.indigo}1f` : P.bg,
                          border: `1px solid ${pulsing ? P.indigo : P.border}`,
                          boxShadow: pulsing
                            ? `0 0 0 4px ${P.indigo}33, 0 14px 30px -10px ${P.indigo}88`
                            : "none",
                          transition: "background 550ms cubic-bezier(.2,.7,.2,1), border-color 550ms, box-shadow 550ms",
                          animation: `leadIn 700ms cubic-bezier(.2,.7,.2,1) ${950 + i * 110}ms backwards`,
                        }}>
                        {pulsing && (
                          <div className="absolute inset-0 rounded-lg pointer-events-none"
                            style={{
                              background: `radial-gradient(circle at 50% 50%, ${P.indigo}33 0%, transparent 70%)`,
                              animation: "fadeOut 850ms ease-out forwards",
                            }} />
                        )}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] shrink-0"
                            style={{
                              background: `linear-gradient(135deg, ${P.indigoHi}, ${P.indigoDim})`,
                              color: "#fff", fontFamily: SANS, fontWeight: 600,
                              boxShadow: pulsing ? `0 0 20px ${P.indigo}` : "none",
                              transition: "box-shadow 550ms",
                            }}>
                            {L.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm truncate"
                              style={{ color: P.text, fontFamily: SANS, fontWeight: 500 }}>
                              {L.name}
                            </div>
                            <div className="text-[11px] truncate"
                              style={{ color: P.muted, fontFamily: SANS }}>
                              {L.desc} · <span style={{ fontFamily: MONO }}>{L.value}</span>
                            </div>
                          </div>
                        </div>
                        <span key={L.stage}
                          className="text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ml-2"
                          style={{
                            background: `${STAGE_COLORS[L.stage]}22`,
                            color: STAGE_COLORS[L.stage],
                            fontFamily: SANS, fontWeight: 600,
                            animation: "stageIn 520ms cubic-bezier(.2,.7,.2,1)",
                          }}>
                          {STAGE_LABELS[L.stage]}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg overflow-hidden relative"
                  style={{
                    background: P.bg, border: `1px solid ${P.border}`,
                    animation: `leadIn 700ms cubic-bezier(.2,.7,.2,1) 1500ms backwards`,
                  }}>
                  <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
                    background: `linear-gradient(90deg, transparent, ${P.indigo}22, transparent)`,
                    animation: "shimmer 3s linear infinite",
                  }} />
                  <Sparkles size={13} style={{ color: P.indigoHi, position: "relative" }} />
                  <div className="text-[11px] flex-1 relative" style={{ color: P.muted, fontFamily: SANS }}>
                    <span style={{ color: P.text }}>AI drafted follow-up</span> · Job won{" "}
                    <span style={{ color: P.green, fontFamily: MONO }}>+$8,200</span>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full relative"
                    style={{ background: P.green, animation: "pulseDot 1.6s infinite" }} />
                </div>

                <DashboardToast />
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ================================================================== */
/*  MARQUEE                                                           */
/* ================================================================== */
function ActivityMarquee() {
  const items = [
    "$4.8k closed in Worcester",
    "AI sent 12 follow-ups",
    "47 new leads from Concord",
    "$3.2k fence install won",
    "Tasha K. claimed 4 marketplace leads",
    "30s avg AI draft time",
    "Eli W. installed Saturday · won by Monday",
    "Marisol H. signed first $12k job",
    "Diego P. refunded a bad lead in 24h",
  ];
  return (
    <div className="relative overflow-hidden py-3.5"
      style={{
        borderTop: `1px solid ${P.border}`,
        borderBottom: `1px solid ${P.border}`,
        background: "rgba(11,11,18,0.6)",
        WebkitMaskImage: "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)",
        maskImage: "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)",
      }}>
      <div className="flex gap-10 whitespace-nowrap"
        style={{ animation: "marquee 40s linear infinite", width: "max-content" }}>
        {[...items, ...items].map((it, i) => (
          <span key={i} className="flex items-center gap-2.5 text-sm shrink-0"
            style={{ color: P.muted, fontFamily: SANS }}>
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full"
                style={{ background: P.green, animation: "pulseDot 1.5s infinite" }} />
              <span className="relative inline-flex rounded-full w-1.5 h-1.5"
                style={{ background: P.green }} />
            </span>
            {it}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  STATS STRIP                                                       */
/* ================================================================== */
function StatsStrip() {
  const stats = [
    { v: 500, sfx: "+", l: "Fresh leads pulled daily" },
    { v: 13,  sfx: "",  l: "Automated sources" },
    { v: 30,  sfx: "s", l: "AI follow-up draft time" },
    { v: 100, sfx: "%", l: "Of your data, exportable" },
  ];
  return (
    <section className="px-5 py-12">
      <Reveal>
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden"
          style={{ background: P.border }}>
          {stats.map((s, i) => (
            <div key={i} className="p-6 text-center" style={{ background: P.bg }}>
              <div className="text-4xl md:text-5xl tabular-nums"
                style={{ fontFamily: SERIF, fontWeight: 400,
                         color: P.text, letterSpacing: "-0.02em" }}>
                <ScrambleText to={s.v} suffix={s.sfx} duration={1500 + i * 100} />
              </div>
              <div className="text-xs mt-2" style={{ color: P.muted, fontFamily: SANS }}>{s.l}</div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ================================================================== */
/*  KINETIC PHRASE                                                    */
/* ================================================================== */
function KineticPhrase() {
  const items = ["AI follow-ups", "lead marketplace", "profit insights", "one window"];
  const longest = "lead marketplace";
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(x => (x + 1) % items.length), 2000);
    return () => clearInterval(t);
  }, [items.length]);
  return (
    <Reveal>
      <div className="max-w-3xl mx-auto px-5 my-14">
        <div className="text-center">
          <div className="text-[10px] uppercase mb-3"
            style={{ color: P.indigoHi, fontFamily: SANS,
                     fontWeight: 600, letterSpacing: "0.24em" }}>
            What you get
          </div>
          <div className="flex items-center justify-center gap-3 flex-wrap"
            style={{ fontFamily: SERIF, fontSize: "clamp(30px, 6vw, 56px)",
                     fontWeight: 400, color: P.text, letterSpacing: "-0.025em" }}>
            <span>Built for</span>
            <span className="relative inline-block overflow-hidden" style={{ height: "1.1em" }}>
              <span aria-hidden style={{ visibility: "hidden", whiteSpace: "nowrap", fontStyle: "italic" }}>
                {longest}
              </span>
              {items.map((item, i) => {
                const off = i - idx;
                return (
                  <span key={i} className="absolute inset-0 flex items-center justify-center whitespace-nowrap"
                    style={{
                      transform: `translateY(${off * 100}%)`,
                      transition: "transform 720ms cubic-bezier(.75,0,.2,1)",
                      opacity: Math.abs(off) > 1 ? 0 : 1,
                      fontStyle: "italic",
                      backgroundImage: `linear-gradient(135deg, ${P.indigoHi}, ${P.violet}, ${P.pink})`,
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      color: "transparent",
                    }}>
                    {item}
                  </span>
                );
              })}
            </span>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

/* ================================================================== */
/*  SPOTLIGHT CARD                                                    */
/* ================================================================== */
function SpotlightCard({ children, className = "", popular = false }: {
  children: ReactNode; className?: string; popular?: boolean;
}) {
  const ref = useSpotlight<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`relative rounded-2xl overflow-hidden ${className}`}
      style={{
        background: popular
          ? `linear-gradient(160deg, ${P.indigo}22 0%, ${P.bg2} 60%)`
          : P.bg2,
        border: `1px solid ${popular ? P.indigo : P.border}`,
      } as CSSProperties}>
      <div className="absolute inset-0 pointer-events-none rounded-2xl transition-opacity duration-300"
        style={{
          background:
            `radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), ${P.indigoHi}22, transparent 40%)`,
          opacity: "var(--so, 0)" as unknown as number,
        }} />
      {children}
    </div>
  );
}

/* ================================================================== */
/*  FEATURES                                                          */
/* ================================================================== */
function Features() {
  const items: { I: LucideIcon; t: string; d: string }[] = [
    { I: Sparkles,    t: "AI that closes for you",   d: "Drafts proposals, sends follow-ups, scores incoming leads. You approve, it sends." },
    { I: Zap,         t: "One window. Everything.",  d: "Leads, jobs, customers, follow-ups, invoices, AI inbox — all in a native window." },
    { I: DollarSign,  t: "Profit you can see",       d: "Source ROI, year-over-year, AR aging. Know which channels make money." },
    { I: ShoppingBag, t: "Pay-per-lead marketplace", d: "500+ fresh leads from 13+ sources. Bad lead? Refund in 24h." },
  ];
  return (
    <section id="features" className="px-5 py-6 scroll-mt-20">
      <div className="max-w-5xl mx-auto grid sm:grid-cols-2 gap-3">
        {items.map((f, i) => (
          <Reveal key={i} delay={i * 90}>
            <SpotlightCard className="p-5 h-full transition-transform duration-300 hover:-translate-y-1">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                style={{ background: `${P.indigo}22`, color: P.indigoHi,
                         border: `1px solid ${P.indigo}33` }}>
                <f.I size={16} />
              </div>
              <h3 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 400,
                           color: P.text, letterSpacing: "-0.02em" }}>{f.t}</h3>
              <p className="mt-1.5 text-sm"
                style={{ color: P.muted, fontFamily: SANS, lineHeight: 1.55 }}>{f.d}</p>
            </SpotlightCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ================================================================== */
/*  PRICING                                                           */
/* ================================================================== */
function PricingPreview() {
  const plans = [
    { name: "Starter", price: 99,  desc: "Solo operator getting organized.", popular: false },
    { name: "Growth",  price: 249, desc: "Crew of 2–3 scaling up.",          popular: true  },
    { name: "Pro",     price: 549, desc: "Going full speed.",                popular: false },
  ];
  return (
    <section id="pricing" className="px-5 py-12 scroll-mt-20">
      <Reveal>
        <h2 className="text-center mb-2"
          style={{ fontFamily: SERIF, fontSize: "clamp(36px, 6vw, 56px)",
                   fontWeight: 400, color: P.text, letterSpacing: "-0.025em" }}>
          Simple. <span style={{ fontStyle: "italic", color: P.muted }}>Monthly.</span>
        </h2>
        <p className="text-center mb-8 text-sm" style={{ color: P.muted, fontFamily: SANS }}>
          No contracts. Free 14-day trial on every plan.
        </p>
      </Reveal>
      <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-3">
        {plans.map((p, i) => (
          <Reveal key={i} delay={i * 100}>
            <SpotlightCard popular={p.popular} className="p-5 h-full">
              {p.popular && (
                <>
                  <div className="absolute -top-14 -right-14 w-52 h-52 rounded-full pointer-events-none"
                    style={{
                      background: `radial-gradient(circle, ${P.indigo}80 0%, transparent 70%)`,
                      filter: "blur(28px)",
                      animation: "breathe 4s ease-in-out infinite",
                    }} />
                  <div className="absolute top-3 right-3 text-[9px] px-2 py-0.5 rounded-full z-10"
                    style={{ background: P.indigo, color: "#fff",
                             fontFamily: SANS, fontWeight: 700, letterSpacing: "0.08em" }}>
                    MOST POPULAR
                  </div>
                </>
              )}
              <div className="relative">
                <div className="text-sm" style={{ color: P.muted, fontFamily: SANS }}>{p.name}</div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-4xl"
                    style={{ fontFamily: SERIF, color: P.text,
                             fontWeight: 400, letterSpacing: "-0.02em" }}>
                    $<CountUp to={p.price} />
                  </span>
                  <span className="text-sm" style={{ color: P.subtle, fontFamily: SANS }}>/month</span>
                </div>
                <p className="text-sm mt-2 mb-4" style={{ color: P.muted, fontFamily: SANS }}>{p.desc}</p>
                <Link href="/download" className="block text-center w-full py-2 rounded-lg text-sm transition-all hover:scale-[1.02]"
                  style={{
                    background: p.popular ? P.indigo : "transparent",
                    color: p.popular ? "#fff" : P.text,
                    border: p.popular ? "none" : `1px solid ${P.borderHi}`,
                    fontFamily: SANS, fontWeight: 600,
                    boxShadow: p.popular ? `0 10px 22px -8px ${P.indigo}88` : "none",
                  }}>
                  Download &amp; start free
                </Link>
              </div>
            </SpotlightCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ================================================================== */
/*  FINAL CTA                                                         */
/* ================================================================== */
function FinalCTA() {
  return (
    <section className="relative px-5 py-20 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[340px] rounded-full"
          style={{
            background: `radial-gradient(ellipse, ${P.indigo}55 0%, transparent 60%)`,
            filter: "blur(50px)",
            animation: "breathe 5s ease-in-out infinite",
          }} />
      </div>
      <Reveal>
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 style={{ fontFamily: SERIF, fontSize: "clamp(38px, 7vw, 72px)",
                       fontWeight: 400, color: P.text, letterSpacing: "-0.03em", lineHeight: 1 }}>
            Ready to{" "}
            <span style={{
              backgroundImage: `linear-gradient(135deg, ${P.indigoHi}, ${P.violet}, ${P.pink})`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              color: "transparent",
              fontStyle: "italic",
              filter: `drop-shadow(0 6px 20px ${P.indigo}55)`,
            }}>
              ditch the spreadsheet?
            </span>
          </h2>
          <p className="mt-5 text-base" style={{ color: P.muted, fontFamily: SANS }}>
            Native desktop · AI follow-ups · 500+ leads/day
          </p>
          <div className="flex justify-center gap-3 mt-7 flex-wrap">
            <MagneticButton href="/download">
              <Download size={15} /> Download for free
            </MagneticButton>
            <MagneticButton primary={false} href="#pricing">
              See pricing
            </MagneticButton>
          </div>
          <div className="mt-4 text-xs" style={{ color: P.subtle, fontFamily: SANS }}>
            macOS · Windows · Linux
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ================================================================== */
/*  PAGE                                                              */
/* ================================================================== */
export default function LandingV3() {
  // Fonts (Geist + Instrument Serif + Geist Mono) are loaded at the root
  // layout level via next/font/google — no runtime injection needed.

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulseDot   { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(2.4); opacity: 0; } }
        @keyframes fadeOut    { from { opacity: 1; } to { opacity: 0; } }
        @keyframes stageIn    { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes breathe    { 0%,100% { opacity: 0.55; } 50% { opacity: 1; } }
        @keyframes floatY     { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        @keyframes letterIn   { from { opacity: 0; transform: translateY(0.5em); } to { opacity: 1; transform: translateY(0); } }
        @keyframes gradientPunch { from { opacity: 0; transform: translateY(0.5em) scale(0.92); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes sidebarIn  { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes tileIn     { from { opacity: 0; transform: translateY(10px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes leadIn     { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes shimmer    { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes marquee    { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes auroraShift { 0% { transform: translate(0,0) rotate(0) scale(1); opacity: 0.85; } 50% { transform: translate(2%,-1%) rotate(2deg) scale(1.05); opacity: 1; } 100% { transform: translate(-1%,1%) rotate(-1deg) scale(1); opacity: 0.85; } }
        @keyframes gridDrift  { 0% { background-position: 0 0; } 100% { background-position: 64px 64px; } }
        @media (hover: hover) { .cf-v3-cursor, .cf-v3-cursor a, .cf-v3-cursor button { cursor: none; } }
      ` }} />

      <div className="cf-v3-cursor" style={{ background: P.bg, color: P.text, minHeight: "100vh",
                    fontFamily: SANS, position: "relative", overflow: "hidden" }}>
        <AuroraBg />
        <CursorGlow />
        <ScrollProgress />

        <div className="fixed inset-0 pointer-events-none opacity-[0.04]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          mixBlendMode: "overlay",
        }} />

        <TopNav />
        <Hero />
        <DashboardMockup />
        <ActivityMarquee />
        <StatsStrip />
        <KineticPhrase />
        <Features />
        <PricingPreview />
        <FinalCTA />

        <footer className="text-center py-8 text-xs"
          style={{ color: P.subtle, fontFamily: SANS, borderTop: `1px solid ${P.border}` }}>
          CF · © 2026 ContractorFlow · Download · Features · Pricing · Terms · Privacy
        </footer>
      </div>
    </>
  );
}
