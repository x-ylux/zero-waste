import { describe, expect, it } from "vitest";
import { IMPACT_CONFIG } from "@/lib/config/impact";
import { createSeedState } from "@/lib/data/seed";
import {
  acceptTask,
  confirmPickup,
  confirmReceipt,
  createDonation,
  reserveDonation,
} from "@/lib/domain/engine";
import { calculateImpact } from "@/lib/domain/impact";

describe("impact calculation", () => {
  const now = new Date("2026-10-31T12:00:00+05:30");

  it("counts only accepted quantities and keeps units separate", () => {
    const state = createSeedState(now);
    const impact = calculateImpact(state.donations);
    expect(impact.completedDeliveries).toBeGreaterThanOrEqual(2);
    expect(impact.acceptedByUnit.servings).toBe(68 + 90);
    expect(impact.acceptedByUnit.kg).toBe(0);
    expect(impact.estimatedMealEquivalents).toBe(
      impact.acceptedByUnit.servings * IMPACT_CONFIG.mealEquivalents.servings
    );
    expect(impact.label).toMatch(/Illustrative/);
  });

  it("prevents double-counting after receipt confirmation", () => {
    let state = createSeedState(now);
    const created = createDonation(
      state,
      "user-donor-maya",
      {
        title: "Impact test trays",
        description: "Fresh surplus for impact regression.",
        category: "cooked_meals",
        quantity: 20,
        unit: "servings",
        dietaryTags: ["vegetarian"],
        allergens: ["unknown"],
        storage: "hot_hold",
        handlingRequirements: ["keep_hot", "time_sensitive"],
        packagingAvailable: true,
        pickupLocation: state.donors[0].location,
        pickupWindowStart: new Date(now.getTime() + 30 * 60_000).toISOString(),
        pickupWindowEnd: new Date(now.getTime() + 3 * 60 * 60_000).toISOString(),
        contactName: "Maya Reddy",
        contactPhone: "+91 98000 11001",
        handlingAcknowledged: true,
      },
      now
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    state = created.state;
    const donationId = state.donations[0].id;

    const reserved = reserveDonation(state, "user-ngo-anjali", donationId, now);
    expect(reserved.ok).toBe(true);
    if (!reserved.ok) return;
    state = reserved.state;
    const taskId = state.tasks.find((item) => item.donationId === donationId)!.id;

    const accepted = acceptTask(state, "user-vol-aarav", taskId, now);
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    state = accepted.state;

    const picked = confirmPickup(state, "user-vol-aarav", taskId, "manual", now);
    expect(picked.ok).toBe(true);
    if (!picked.ok) return;
    state = picked.state;

    const before = calculateImpact(state.donations).acceptedByUnit.servings;
    const receipt = confirmReceipt(state, "user-ngo-anjali", donationId, 18, now);
    expect(receipt.ok).toBe(true);
    if (!receipt.ok) return;
    state = receipt.state;
    const after = calculateImpact(state.donations).acceptedByUnit.servings;
    expect(after - before).toBe(18);

    const duplicate = confirmReceipt(state, "user-ngo-anjali", donationId, 18, now);
    expect(duplicate.ok).toBe(false);
    expect(calculateImpact(state.donations).acceptedByUnit.servings).toBe(after);
  });
});
