import { prisma } from "@/lib/prisma";
import { mapAdapter } from "@/lib/maps/adapter";
import { assertAllocationTransition, assertAssignmentTransition } from "@/lib/domain/status-transitions";

export interface WorkerRunResult {
  processedExpiredOffersCount: number;
  recoveredAssignmentsCount: number;
  escalatedToAdminCount: number;
  logs: string[];
}

export class RecoveryWorker {
  /**
   * Main idempotent worker task.
   * Scans for expired assignment offers and processes backup volunteer reassignment.
   */
  static async run(): Promise<WorkerRunResult> {
    const logs: string[] = [];
    let processedExpiredOffersCount = 0;
    let recoveredAssignmentsCount = 0;
    let escalatedToAdminCount = 0;

    const now = new Date();
    logs.push(`[${now.toISOString()}] Starting RecoveryWorker execution...`);

    // 1. Find all active assignments that are OFFERED and expired
    const expiredAssignments = await prisma.assignment.findMany({
      where: {
        status: "OFFERED",
        offerExpiresAt: { lte: now },
        isCurrent: true,
      },
      include: {
        allocation: {
          include: {
            donation: true,
            ngoOrg: true,
            donationItem: true,
          },
        },
        volunteer: true,
      },
    });

    logs.push(`Found ${expiredAssignments.length} expired assignment offer(s).`);

    for (const assignment of expiredAssignments) {
      processedExpiredOffersCount++;

      // Prevent reassignment if food is already collected
      if (
        assignment.allocation.status === "COLLECTED" ||
        assignment.allocation.status === "DELIVERED"
      ) {
        logs.push(
          `Skipping assignment ${assignment.id} because allocation is already ${assignment.allocation.status}.`
        );
        continue;
      }

      // Mark the expired assignment as TIMED_OUT (preserving history)
      assertAssignmentTransition(assignment.status, "TIMED_OUT");
      await prisma.assignment.update({
        where: { id: assignment.id },
        data: {
          status: "TIMED_OUT",
          failureReason: "Assignment offer expired without acceptance.",
          isCurrent: false,
        },
      });

      // Also mark any pending offers as EXPIRED
      await prisma.assignmentOffer.updateMany({
        where: {
          assignmentId: assignment.id,
          status: "PENDING",
        },
        data: {
          status: "EXPIRED",
          respondedAt: now,
        },
      });

      logs.push(
        `Preserved assignment ${assignment.id} as TIMED_OUT. Evaluating backup volunteers for Allocation ${assignment.allocationId}...`
      );

      // Attempt backup recovery
      const recovered = await this.findAndAssignBackupVolunteer(
        assignment.allocationId,
        "System Recovery: previous offer timed out."
      );

      if (recovered) {
        recoveredAssignmentsCount++;
        logs.push(
          `Successfully dispatched backup offer to volunteer for Allocation ${assignment.allocationId}.`
        );
      } else {
        escalatedToAdminCount++;
        logs.push(
          `No feasible backup volunteer found for Allocation ${assignment.allocationId}. Escalated incident to Admin.`
        );
      }
    }

    logs.push(
      `RecoveryWorker complete: ${processedExpiredOffersCount} expired offers processed, ${recoveredAssignmentsCount} recovered, ${escalatedToAdminCount} escalated.`
    );

    return {
      processedExpiredOffersCount,
      recoveredAssignmentsCount,
      escalatedToAdminCount,
      logs,
    };
  }

  /**
   * Evaluates available volunteers for an allocation and dispatches a backup offer.
   * If none are found, escalates to Admin by creating an Incident.
   */
  static async findAndAssignBackupVolunteer(
    allocationId: string,
    triggerReason: string
  ): Promise<boolean> {
    const allocation = await prisma.allocation.findUnique({
      where: { id: allocationId },
      include: {
        donation: true,
        donationItem: true,
        ngoOrg: true,
        assignments: true,
      },
    });

    if (!allocation) return false;

    // Food already collected cannot be reoffered via pre-collection flow
    if (
      allocation.status === "COLLECTED" ||
      allocation.status === "DELIVERED" ||
      allocation.status === "PARTIALLY_DELIVERED" ||
      allocation.status === "CANCELLED"
    ) {
      return false;
    }

    // List of volunteer IDs who have already declined, timed out, or cancelled this allocation
    const previouslyAttemptedVolunteerIds = allocation.assignments.map(
      (a) => a.volunteerUserId
    );

    // Find available, verified, non-suspended volunteers
    const potentialVolunteers = await prisma.user.findMany({
      where: {
        role: "VOLUNTEER",
        isActive: true,
        isSuspended: false,
        id: { notIn: previouslyAttemptedVolunteerIds },
        volunteerProfile: {
          isAvailable: true,
          capacityUnit: allocation.unit,
          maxCarryingCapacity: { gte: allocation.allocatedQuantity },
        },
      },
      include: {
        volunteerProfile: true,
      },
    });

    // Check proximity feasibility
    const feasibleVolunteers = potentialVolunteers.filter((vol) => {
      if (!vol.volunteerProfile) return false;
      const distanceToDonor = mapAdapter.calculateDistance(
        {
          latitude: vol.volunteerProfile.latitude,
          longitude: vol.volunteerProfile.longitude,
        },
        {
          latitude: allocation.donation.latitude,
          longitude: allocation.donation.longitude,
        }
      );
      return distanceToDonor <= vol.volunteerProfile.operatingRadiusKm;
    });

    if (feasibleVolunteers.length === 0) {
      // Escalation to Admin
      await prisma.incident.create({
        data: {
          allocationId: allocation.id,
          reporterUserId: allocation.donation.createdByUserId,
          title: "Pickup Recovery Failed: No Backup Volunteers",
          description: `Allocation ${allocation.id} (${allocation.allocatedQuantity} ${allocation.unit}) has no feasible backup volunteers within range. Reason: ${triggerReason}`,
          severity: "HIGH",
          status: "OPEN",
        },
      });

      await prisma.auditEvent.create({
        data: {
          action: "RECOVERY_ESCALATED_TO_ADMIN",
          entityType: "Allocation",
          entityId: allocation.id,
          reason: `No eligible backup volunteer found. Trigger: ${triggerReason}`,
          details: JSON.stringify({
            allocatedQuantity: allocation.allocatedQuantity,
            unit: allocation.unit,
            attemptedCount: previouslyAttemptedVolunteerIds.length,
          }),
        },
      });

      // Update allocation status to AWAITING_VOLUNTEER
      assertAllocationTransition(allocation.status, "AWAITING_VOLUNTEER");
      await prisma.allocation.update({
        where: { id: allocation.id },
        data: { status: "AWAITING_VOLUNTEER" },
      });

      return false;
    }

    // Select the best volunteer (closest to pickup)
    const sorted = feasibleVolunteers.sort((a, b) => {
      const distA = mapAdapter.calculateDistance(
        {
          latitude: a.volunteerProfile!.latitude,
          longitude: a.volunteerProfile!.longitude,
        },
        {
          latitude: allocation.donation.latitude,
          longitude: allocation.donation.longitude,
        }
      );
      const distB = mapAdapter.calculateDistance(
        {
          latitude: b.volunteerProfile!.latitude,
          longitude: b.volunteerProfile!.longitude,
        },
        {
          latitude: allocation.donation.latitude,
          longitude: allocation.donation.longitude,
        }
      );
      return distA - distB;
    });

    const chosenVolunteer = sorted[0];
    const offerExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes offer
    assertAllocationTransition(allocation.status, "AWAITING_VOLUNTEER");

    // Create new Assignment with status OFFERED
    const newAssignment = await prisma.assignment.create({
      data: {
        allocationId: allocation.id,
        volunteerUserId: chosenVolunteer.id,
        status: "OFFERED",
        isCurrent: true,
        offerExpiresAt,
        notes: `Backup assignment offer triggered by: ${triggerReason}`,
      },
    });

    // Create pending AssignmentOffer
    await prisma.assignmentOffer.create({
      data: {
        assignmentId: newAssignment.id,
        volunteerUserId: chosenVolunteer.id,
        status: "PENDING",
        expiresAt: offerExpiresAt,
      },
    });

    await prisma.allocation.update({
      where: { id: allocation.id },
      data: { status: "AWAITING_VOLUNTEER" },
    });

    // Notify chosen volunteer
    await prisma.notification.create({
      data: {
        userId: chosenVolunteer.id,
        title: "New Volunteer Pickup Offer",
        message: `You have been offered a pickup of ${allocation.allocatedQuantity} ${allocation.unit} from ${allocation.donation.pickupAddress}.`,
        type: "OFFER",
        simulatedChannel: "IN_APP",
        metadata: JSON.stringify({
          assignmentId: newAssignment.id,
          allocationId: allocation.id,
        }),
      },
    });

    // Notify donor and NGO about the replacement offer
    await prisma.notification.create({
      data: {
        userId: allocation.donation.createdByUserId,
        title: "Backup Volunteer Dispatched",
        message: `A backup volunteer offer was sent to ${chosenVolunteer.name} for your donation pickup.`,
        type: "INFO",
        simulatedChannel: "IN_APP",
      },
    });

    await prisma.auditEvent.create({
      data: {
        actorUserId: chosenVolunteer.id,
        action: "BACKUP_VOLUNTEER_OFFERED",
        entityType: "Assignment",
        entityId: newAssignment.id,
        reason: triggerReason,
        details: JSON.stringify({
          allocationId: allocation.id,
          volunteerUserId: chosenVolunteer.id,
          offerExpiresAt,
        }),
      },
    });

    return true;
  }

  /**
   * Allows an assigned volunteer to cancel their assignment before collection.
   * Preserves previous assignment history and immediately triggers backup evaluation.
   */
  static async cancelAssignmentByVolunteer(
    assignmentId: string,
    reason: string,
    volunteerUserId: string
  ): Promise<boolean> {
    if (!reason || reason.trim().length < 5) {
      throw new Error("A cancellation reason of at least 5 characters is required.");
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        allocation: true,
      },
    });

    if (!assignment) {
      throw new Error("Assignment not found.");
    }

    if (assignment.volunteerUserId !== volunteerUserId) {
      throw new Error("UNAUTHORIZED: Cannot cancel another volunteer's assignment.");
    }

    if (assignment.status === "COLLECTED" || assignment.status === "COMPLETED") {
      throw new Error(
        "FORBIDDEN: Cannot cancel assignment after food has been collected. Please report an incident to admin."
      );
    }
    if (!assignment.isCurrent) {
      throw new Error("INVALID_STATE: Cannot cancel an archived assignment.");
    }
    assertAssignmentTransition(assignment.status, "CANCELLED");

    // Preserve history and mark current assignment cancelled
    await prisma.assignment.update({
      where: { id: assignment.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: reason,
        isCurrent: false,
      },
    });

    await prisma.auditEvent.create({
      data: {
        actorUserId: volunteerUserId,
        action: "VOLUNTEER_CANCELLED_ASSIGNMENT",
        entityType: "Assignment",
        entityId: assignment.id,
        reason,
        details: JSON.stringify({
          allocationId: assignment.allocationId,
        }),
      },
    });

    // Re-evaluate backup volunteers immediately
    return await this.findAndAssignBackupVolunteer(
      assignment.allocationId,
      `Volunteer cancellation: ${reason}`
    );
  }
}
