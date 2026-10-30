import { randomUUID } from "crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { AllocationService } from "@/lib/allocations/service";
import { HandoverService } from "@/lib/handover/service";
import { RecoveryWorker } from "@/lib/recovery/worker";
import { calculateImpactMetrics } from "@/lib/impact/calculator";
import { QuantityUnit } from "@prisma/client";

describe("Complete NGO-to-volunteer rescue workflow", () => {
  const donationId = `donation-workflow-${randomUUID()}`;
  const capacityWindowId = `capacity-workflow-${randomUUID()}`;
  let allocationId: string | undefined;

  afterAll(async () => {
    if (allocationId) {
      await prisma.handoverEvent.deleteMany({ where: { allocationId } });
      await prisma.handoverChallenge.deleteMany({ where: { allocationId } });
      await prisma.assignmentOffer.deleteMany({ where: { assignment: { allocationId } } });
      await prisma.assignment.deleteMany({ where: { allocationId } });
      await prisma.incident.deleteMany({ where: { allocationId } });
      await prisma.allocation.deleteMany({ where: { id: allocationId } });
    }
    await prisma.capacityWindow.deleteMany({ where: { id: capacityWindowId } });
    await prisma.donationItem.deleteMany({ where: { donationId } });
    await prisma.donation.deleteMany({ where: { id: donationId } });
  });

  it("reserves, dispatches, recovers, verifies both handovers, and reconciles impact", async () => {
    const donor = await prisma.organisation.findUniqueOrThrow({
      where: { id: "org-donor-apex-campus" },
    });
    const donorUser = await prisma.user.findUniqueOrThrow({
      where: { email: "donor.mess@rescueplate.org" },
    });
    const ngo = await prisma.organisation.findUniqueOrThrow({
      where: { id: "org-ngo-annapurna" },
    });
    const ngoUser = await prisma.user.findUniqueOrThrow({
      where: { email: "ngo.annapurna@rescueplate.org" },
    });
    const now = new Date();
    const donation = await prisma.donation.create({
      data: {
        id: donationId,
        donorOrgId: donor.id,
        createdByUserId: donorUser.id,
        title: "Workflow Test Meal Batch",
        foodCategory: "COOKED_MEALS",
        storageInfo: "HOT_HOLD",
        packagingInfo: "SEALED_CONTAINERS",
        pickupAddress: donor.address,
        latitude: donor.latitude,
        longitude: donor.longitude,
        pickupWindowStart: new Date(now.getTime() + 5 * 60_000),
        pickupWindowEnd: new Date(now.getTime() + 2 * 60 * 60_000),
        status: "OPEN",
        items: {
          create: {
            name: "Workflow Test Portions",
            quantity: 20,
            unit: QuantityUnit.SERVINGS,
          },
        },
      },
      include: { items: true },
    });
    await prisma.capacityWindow.create({
      data: {
        id: capacityWindowId,
        organisationId: ngo.id,
        startTime: new Date(now.getTime() - 60_000),
        endTime: new Date(now.getTime() + 3 * 60 * 60_000),
        unit: QuantityUnit.SERVINGS,
        maxCapacity: 20,
      },
    });

    const allocation = await AllocationService.acceptAllocation({
      donationId: donation.id,
      donationItemId: donation.items[0].id,
      ngoOrgId: ngo.id,
      allocatedQuantity: 20,
      unit: QuantityUnit.SERVINGS,
      capacityWindowId,
      actorUserId: ngoUser.id,
    });
    allocationId = allocation.id;
    expect(allocation.status).toBe("AWAITING_VOLUNTEER");

    const initialAssignment = await prisma.assignment.findFirstOrThrow({
      where: { allocationId, isCurrent: true, status: "OFFERED" },
    });
    await prisma.assignment.update({
      where: { id: initialAssignment.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
    await prisma.assignmentOffer.updateMany({
      where: { assignmentId: initialAssignment.id },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    });
    await prisma.allocation.update({
      where: { id: allocationId },
      data: { status: "ASSIGNED" },
    });

    expect(
      await RecoveryWorker.cancelAssignmentByVolunteer(
        initialAssignment.id,
        "Unexpected transport problem during the demo.",
        initialAssignment.volunteerUserId
      )
    ).toBe(true);

    const backupAssignment = await prisma.assignment.findFirstOrThrow({
      where: { allocationId, isCurrent: true, status: "OFFERED" },
    });
    expect(backupAssignment.volunteerUserId).not.toBe(initialAssignment.volunteerUserId);
    await prisma.assignment.update({
      where: { id: backupAssignment.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
    await prisma.assignmentOffer.updateMany({
      where: { assignmentId: backupAssignment.id },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    });
    await prisma.allocation.update({
      where: { id: allocationId },
      data: { status: "ASSIGNED" },
    });

    const collectionChallenge = await HandoverService.generateChallenge({
      allocationId,
      stage: "COLLECTION",
      actorUserId: backupAssignment.volunteerUserId,
    });
    await HandoverService.verifyChallenge({
      allocationId,
      stage: "COLLECTION",
      otp: collectionChallenge.demoCode!,
      verifiedQuantity: 20,
      actorUserId: backupAssignment.volunteerUserId,
    });

    const deliveryChallenge = await HandoverService.generateChallenge({
      allocationId,
      stage: "DELIVERY",
      actorUserId: ngoUser.id,
    });
    await HandoverService.verifyChallenge({
      allocationId,
      stage: "DELIVERY",
      otp: deliveryChallenge.demoCode!,
      verifiedQuantity: 18,
      rejectedQuantity: 2,
      rejectionReason: "Two containers were damaged in transit.",
      actorUserId: ngoUser.id,
    });

    const finalAllocation = await prisma.allocation.findUniqueOrThrow({
      where: { id: allocationId },
    });
    const finalItem = await prisma.donationItem.findUniqueOrThrow({
      where: { id: donation.items[0].id },
    });
    const events = await prisma.handoverEvent.findMany({
      where: { allocationId },
    });
    const metrics = await calculateImpactMetrics();

    expect(finalAllocation.status).toBe("PARTIALLY_DELIVERED");
    expect(finalItem.collectedQuantity).toBe(20);
    expect(finalItem.deliveredQuantity).toBe(18);
    expect(events.map((event) => event.stage).sort()).toEqual(["COLLECTION", "DELIVERY"]);
    expect(metrics.totalDeliveredAcceptedByUnit.SERVINGS).toBeGreaterThanOrEqual(18);
    expect(metrics.totalDeliveredRejectedByUnit.SERVINGS).toBeGreaterThanOrEqual(2);
  });
});
