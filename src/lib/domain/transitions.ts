import type { DonationStatus, TaskStatus } from "@/lib/domain/types";

const DONATION_TRANSITIONS: Record<DonationStatus, DonationStatus[]> = {
  available: ["reserved", "cancelled", "expired"],
  reserved: ["collected", "cancelled", "expired", "rejected", "available"],
  collected: ["delivered", "rejected"],
  delivered: [],
  cancelled: [],
  expired: [],
  rejected: [],
};

const TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  unassigned: ["assigned", "cancelled", "backup_needed"],
  assigned: ["picked_up", "backup_needed", "cancelled"],
  backup_needed: ["assigned", "cancelled"],
  picked_up: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export function canTransitionDonation(from: DonationStatus, to: DonationStatus): boolean {
  return DONATION_TRANSITIONS[from].includes(to);
}

export function canTransitionTask(from: TaskStatus, to: TaskStatus): boolean {
  return TASK_TRANSITIONS[from].includes(to);
}

export function assertDonationTransition(from: DonationStatus, to: DonationStatus): void {
  if (!canTransitionDonation(from, to)) {
    throw new Error(`Donation cannot move from ${from} to ${to}.`);
  }
}

export function assertTaskTransition(from: TaskStatus, to: TaskStatus): void {
  if (!canTransitionTask(from, to)) {
    throw new Error(`Task cannot move from ${from} to ${to}.`);
  }
}

export function isReservable(status: DonationStatus): boolean {
  return status === "available";
}

export function isTerminalDonation(status: DonationStatus): boolean {
  return status === "delivered" || status === "cancelled" || status === "expired" || status === "rejected";
}
