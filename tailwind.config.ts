import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
        accent: {
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
        },
        ink: {
          50:  "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#070a16",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto"],
      },
      fontSize: {
        // Tighter type scale for SaaS dashboards
        xs:   ["0.75rem",  { lineHeight: "1rem" }],
        sm:   ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["0.9375rem", { lineHeight: "1.5rem" }],
        lg:   ["1.0625rem", { lineHeight: "1.625rem" }],
        xl:   ["1.1875rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.375rem", { lineHeight: "1.875rem", letterSpacing: "-0.01em" }],
        "3xl": ["1.75rem",  { lineHeight: "2.25rem",  letterSpacing: "-0.02em" }],
        "4xl": ["2.25rem",  { lineHeight: "2.5rem",   letterSpacing: "-0.02em" }],
        "5xl": ["3rem",     { lineHeight: "1.05",     letterSpacing: "-0.03em" }],
        "6xl": ["3.75rem",  { lineHeight: "1",        letterSpacing: "-0.04em" }],
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)",
        "brand-radial":
          "radial-gradient(1200px 600px at 50% -10%, rgba(99,102,241,0.18), transparent 60%)",
        "mesh-1":
          "radial-gradient(at 27% 37%, hsla(215, 98%, 61%, 0.10) 0px, transparent 50%), radial-gradient(at 97% 21%, hsla(256, 96%, 67%, 0.12) 0px, transparent 50%), radial-gradient(at 52% 99%, hsla(177, 88%, 56%, 0.08) 0px, transparent 50%), radial-gradient(at 10% 29%, hsla(312, 96%, 67%, 0.06) 0px, transparent 50%)",
        "grid-fade":
          "linear-gradient(to bottom, white, transparent), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' fill='none'%3E%3Cpath d='M40 0H0V40' stroke='%23e2e8f0' stroke-width='0.5'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        glow:         "0 10px 40px -10px rgba(99,102,241,0.45)",
        "card-hover": "0 12px 30px -12px rgba(15, 23, 42, 0.18)",
        soft:         "0 1px 3px rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.06)",
        "soft-lg":    "0 4px 24px -2px rgba(15,23,42,0.08), 0 2px 8px -2px rgba(15,23,42,0.04)",
        "inner-soft": "inset 0 1px 2px rgba(15,23,42,0.04)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "gradient-pan": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%":      { backgroundPosition: "100% 50%" },
        },
        shimmer: {
          "0%":   { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.6" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-4px)" },
        },
        marquee: {
          "0%":   { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "blob-drift": {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "33%":      { transform: "translate(30px,-20px) scale(1.05)" },
          "66%":      { transform: "translate(-20px,15px) scale(0.97)" },
        },
        "tick-up": {
          "0%":   { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        aurora: {
          "0%, 100%": { transform: "translate(0,0) rotate(0deg)",   opacity: "0.55" },
          "25%":      { transform: "translate(40px,-30px) rotate(60deg)",  opacity: "0.75" },
          "50%":      { transform: "translate(-30px,40px) rotate(120deg)", opacity: "0.6" },
          "75%":      { transform: "translate(20px,20px) rotate(180deg)",  opacity: "0.8" },
        },
        "spin-slow": {
          "0%":   { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        twinkle: {
          "0%, 100%": { opacity: "0.2", transform: "scale(1)" },
          "50%":      { opacity: "1",   transform: "scale(1.25)" },
        },
        "gradient-cycle": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "33%":      { backgroundPosition: "100% 30%" },
          "66%":      { backgroundPosition: "50% 100%" },
        },
        "border-spin": {
          "0%":   { "--angle": "0deg" },
          "100%": { "--angle": "360deg" },
        },
      },
      animation: {
        "fade-up":      "fade-up 0.5s ease-out both",
        "gradient-pan": "gradient-pan 8s ease infinite",
        shimmer:        "shimmer 2.5s ease-in-out infinite",
        "pulse-soft":   "pulse-soft 2s ease-in-out infinite",
        float:          "float 6s ease-in-out infinite",
        marquee:        "marquee 40s linear infinite",
        "blob-drift":   "blob-drift 14s ease-in-out infinite",
        "tick-up":      "tick-up 0.6s ease-out both",
        aurora:         "aurora 18s ease-in-out infinite",
        "spin-slow":    "spin-slow 24s linear infinite",
        twinkle:        "twinkle 3s ease-in-out infinite",
        "gradient-cycle": "gradient-cycle 10s ease infinite",
      },
    },
  },
  plugins: [],
};

export default config;
