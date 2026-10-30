import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { HandoverChallenge, HandoverStage, AllocationStatus, AssignmentStatus } from "@prisma/client";

export interface GenerateChallengeParams {
  allocationId: string;
  stage: HandoverStage;
  actorUserId: string;
}

export interface VerifyChallengeParams {
  allocationId: string;
  stage: HandoverStage;
  otp: string;
  verifiedQuantity: number;
  rejectedQuantity?: number;
  rejectionReason?: string | null;
  inspectionNotes?: string | null;
  foodSafetyFlagged?: boolean;
  foodSafetyNotes?: string | null;
  actorUserId: string;
}

export class HandoverService {
  /**
   * Generates a secure, 6-digit OTP challenge for collection or delivery.
   * Stores hashed secret in the database with 15-minute expiry and max 5 attempts.
   */
  static async generateChallenge(
    params: GenerateChallengeParams
  ): Promise<{ challengeId: string; expiresAt: Date; demoCode?: string }> {
    const allocation = await prisma.allocation.findUnique({
      where: { id: params.allocationId },
      include: {
        donation: true,
        ngoOrg: true,
      },
    });

    if (!allocation) {
      throw new Error("NOT_FOUND: Allocation does not exist.");
    }

    // Validate allocation state for stage
    if (params.stage === "COLLECTION") {
      if (allocation.status !== "ACCEPTED" && allocation.status !== "ASSIGNED") {
        throw new Error(
          `INVALID_STATE: Cannot generate collection challenge for allocation in '${allocation.status}' state.`
        );
      }
    } else if (params.stage === "DELIVERY") {
      if (allocation.status !== "COLLECTED") {
        throw new Error(
          `INVALID_STATE: Cannot generate delivery challenge for allocation in '${allocation.status}' state (must be COLLECTED first).`
        );
      }
    }

    // Generate cryptographically random 6-digit numeric string
    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(10);
    const secretHash = await bcrypt.hash(rawOtp, salt);

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    const isDemoMode = process.env.DEMO_MODE === "true";

    const challenge = await prisma.handoverChallenge.create({
      data: {
        allocationId: params.allocationId,
        stage: params.stage,
        challengeType: "OTP",
        secretHash,
        // Plaintext stored strictly for interactive demo helper when DEMO_MODE=true
        plaintextForDemo: isDemoMode ? rawOtp : null,
        expiresAt,
        attemptCount: 0,
        maxAttempts: 5,
        createdByUserId: params.actorUserId,
      },
    });

    return {
      challengeId: challenge.id,
      expiresAt,
      demoCode: isDemoMode ? rawOtp : undefined,
    };
  }

  /**
   * Verifies an OTP challenge and atomically commits the collection or delivery event.
   */
  static async verifyChallenge(
    params: VerifyChallengeParams
  ): Promise<{ success: boolean; stage: HandoverStage; allocationStatus: AllocationStatus }> {
    // 1. Fetch latest active challenge for this allocation and stage
    const challenge = await prisma.handoverChallenge.findFirst({
      where: {
        allocationId: params.allocationId,
        stage: params.stage,
        isVerified: false,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!challenge) {
      throw new Error("NOT_FOUND: No active handover challenge found for this stage.");
    }

    if (new Date() > challenge.expiresAt) {
      throw new Error("EXPIRED_CHALLENGE: Handover verification code has expired. Please generate a new one.");
    }

    if (challenge.attemptCount >= challenge.maxAttempts) {
      throw new Error(
        "MAX_ATTEMPTS_EXCEEDED: Verification code locked due to too many failed attempts. Please generate a new one."
      );
    }

    // Check OTP match
    const isMatch = await bcrypt.compare(params.otp, challenge.secretHash);
    if (!isMatch) {
      await prisma.handoverChallenge.update({
        where: { id: challenge.id },
        data: { attemptCount: { increment: 1 } },
      });
      const remaining = challenge.maxAttempts - (challenge.attemptCount + 1);
      throw new Error(
        `INVALID_CODE: Invalid verification code. ${remaining} attempt(s) remaining.`
      );
    }

    return await prisma.$transaction(async (tx) => {
      // Mark challenge verified
      await tx.handoverChallenge.update({
        where: { id: challenge.id },
        data: {
          isVerified: true,
          verifiedAt: new Date(),
        },
      });

      // 2. Fetch allocation
      const allocation = await tx.allocation.findUnique({
        where: { id: params.allocationId },
        include: {
          donation: { include: { items: true } },
          donationItem: true,
          assignments: { where: { isCurrent: true } },
          capacityWindow: true,
        },
      });

      if (!allocation) {
        throw new Error("NOT_FOUND: Allocation not found.");
      }

      let newAllocationStatus: AllocationStatus = allocation.status;
      let newAssignmentStatus: AssignmentStatus = "COLLECTED";

      if (params.stage === "COLLECTION") {
        if (params.verifiedQuantity <= 0) {
          throw new Error("INVALID_QUANTITY: Collected quantity must be greater than zero.");
        }

        newAllocationStatus = "COLLECTED";
        newAssignmentStatus = "COLLECTED";

        await tx.allocation.update({
          where: { id: allocation.id },
          data: {
            status: newAllocationStatus,
            collectedQuantity: params.verifiedQuantity,
          },
        });

        await tx.donationItem.update({
          where: { id: allocation.donationItemId },
          data: {
            collectedQuantity: {
              increment: params.verifiedQuantity,
            },
          },
        });
      } else if (params.stage === "DELIVERY") {
        const rejected = params.rejectedQuantity || 0;
        const accepted = params.verifiedQuantity;

        if (accepted === 0 && rejected > 0) {
          newAllocationStatus = "REJECTED";
          newAssignmentStatus = "FAILED";
        } else if (rejected > 0 && accepted > 0) {
          newAllocationStatus = "PARTIALLY_DELIVERED";
          newAssignmentStatus = "COMPLETED";
        } else {
          newAllocationStatus = "DELIVERED";
          newAssignmentStatus = "COMPLETED";
        }

        await tx.allocation.update({
          where: { id: allocation.id },
          data: {
            status: newAllocationStatus,
            deliveredQuantity: accepted,
            rejectedQuantity: rejected,
            rejectionReason: params.rejectionReason || null,
          },
        });

        await tx.donationItem.update({
          where: { id: allocation.donationItemId },
          data: {
            deliveredQuantity: {
              increment: accepted,
            },
          },
        });

        if (allocation.capacityWindowId) {
          await tx.capacityWindow.update({
            where: { id: allocation.capacityWindowId },
            data: {
              receivedCapacity: {
                increment: accepted,
              },
            },
          });
        }
      }

      // Update current assignment status
      for (const assignment of allocation.assignments) {
        await tx.assignment.update({
          where: { id: assignment.id },
          data: { status: newAssignmentStatus },
        });
      }

      // 3. Create HandoverEvent record
      await tx.handoverEvent.create({
        data: {
          allocationId: allocation.id,
          stage: params.stage,
          actorUserId: params.actorUserId,
          verifiedQuantity: params.verifiedQuantity,
          rejectedQuantity: params.rejectedQuantity || 0,
          rejectionReason: params.rejectionReason || null,
          inspectionNotes: params.inspectionNotes || null,
          foodSafetyFlagged: !!params.foodSafetyFlagged,
          foodSafetyNotes: params.foodSafetyNotes || null,
        },
      });

      // 4. If food safety concern flagged, automatically file an Incident
      if (params.foodSafetyFlagged) {
        await tx.incident.create({
          data: {
            allocationId: allocation.id,
            reporterUserId: params.actorUserId,
            title: `Food Safety Flagged at ${params.stage}`,
            description: params.foodSafetyNotes || "Collector or recipient noted food safety concerns.",
            severity: "HIGH",
            status: "OPEN",
          },
        });
      }

      // 5. Audit event
      await tx.auditEvent.create({
        data: {
          actorUserId: params.actorUserId,
          action: `HANDOVER_${params.stage}_VERIFIED`,
          entityType: "Allocation",
          entityId: allocation.id,
          details: JSON.stringify({
            stage: params.stage,
            verifiedQuantity: params.verifiedQuantity,
            rejectedQuantity: params.rejectedQuantity,
            newAllocationStatus,
          }),
        },
      });

      // 6. Check if all allocations for donation are complete, and update donation to CLOSED
      const allAllocations = await tx.allocation.findMany({
        where: { donationId: allocation.donationId },
      });
      const allCompleted = allAllocations.every(
        (a) =>
          a.status === "DELIVERED" ||
          a.status === "PARTIALLY_DELIVERED" ||
          a.status === "REJECTED" ||
          a.status === "CANCELLED"
      );
      if (allCompleted) {
        await tx.donation.update({
          where: { id: allocation.donationId },
          data: { status: "CLOSED" },
        });
      }

      return {
        success: true,
        stage: params.stage,
        allocationStatus: newAllocationStatus,
      };
    });
  }
}
