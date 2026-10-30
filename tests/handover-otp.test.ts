import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { HandoverService } from "@/lib/handover/service";
import { QuantityUnit } from "@prisma/client";
import bcrypt from "bcryptjs";

describe("Handover OTP Challenges & Cryptographic Verification", () => {
  let testAllocationId: string;
  let testUserId: string;

  beforeAll(async () => {
    const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    testUserId = admin!.id;

    const ngo = await prisma.organisation.findFirst({ where: { type: "NGO" } });
    const donor = await prisma.organisation.findFirst({ where: { type: "DONOR" } });

    const donation = await prisma.donation.create({
      data: {
        donorOrgId: donor!.id,
        createdByUserId: testUserId,
        title: "Test Handover Challenge Batch",
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
            name: "Biryani Portions",
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
        status: "ACCEPTED",
        snapshotItemDetails: "{}",
      },
    });

    testAllocationId = alloc.id;
  });

  afterAll(async () => {
    await prisma.handoverChallenge.deleteMany({
      where: { allocationId: testAllocationId },
    });
    await prisma.handoverEvent.deleteMany({
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

  it("generates a 6-digit challenge and stores a hashed secret in the database", async () => {
    const result = await HandoverService.generateChallenge({
      allocationId: testAllocationId,
      stage: "COLLECTION",
      actorUserId: testUserId,
    });

    expect(result.challengeId).toBeDefined();
    expect(result.demoCode).toMatch(/^\d{6}$/);

    const challenge = await prisma.handoverChallenge.findUnique({
      where: { id: result.challengeId },
    });

    expect(challenge).toBeDefined();
    expect(challenge!.secretHash).not.toBe(result.demoCode); // must be hashed!
    const matchesHash = await bcrypt.compare(result.demoCode!, challenge!.secretHash);
    expect(matchesHash).toBe(true);
  });

  it("rejects invalid OTP attempts and locks out after exceeding maximum attempts", async () => {
    // Attempt with incorrect code
    await expect(
      HandoverService.verifyChallenge({
        allocationId: testAllocationId,
        stage: "COLLECTION",
        otp: "000000", // Wrong code
        verifiedQuantity: 50,
        actorUserId: testUserId,
      })
    ).rejects.toThrow(/INVALID_CODE/);

    const challenge = await prisma.handoverChallenge.findFirst({
      where: { allocationId: testAllocationId, stage: "COLLECTION" },
      orderBy: { createdAt: "desc" },
    });

    expect(challenge!.attemptCount).toBe(1);
  });

  it("successfully verifies valid OTP and updates allocation to COLLECTED", async () => {
    const challenge = await prisma.handoverChallenge.findFirst({
      where: { allocationId: testAllocationId, stage: "COLLECTION" },
      orderBy: { createdAt: "desc" },
    });

    const validCode = challenge!.plaintextForDemo!;

    const result = await HandoverService.verifyChallenge({
      allocationId: testAllocationId,
      stage: "COLLECTION",
      otp: validCode,
      verifiedQuantity: 50,
      inspectionNotes: "Clean hot-hold containers verified by volunteer.",
      actorUserId: testUserId,
    });

    expect(result.success).toBe(true);
    expect(result.allocationStatus).toBe("COLLECTED");

    // HandoverEvent created
    const event = await prisma.handoverEvent.findFirst({
      where: { allocationId: testAllocationId, stage: "COLLECTION" },
    });
    expect(event).toBeDefined();
    expect(event!.verifiedQuantity).toBe(50);
  });

  it("records delivery with partial acceptance and partial rejection with mandatory reason", async () => {
    // Generate Delivery Challenge
    const deliveryChallenge = await HandoverService.generateChallenge({
      allocationId: testAllocationId,
      stage: "DELIVERY",
      actorUserId: testUserId,
    });

    // NGO accepts 48, rejects 2 due to seal damage
    const result = await HandoverService.verifyChallenge({
      allocationId: testAllocationId,
      stage: "DELIVERY",
      otp: deliveryChallenge.demoCode!,
      verifiedQuantity: 48,
      rejectedQuantity: 2,
      rejectionReason: "Broken seal on 2 container lids during transport.",
      actorUserId: testUserId,
    });

    expect(result.success).toBe(true);
    expect(result.allocationStatus).toBe("PARTIALLY_DELIVERED");

    const alloc = await prisma.allocation.findUnique({
      where: { id: testAllocationId },
    });
    expect(alloc!.deliveredQuantity).toBe(48);
    expect(alloc!.rejectedQuantity).toBe(2);
    expect(alloc!.rejectionReason).toBe("Broken seal on 2 container lids during transport.");
  });
});
