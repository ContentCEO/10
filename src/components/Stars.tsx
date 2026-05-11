import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stars({
  value,
  size = "sm",
  showNumber = false,
  count,
}: {
  value: number | null;
  size?: "sm" | "md" | "lg";
  showNumber?: boolean;
  count?: number;
}) {
  const px = size === "lg" ? "h-5 w-5" : size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  const rounded = value == null ? 0 : Math.round(value * 2) / 2;
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = i <= Math.floor(rounded);
          const half = !filled && i - 0.5 <= rounded;
          return (
            <Star
              key={i}
              className={cn(
                px,
                filled || half ? "text-amber-400 fill-amber-400" : "text-slate-300",
              )}
            />
          );
        })}
      </span>
      {showNumber && value != null && (
        <span className="text-xs text-slate-600">
          {value.toFixed(1)}{count != null && ` · ${count} review${count === 1 ? "" : "s"}`}
        </span>
      )}
      {showNumber && value == null && (
        <span className="text-xs text-slate-400">No reviews yet</span>
      )}
    </span>
  );
}
