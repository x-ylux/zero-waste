import { classNames } from "@/lib/format";
import { DONATION_STATUS_LABELS, TASK_STATUS_LABELS } from "@/lib/domain/labels";
import type { DonationStatus, TaskStatus } from "@/lib/domain/types";

const donationTone: Record<DonationStatus, string> = {
  available: "bg-emerald-100 text-emerald-900",
  reserved: "bg-sky-100 text-sky-900",
  collected: "bg-amber-100 text-amber-950",
  delivered: "bg-brand-100 text-brand-900",
  cancelled: "bg-warmgray-200 text-warmgray-700",
  expired: "bg-orange-100 text-orange-900",
  rejected: "bg-rose-100 text-rose-900",
};

const taskTone: Record<TaskStatus, string> = {
  unassigned: "bg-warmgray-200 text-warmgray-800",
  assigned: "bg-sky-100 text-sky-900",
  picked_up: "bg-amber-100 text-amber-950",
  delivered: "bg-brand-100 text-brand-900",
  backup_needed: "bg-amber-200 text-amber-950",
  cancelled: "bg-warmgray-200 text-warmgray-700",
};

export function DonationStatusBadge({ status }: { status: DonationStatus }) {
  return (
    <span className={classNames("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", donationTone[status])}>
      {DONATION_STATUS_LABELS[status]}
    </span>
  );
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={classNames("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", taskTone[status])}>
      {TASK_STATUS_LABELS[status]}
    </span>
  );
}
