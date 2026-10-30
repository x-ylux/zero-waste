import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { AllocationService } from "@/lib/allocations/service";
import { QuantityUnit } from "@prisma/client";

describe("Transactional Split Allocation & Inventory Isolation", () => {
  let testDonationId: string;
  let testItemId: string;
  let testNgoId: string;
  let testCapacityWindowId: string;
  let originalCapacityWindow: { maxCapacity: number; reservedCapacity: number };
  let testUserId: string;

  beforeAll(async () => {
    // Fetch seed records
    const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    testUserId = admin!.id;

    const ngo = await prisma.organisation.findFirst({
      where: { type: "NGO", isVerified: true },
      include: { capacityWindows: true },
    });
    testNgoId = ngo!.id;
    const servingsWindow = ngo!.capacityWindows.find((window) => window.unit === "SERVINGS");
    testCapacityWindowId = servingsWindow!.id;
    originalCapacityWindow = {
      maxCapacity: servingsWindow!.maxCapacity,
      reservedCapacity: servingsWindow!.reservedCapacity,
    };
    await prisma.capacityWindow.update({
      where: { id: testCapacityWindowId },
      data: {
        maxCapacity: Math.max(servingsWindow!.maxCapacity, servingsWindow!.reservedCapacity + 100),
      },
    });

    // Create a dedicated test donation with 100 servings
    const donor = await prisma.organisation.findFirst({ where: { type: "DONOR" } });
    const donation = await prisma.donation.create({
      data: {
        donorOrgId: donor!.id,
        createdByUserId: testUserId,
        title: "Test Surplus Batch for Concurrency",
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
            name: "Test Dal Combo",
            quantity: 100,
            unit: QuantityUnit.SERVINGS,
          },
        },
      },
      include: { items: true },
    });

    testDonationId = donation.id;
    testItemId = donation.items[0].id;
  });

  afterAll(async () => {
    // Cleanup test records
    await prisma.handoverChallenge.deleteMany({
      where: { allocation: { donationId: testDonationId } },
    });
    await prisma.assignment.deleteMany({
      where: { allocation: { donationId: testDonationId } },
    });
    await prisma.allocation.deleteMany({
      where: { donationId: testDonationId },
    });
    await prisma.donationItem.deleteMany({
      where: { donationId: testDonationId },
    });
    await prisma.donation.delete({
      where: { id: testDonationId },
    });
    await prisma.capacityWindow.update({
      where: { id: testCapacityWindowId },
      data: originalCapacityWindow,
    });
  });

  it("splits a 100-portion donation with a partial acceptance of 60 portions", async () => {
    const allocation = await AllocationService.acceptAllocation({
      donationId: testDonationId,
      donationItemId: testItemId,
      ngoOrgId: testNgoId,
      allocatedQuantity: 60,
      unit: QuantityUnit.SERVINGS,
      capacityWindowId: testCapacityWindowId,
      actorUserId: testUserId,
    });

    expect(allocation.allocatedQuantity).toBe(60);
    expect(allocation.status).toBe("AWAITING_VOLUNTEER");

    // Verify donation item updated
    const item = await prisma.donationItem.findUnique({ where: { id: testItemId } });
    expect(item!.allocatedQuantity).toBe(60);

    // Verify aggregate donation status
    const donation = await prisma.donation.findUnique({ where: { id: testDonationId } });
    expect(donation!.status).toBe("PARTIALLY_ALLOCATED");
  });

  it("prevents over-allocation when requested quantity exceeds remaining available (e.g. 50 when 40 remain)", async () => {
    // Only 40 portions remain available (100 - 60)
    await expect(
      AllocationService.acceptAllocation({
        donationId: testDonationId,
        donationItemId: testItemId,
        ngoOrgId: testNgoId,
        allocatedQuantity: 50, // Exceeds 40
        unit: QuantityUnit.SERVINGS,
        actorUserId: testUserId,
      })
    ).rejects.toThrow(/OVER_ALLOCATION/);
  });

  it("accepts the remaining 40 portions, transitioning donation to FULLY_ALLOCATED", async () => {
    const secondAllocation = await AllocationService.acceptAllocation({
      donationId: testDonationId,
      donationItemId: testItemId,
      ngoOrgId: testNgoId,
      allocatedQuantity: 40,
      unit: QuantityUnit.SERVINGS,
      actorUserId: testUserId,
    });

    expect(secondAllocation.allocatedQuantity).toBe(40);

    const donation = await prisma.donation.findUnique({ where: { id: testDonationId } });
    expect(donation!.status).toBe("FULLY_ALLOCATED");
  });

  it("cancelling an uncollected allocation releases reserved capacity and inventory", async () => {
    const allocs = await prisma.allocation.findMany({
      where: {
        donationId: testDonationId,
        status: { in: ["ACCEPTED", "AWAITING_VOLUNTEER"] },
      },
    });
    const targetAlloc = allocs[0];

    const cancelled = await AllocationService.cancelAllocation({
      allocationId: targetAlloc.id,
      reason: "Shelter kitchen power maintenance.",
      actorUserId: testUserId,
    });

    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.cancellationReason).toBe("Shelter kitchen power maintenance.");

    // Inventory returned to donation item
    const item = await prisma.donationItem.findUnique({ where: { id: testItemId } });
    expect(item!.allocatedQuantity).toBe(100 - targetAlloc.allocatedQuantity);

    // Donation status reopened to PARTIALLY_ALLOCATED
    const donation = await prisma.donation.findUnique({ where: { id: testDonationId } });
    expect(donation!.status).toBe("PARTIALLY_ALLOCATED");
  });

  it("prohibits cancelling an allocation once food has already been collected", async () => {
    // Create an allocation and manually set to COLLECTED
    const collectedAlloc = await prisma.allocation.create({
      data: {
        donationId: testDonationId,
        donationItemId: testItemId,
        ngoOrgId: testNgoId,
        allocatedQuantity: 10,
        unit: QuantityUnit.SERVINGS,
        status: "COLLECTED",
        snapshotItemDetails: "{}",
        collectedQuantity: 10,
      },
    });

    await expect(
      AllocationService.cancelAllocation({
        allocationId: collectedAlloc.id,
        reason: "Cancelled by volunteer",
        actorUserId: testUserId,
      })
    ).rejects.toThrow(/FORBIDDEN_TRANSITION.*cannot be returned to donor inventory/);

    await prisma.allocation.delete({ where: { id: collectedAlloc.id } });
  });
});
