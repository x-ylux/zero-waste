import { describe, expect, it } from "vitest";
import {
  assertAllocationTransition,
  assertAssignmentTransition,
  assertDonationTransition,
  canTransitionAllocation,
  canTransitionAssignment,
  canTransitionDonation,
} from "@/lib/domain/status-transitions";
import { isActiveDonationListing } from "@/lib/donations/listing";

describe("Lifecycle transitions and active listings", () => {
  it("allows valid allocation, assignment, and donation state changes", () => {
    expect(canTransitionAllocation("ACCEPTED", "AWAITING_VOLUNTEER")).toBe(true);
    expect(canTransitionAllocation("COLLECTED", "PARTIALLY_DELIVERED")).toBe(true);
    expect(canTransitionAssignment("OFFERED", "ACCEPTED")).toBe(true);
    expect(canTransitionAssignment("COLLECTED", "COMPLETED")).toBe(true);
    expect(canTransitionDonation("OPEN", "PARTIALLY_ALLOCATED")).toBe(true);
    expect(canTransitionDonation("FULLY_ALLOCATED", "CLOSED")).toBe(true);
  });

  it("rejects invalid and terminal lifecycle transitions", () => {
    expect(() => assertAllocationTransition("DELIVERED", "COLLECTED")).toThrow(/INVALID_TRANSITION/);
    expect(() => assertAssignmentTransition("COMPLETED", "OFFERED")).toThrow(/INVALID_TRANSITION/);
    expect(() => assertDonationTransition("EXPIRED", "OPEN")).toThrow(/INVALID_TRANSITION/);
    expect(canTransitionAllocation("CANCELLED", "ASSIGNED")).toBe(false);
  });

  it("lists only unexpired open or partially allocated donations", () => {
    const now = new Date("2026-10-30T12:00:00Z");
    expect(isActiveDonationListing({ status: "OPEN", pickupWindowEnd: "2026-10-30T13:00:00Z" }, now)).toBe(true);
    expect(isActiveDonationListing({ status: "PARTIALLY_ALLOCATED", pickupWindowEnd: "2026-10-30T13:00:00Z" }, now)).toBe(true);
    expect(isActiveDonationListing({ status: "OPEN", pickupWindowEnd: "2026-10-30T11:00:00Z" }, now)).toBe(false);
    expect(isActiveDonationListing({ status: "EXPIRED", pickupWindowEnd: "2026-10-30T13:00:00Z" }, now)).toBe(false);
  });
});
