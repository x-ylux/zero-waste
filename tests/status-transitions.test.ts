import { describe, expect, it } from "vitest";
import {
  assertDonationTransition,
  assertTaskTransition,
  canTransitionDonation,
  canTransitionTask,
  isReservable,
} from "@/lib/domain/transitions";

describe("status transitions", () => {
  it("allows the happy-path donation transitions", () => {
    expect(canTransitionDonation("available", "reserved")).toBe(true);
    expect(canTransitionDonation("reserved", "collected")).toBe(true);
    expect(canTransitionDonation("collected", "delivered")).toBe(true);
  });

  it("blocks invalid donation transitions", () => {
    expect(canTransitionDonation("delivered", "collected")).toBe(false);
    expect(canTransitionDonation("expired", "reserved")).toBe(false);
    expect(canTransitionDonation("cancelled", "available")).toBe(false);
    expect(() => assertDonationTransition("delivered", "reserved")).toThrow(/cannot move/i);
  });

  it("only treats available listings as newly reservable", () => {
    expect(isReservable("available")).toBe(true);
    expect(isReservable("expired")).toBe(false);
    expect(isReservable("cancelled")).toBe(false);
    expect(isReservable("delivered")).toBe(false);
  });

  it("supports rescue-mode task recovery transitions", () => {
    expect(canTransitionTask("assigned", "backup_needed")).toBe(true);
    expect(canTransitionTask("backup_needed", "assigned")).toBe(true);
    expect(canTransitionTask("picked_up", "delivered")).toBe(true);
    expect(canTransitionTask("delivered", "picked_up")).toBe(false);
    expect(() => assertTaskTransition("cancelled", "assigned")).toThrow(/cannot move/i);
  });
});
