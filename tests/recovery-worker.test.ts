import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { RecoveryWorker } from "@/lib/recovery/worker";
import { QuantityUnit } from "@prisma/client";

describe("Durable Failed-Pickup Recovery & Background Worker", () => {
  let testAllocationId: string;
  let testAssignmentId: string;
  let primaryVolunteerId: string;
  let backupVolunteerId: string;
  let testUserId: string;

  beforeAll(async () => {
    const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    testUserId = admin!.id;

    const aarav = await prisma.user.findUnique({
      where: { email: "vol.aarav@rescueplate.org" },
    });
    primaryVolunteerId = aarav!.id;

    const priya = await prisma.user.findUnique({
      where: { email: "vol.priya@rescueplate.org" },
    });
    backupVolunteerId = priya!.id;

    const donor = await prisma.organisation.findFirst({ where: { type: "DONOR" } });
    const ngo = await prisma.organisation.findFirst({ where: { type: "NGO" } });

    const donation = await prisma.donation.create({
      data: {
        donorOrgId: donor!.id,
        createdByUserId: testUserId,
        title: "Test Worker Recovery Batch",
        foodCategory: "COOKED_MEALS",
        storageInfo: "HOT_HOLD",
        packagingInfo: "SEALED_CONTAINERS",
        pickupAddress: donor!.address,
        latitude: donor!.latitude,
        longitude: donor!.longitude,
        pickupWindowStart: new Date(Date.now() + 10 * 60 * 1000),
        pickupWindowEnd: new Date(Date.now() + 6 * 3600 * 1000),
        status: "OPEN",
        items: {
          create: {
            name: "Recovery Test Portions",
            quantity: 50,
            unit: QuantityUnit.SERVINGS,
          },
        },
      },
      include: { items: true },
    });

    const alloc = await prisma.allocation.create({
      data: {
        donationId: donation.id,
        donationItemId: donation.items[0].id,
        ngoOrgId: ngo!.id,
        allocatedQuantity: 50,
        unit: QuantityUnit.SERVINGS,
        status: "ASSIGNED",
        snapshotItemDetails: "{}",
      },
    });

    testAllocationId = alloc.id;

    // Create active assignment for primary volunteer
    const assign = await prisma.assignment.create({
      data: {
        allocationId: alloc.id,
        volunteerUserId: primaryVolunteerId,
        status: "ACCEPTED",
        isCurrent: true,
        offerExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
        acceptedAt: new Date(),
        notes: "Initial primary volunteer assignment",
      },
    });

    testAssignmentId = assign.id;
  });

  afterAll(async () => {
    await prisma.assignmentOffer.deleteMany({
      where: { assignment: { allocationId: testAllocationId } },
    });
    await prisma.assignment.deleteMany({
      where: { allocationId: testAllocationId },
    });
    await prisma.incident.deleteMany({
      where: { allocationId: testAllocationId },
    });
    const alloc = await prisma.allocation.findUnique({
      where: { id: testAllocationId },
    });
    if (alloc) {
      await prisma.allocation.delete({ where: { id: testAllocationId } });
      await prisma.donationItem.deleteMany({ where: { donationId: alloc.donationId } });
      await prisma.donation.delete({ where: { id: alloc.donationId } });
    }
  });

  it("volunteer cancellation preserves history and dispatches offer to backup volunteer", async () => {
    const recovered = await RecoveryWorker.cancelAssignmentByVolunteer(
      testAssignmentId,
      "Two-wheeler mechanical failure in traffic.",
      primaryVolunteerId
    );

    expect(recovered).toBe(true);

    // Verify initial assignment was preserved as CANCELLED with reason
    const oldAssign = await prisma.assignment.findUnique({
      where: { id: testAssignmentId },
    });
    expect(oldAssign!.status).toBe("CANCELLED");
    expect(oldAssign!.isCurrent).toBe(false);
    expect(oldAssign!.cancellationReason).toBe("Two-wheeler mechanical failure in traffic.");

    // Verify a new current assignment was created for the backup volunteer
    const newAssign = await prisma.assignment.findFirst({
      where: { allocationId: testAllocationId, isCurrent: true },
      include: { volunteer: true },
    });

    expect(newAssign).toBeDefined();
    expect(newAssign!.status).toBe("OFFERED");
    expect(newAssign!.volunteerUserId).not.toBe(primaryVolunteerId);
  });

  it("running the background worker multiple times is safe and idempotent", async () => {
    const result1 = await RecoveryWorker.run();
    expect(result1.processedExpiredOffersCount).toBeGreaterThanOrEqual(0);

    const result2 = await RecoveryWorker.run();
    expect(result2.processedExpiredOffersCount).toBe(0); // Idempotent: no unhandled offers left
  });

  it("prevents reassignment once food is already collected", async () => {
    // Set allocation status to COLLECTED
    await prisma.allocation.update({
      where: { id: testAllocationId },
      data: { status: "COLLECTED" },
    });

    const activeAssign = await prisma.assignment.findFirst({
      where: { allocationId: testAllocationId, isCurrent: true },
    });

    if (activeAssign) {
      // Mark as COLLECTED
      await prisma.assignment.update({
        where: { id: activeAssign.id },
        data: { status: "COLLECTED" },
      });

      await expect(
        RecoveryWorker.cancelAssignmentByVolunteer(
          activeAssign.id,
          "Attempting late cancellation",
          activeAssign.volunteerUserId
        )
      ).rejects.toThrow(/Cannot cancel assignment after food has been collected/);
    }
  });
});
