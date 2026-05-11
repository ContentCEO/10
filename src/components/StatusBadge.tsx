import { cn } from "@/lib/utils";
import {
  JOB_STATUS_LABELS,
  LEAD_STATUS_LABELS,
  type JobStatus,
  type LeadStatus,
} from "@/lib/types";

const leadColors: Record<LeadStatus, string> = {
  new:           "bg-slate-100 text-slate-700 ring-slate-200",
  contacted:     "bg-blue-100 text-blue-700 ring-blue-200",
  estimate_sent: "bg-amber-100 text-amber-800 ring-amber-200",
  won:           "bg-emerald-100 text-emerald-800 ring-emerald-200",
  lost:          "bg-rose-100 text-rose-700 ring-rose-200",
};

const jobColors: Record<JobStatus, string> = {
  scheduled:   "bg-blue-100 text-blue-700 ring-blue-200",
  in_progress: "bg-amber-100 text-amber-800 ring-amber-200",
  completed:   "bg-emerald-100 text-emerald-800 ring-emerald-200",
  cancelled:   "bg-slate-100 text-slate-500 ring-slate-200",
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return <span className={cn("badge", leadColors[status])}>{LEAD_STATUS_LABELS[status]}</span>;
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <span className={cn("badge", jobColors[status])}>{JOB_STATUS_LABELS[status]}</span>;
}
