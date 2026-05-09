import { STATUS_COLOR, STATUS_LABEL, type LeadStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: LeadStatus }) {
  return <span className={`badge ${STATUS_COLOR[status]}`}>{STATUS_LABEL[status]}</span>;
}
