import { statusBadgeClass } from "@/lib/format";

export default function StatusBadge({ value }: { value: string }) {
  return (
    <span className={`badge ${statusBadgeClass(value)}`}>
      {value.replace(/_/g, " ")}
    </span>
  );
}
