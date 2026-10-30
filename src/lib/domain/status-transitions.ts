import { AllocationStatusType, AssignmentStatusType, DonationStatusType } from "@/lib/types/domain";

const donationTransitions: Record<DonationStatusType, DonationStatusType[]> = {
  DRAFT: ["OPEN", "CANCELLED", "EXPIRED"],
  OPEN: ["PARTIALLY_ALLOCATED", "FULLY_ALLOCATED", "CLOSED", "CANCELLED", "EXPIRED"],
  PARTIALLY_ALLOCATED: ["OPEN", "PARTIALLY_ALLOCATED", "FULLY_ALLOCATED", "CLOSED", "CANCELLED", "EXPIRED"],
  FULLY_ALLOCATED: ["OPEN", "PARTIALLY_ALLOCATED", "CLOSED", "CANCELLED", "EXPIRED"],
  CLOSED: [],
  CANCELLED: [],
  EXPIRED: [],
};

const allocationTransitions: Record<AllocationStatusType, AllocationStatusType[]> = {
  ACCEPTED: ["AWAITING_VOLUNTEER", "ASSIGNED", "COLLECTED", "CANCELLED", "FAILED"],
  AWAITING_VOLUNTEER: ["AWAITING_VOLUNTEER", "ASSIGNED", "COLLECTED", "CANCELLED", "FAILED"],
  ASSIGNED: ["AWAITING_VOLUNTEER", "COLLECTED", "CANCELLED", "FAILED"],
  COLLECTED: ["DELIVERED", "PARTIALLY_DELIVERED", "REJECTED", "FAILED"],
  DELIVERED: [],
  PARTIALLY_DELIVERED: [],
  REJECTED: [],
  CANCELLED: [],
  FAILED: ["AWAITING_VOLUNTEER", "CANCELLED"],
};

const assignmentTransitions: Record<AssignmentStatusType, AssignmentStatusType[]> = {
  OFFERED: ["ACCEPTED", "DECLINED", "TIMED_OUT", "CANCELLED", "FAILED"],
  ACCEPTED: ["CANCELLED", "COLLECTED", "FAILED"],
  DECLINED: [],
  TIMED_OUT: [],
  CANCELLED: [],
  COLLECTED: ["COMPLETED", "FAILED"],
  COMPLETED: [],
  FAILED: [],
};

export function canTransitionDonation(from: DonationStatusType, to: DonationStatusType): boolean {
  return donationTransitions[from].includes(to);
}

export function canTransitionAllocation(
  from: AllocationStatusType,
  to: AllocationStatusType
): boolean {
  return allocationTransitions[from].includes(to);
}

export function canTransitionAssignment(
  from: AssignmentStatusType,
  to: AssignmentStatusType
): boolean {
  return assignmentTransitions[from].includes(to);
}

export function assertDonationTransition(
  from: DonationStatusType,
  to: DonationStatusType
): void {
  if (!canTransitionDonation(from, to)) {
    throw new Error(`INVALID_TRANSITION: Donation cannot transition from '${from}' to '${to}'.`);
  }
}

export function assertAllocationTransition(
  from: AllocationStatusType,
  to: AllocationStatusType
): void {
  if (!canTransitionAllocation(from, to)) {
    throw new Error(`INVALID_TRANSITION: Allocation cannot transition from '${from}' to '${to}'.`);
  }
}

export function assertAssignmentTransition(
  from: AssignmentStatusType,
  to: AssignmentStatusType
): void {
  if (!canTransitionAssignment(from, to)) {
    throw new Error(`INVALID_TRANSITION: Assignment cannot transition from '${from}' to '${to}'.`);
  }
}
