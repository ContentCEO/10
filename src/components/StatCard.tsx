import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "indigo" | "violet" | "emerald" | "amber";

const toneClasses: Record<Tone, string> = {
  indigo:  "bg-gradient-to-br from-indigo-500 to-violet-500",
  violet:  "bg-gradient-to-br from-violet-500 to-fuchsia-500",
  emerald: "bg-gradient-to-br from-emerald-500 to-teal-500",
  amber:   "bg-gradient-to-br from-amber-500 to-orange-500",
};

export function StatCard({
  label, value, icon: Icon, hint, tone = "indigo",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  tone?: Tone;
}) {
  return (
    <div className={cn("stat-tile animate-fade-up", toneClasses[tone])}>
      <div className="relative z-10 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-white/85">{label}</span>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
          <Icon className="h-4 w-4 text-white" />
        </span>
      </div>
      <div className="relative z-10 mt-3 text-3xl font-bold leading-none">{value}</div>
      {hint && <p className="relative z-10 mt-2 text-xs text-white/80">{hint}</p>}
    </div>
  );
}
