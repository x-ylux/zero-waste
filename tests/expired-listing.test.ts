import { describe, expect, it } from "vitest";
import { createSeedState } from "@/lib/data/seed";
import { expireStaleListings, reserveDonation } from "@/lib/domain/engine";

describe("expired listings", () => {
  it("cannot be newly reserved", () => {
    const now = new Date("2026-10-31T12:00:00+05:30");
    const state = createSeedState(now);
    const result = reserveDonation(state, "user-ngo-anjali", "don-09", now);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/expired|cancelled|reserved/i);
  });

  it("marks available listings expired once the pickup window ends", () => {
    const now = new Date("2026-10-31T12:00:00+05:30");
    let state = createSeedState(now);
    const donation = state.donations.find((item) => item.id === "don-01")!;
    donation.pickupWindowEnd = new Date(now.getTime() - 60_000).toISOString();
    donation.status = "available";
    state = expireStaleListings(state, now);
    const expired = state.donations.find((item) => item.id === "don-01")!;
    expect(expired.status).toBe("expired");
    expect(expired.failureReason).toBe("pickup_window_missed");
    expect(state.failures.some((item) => item.donationId === "don-01")).toBe(true);
  });
});
