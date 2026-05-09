import { cn } from "@/lib/utils";
import {
  JOB_STATUS_LABELS,
  LEAD_STATUS_LABELS,
  type JobStatus,
  type LeadStatus,
} from "@/lib/types";

const leadColors: Record<LeadStatus, string> = {
  new: "bg-slate-100 text-slate-700",
  contacted: "bg-blue-100 text-blue-700",
  estimate_sent: "bg-amber-100 text-amber-700",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-red-100 text-red-700",
};

const jobColors: Record<JobStatus, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-500",
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return <span className={cn("badge", leadColors[status])}>{LEAD_STATUS_LABELS[status]}</span>;
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <span className={cn("badge", jobColors[status])}>{JOB_STATUS_LABELS[status]}</span>;
}
