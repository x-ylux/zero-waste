import { describe, expect, it } from "vitest";
import { createSeedState } from "@/lib/data/seed";
import {
  acceptTask,
  confirmPickup,
  confirmReceipt,
  createDonation,
  enterRescueMode,
  reserveDonation,
} from "@/lib/domain/engine";
import { calculateImpact } from "@/lib/domain/impact";

describe("end-to-end rescue workflow", () => {
  it("runs donor → NGO → volunteer cancel → standby → pickup → receipt", () => {
    const now = new Date("2026-10-31T12:00:00+05:30");
    let state = createSeedState(now);
    const beforeMeals = calculateImpact(state.donations).estimatedMealEquivalents;

    const listed = createDonation(
      state,
      "user-donor-maya",
      {
        title: "Workflow surplus trays",
        description: "Evening trays for the demo corridor.",
        category: "cooked_meals",
        quantity: 24,
        unit: "servings",
        dietaryTags: ["vegetarian"],
        allergens: ["dairy"],
        storage: "hot_hold",
        handlingRequirements: ["keep_hot", "time_sensitive"],
        packagingAvailable: true,
        pickupLocation: state.donors[0].location,
        pickupWindowStart: new Date(now.getTime() + 20 * 60_000).toISOString(),
        pickupWindowEnd: new Date(now.getTime() + 4 * 60 * 60_000).toISOString(),
        contactName: "Maya Reddy",
        contactPhone: "+91 98000 11001",
        handlingAcknowledged: true,
      },
      now
    );
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    state = listed.state;
    const donationId = state.donations[0].id;

    const reserved = reserveDonation(state, "user-ngo-anjali", donationId, now);
    expect(reserved.ok).toBe(true);
    if (!reserved.ok) return;
    state = reserved.state;
    const taskId = state.tasks.find((item) => item.donationId === donationId)!.id;

    const firstVolunteer = acceptTask(state, "user-vol-aarav", taskId, now);
    expect(firstVolunteer.ok).toBe(true);
    if (!firstVolunteer.ok) return;
    state = firstVolunteer.state;

    const rescue = enterRescueMode(state, taskId, "Demo cancellation", now, "user-vol-aarav");
    expect(rescue.ok).toBe(true);
    if (!rescue.ok) return;
    state = rescue.state;

    const standby = acceptTask(state, "user-vol-priya", taskId, now);
    expect(standby.ok).toBe(true);
    if (!standby.ok) return;
    state = standby.state;

    const pickup = confirmPickup(state, "user-vol-priya", taskId, "qr", now);
    expect(pickup.ok).toBe(true);
    if (!pickup.ok) return;
    state = pickup.state;

    const receipt = confirmReceipt(state, "user-ngo-anjali", donationId, 22, now);
    expect(receipt.ok).toBe(true);
    if (!receipt.ok) return;
    state = receipt.state;

    const donation = state.donations.find((item) => item.id === donationId)!;
    expect(donation.status).toBe("delivered");
    expect(donation.acceptedQuantity).toBe(22);
    expect(calculateImpact(state.donations).estimatedMealEquivalents).toBe(beforeMeals + 22);
  });
});
