import { describe, expect, it } from "vitest";
import { createSeedState } from "@/lib/data/seed";
import {
  acceptTask,
  confirmPickup,
  createDonation,
  enterRescueMode,
  reserveDonation,
} from "@/lib/domain/engine";

describe("backup reassignment / Rescue Mode", () => {
  const now = new Date("2026-10-31T12:00:00+05:30");

  it("releases the assignment, pages standbys, and allows one backup accept", () => {
    let state = createSeedState(now);
    const listed = createDonation(
      state,
      "user-donor-maya",
      {
        title: "Rescue Mode demo trays",
        description: "Sized for scooter capacity so the first volunteer can accept.",
        category: "cooked_meals",
        quantity: 30,
        unit: "servings",
        dietaryTags: ["vegetarian"],
        allergens: ["unknown"],
        storage: "hot_hold",
        handlingRequirements: ["keep_hot", "time_sensitive"],
        packagingAvailable: true,
        pickupLocation: state.donors[0].location,
        pickupWindowStart: new Date(now.getTime() + 30 * 60_000).toISOString(),
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

    const reserve = reserveDonation(state, "user-ngo-anjali", donationId, now);
    expect(reserve.ok).toBe(true);
    if (!reserve.ok) return;
    state = reserve.state;
    const taskId = state.tasks.find((item) => item.donationId === donationId)!.id;

    const firstAccept = acceptTask(state, "user-vol-aarav", taskId, now);
    expect(firstAccept.ok).toBe(true);
    if (!firstAccept.ok) return;
    state = firstAccept.state;

    const rescue = enterRescueMode(state, taskId, "Simulated volunteer cancellation", now, "user-vol-aarav");
    expect(rescue.ok).toBe(true);
    if (!rescue.ok) return;
    state = rescue.state;
    const task = state.tasks.find((item) => item.id === taskId)!;
    expect(task.status).toBe("backup_needed");
    expect(task.volunteerId).toBeUndefined();
    expect(task.standbyNotifiedIds.length).toBeGreaterThan(0);
    expect(state.notifications.some((item) => item.title.includes("Rescue Mode") && item.simulated)).toBe(true);

    const secondAccept = acceptTask(state, "user-vol-priya", taskId, now);
    expect(secondAccept.ok).toBe(true);
    if (!secondAccept.ok) return;
    state = secondAccept.state;
    expect(state.tasks.find((item) => item.id === taskId)?.volunteerId).toBe("vol-priya");
    expect(state.tasks.find((item) => item.id === taskId)?.status).toBe("assigned");

    const doubleBook = acceptTask(state, "user-vol-farah", taskId, now);
    expect(doubleBook.ok).toBe(false);
  });

  it("prevents pickup after delivery", () => {
    const state = createSeedState(now);
    const deliveredTask = state.tasks.find((item) => item.id === "task-07")!;
    const attempt = confirmPickup(state, "user-vol-priya", deliveredTask.id, "manual", now);
    expect(attempt.ok).toBe(false);
  });
});
