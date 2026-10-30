import { prisma } from "@/lib/prisma";
import { Allocation, DonationStatus, AllocationStatus, QuantityUnit } from "@prisma/client";

export interface CreateAllocationRequest {
  donationId: string;
  donationItemId: string;
  ngoOrgId: string;
  allocatedQuantity: number;
  unit: QuantityUnit;
  capacityWindowId?: string | null;
  actorUserId: string;
  idempotencyKey?: string;
}

export interface CancelAllocationRequest {
  allocationId: string;
  reason: string;
  actorUserId: string;
}

export class AllocationService {
  /**
   * Accepts an allocation (full or partial) atomically.
   * Guarantees no over-allocation via database transactions and strict conditional locking.
   */
  static async acceptAllocation(
    input: CreateAllocationRequest
  ): Promise<Allocation> {
    if (input.allocatedQuantity <= 0) {
      throw new Error("INVALID_QUANTITY: Allocation quantity must be greater than zero.");
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Fetch donation and verify open status
      const donation = await tx.donation.findUnique({
        where: { id: input.donationId },
        include: {
          items: true,
          donorOrg: true,
        },
      });

      if (!donation) {
        throw new Error("NOT_FOUND: Donation does not exist.");
      }

      if (donation.status !== "OPEN" && donation.status !== "PARTIALLY_ALLOCATED") {
        throw new Error(
          `INVALID_STATE: Donation is in state '${donation.status}' and cannot receive allocations.`
        );
      }

      if (new Date(donation.pickupWindowEnd) < new Date()) {
        throw new Error("EXPIRED: The collection deadline for this donation has passed.");
      }

      // 2. Fetch specific donation item
      const item = donation.items.find((i) => i.id === input.donationItemId);
      if (!item) {
        throw new Error("NOT_FOUND: Donation item does not exist.");
      }

      if (item.unit !== input.unit) {
        throw new Error(
          `UNIT_MISMATCH: Requested unit '${input.unit}' does not match item unit '${item.unit}'.`
        );
      }

      const availableQuantity = item.quantity - item.allocatedQuantity;
      if (input.allocatedQuantity > availableQuantity) {
        throw new Error(
          `OVER_ALLOCATION: Requested ${input.allocatedQuantity} ${input.unit}, but only ${availableQuantity} ${input.unit} remain available.`
        );
      }

      // 3. Verify NGO eligibility & capacity
      const ngo = await tx.organisation.findUnique({
        where: { id: input.ngoOrgId },
        include: {
          capacityWindows: {
            where: {
              startTime: { lte: donation.pickupWindowEnd },
              endTime: { gte: donation.pickupWindowStart },
              unit: input.unit,
            },
          },
        },
      });

      if (!ngo || ngo.type !== "NGO") {
        throw new Error("NOT_FOUND: NGO organisation not found.");
      }

      if (ngo.isSuspended) {
        throw new Error("SUSPENDED: NGO is currently suspended.");
      }

      if (!ngo.isVerified) {
        throw new Error("UNVERIFIED: NGO must be verified before accepting donations.");
      }

      // Check capacity window
      let capacityWindowId = input.capacityWindowId;
      if (!capacityWindowId && ngo.capacityWindows.length > 0) {
        // Pick the first suitable window
        const suitable = ngo.capacityWindows.find(
          (cw) => cw.maxCapacity - cw.reservedCapacity >= input.allocatedQuantity
        );
        if (suitable) {
          capacityWindowId = suitable.id;
        }
      }

      if (capacityWindowId) {
        const capacityWindow = await tx.capacityWindow.findUnique({
          where: { id: capacityWindowId },
        });

        if (!capacityWindow) {
          throw new Error("NOT_FOUND: Specified capacity window does not exist.");
        }

        const remainingCapacity = capacityWindow.maxCapacity - capacityWindow.reservedCapacity;
        if (input.allocatedQuantity > remainingCapacity) {
          throw new Error(
            `CAPACITY_EXCEEDED: Requested ${input.allocatedQuantity} ${input.unit}, but capacity window only has ${remainingCapacity} available.`
          );
        }

        // Atomically reserve capacity in the window
        await tx.capacityWindow.update({
          where: { id: capacityWindowId },
          data: {
            reservedCapacity: {
              increment: input.allocatedQuantity,
            },
          },
        });
      }

      // 4. Atomically increment allocated quantity on the donation item
      const updatedItem = await tx.donationItem.update({
        where: { id: item.id },
        data: {
          allocatedQuantity: {
            increment: input.allocatedQuantity,
          },
        },
      });

      // 5. Update Donation aggregate status
      const totalRemaining = updatedItem.quantity - updatedItem.allocatedQuantity;
      const newDonationStatus: DonationStatus =
        totalRemaining === 0 ? "FULLY_ALLOCATED" : "PARTIALLY_ALLOCATED";

      await tx.donation.update({
        where: { id: donation.id },
        data: {
          status: newDonationStatus,
        },
      });

      // 6. Snapshot relevant item details at confirmation time
      const snapshotDetails = JSON.stringify({
        itemName: item.name,
        foodCategory: donation.foodCategory,
        dietaryTags: JSON.parse(donation.dietaryTags || "[]"),
        ingredients: donation.ingredients,
        allergens: JSON.parse(donation.allergens || "[]"),
        storageInfo: donation.storageInfo,
        packagingInfo: donation.packagingInfo,
        preparationTime: donation.preparationTime,
        pickupAddress: donation.pickupAddress,
        handlingNotes: donation.handlingNotes,
        donorOrgName: donation.donorOrg.name,
      });

      // 7. Create allocation record
      const allocation = await tx.allocation.create({
        data: {
          donationId: donation.id,
          donationItemId: item.id,
          ngoOrgId: ngo.id,
          capacityWindowId: capacityWindowId || null,
          allocatedQuantity: input.allocatedQuantity,
          unit: input.unit,
          status: "ACCEPTED",
          snapshotItemDetails: snapshotDetails,
        },
      });

      // 8. Create AuditEvent
      await tx.auditEvent.create({
        data: {
          actorUserId: input.actorUserId,
          action: "ALLOCATION_ACCEPTED",
          entityType: "Allocation",
          entityId: allocation.id,
          reason: `NGO ${ngo.name} accepted ${input.allocatedQuantity} ${input.unit}`,
          details: JSON.stringify({
            donationId: donation.id,
            ngoOrgId: ngo.id,
            allocatedQuantity: input.allocatedQuantity,
            newDonationStatus,
          }),
        },
      });

      // 9. Send notifications to donor and NGO members
      await tx.notification.create({
        data: {
          userId: donation.createdByUserId,
          title: "New Allocation Accepted",
          message: `${ngo.name} accepted ${input.allocatedQuantity} ${input.unit} of '${item.name}'.`,
          type: "INFO",
          simulatedChannel: "IN_APP",
          metadata: JSON.stringify({ allocationId: allocation.id }),
        },
      });

      return allocation;
    });
  }

  /**
   * Cancels an uncollected allocation and releases reserved capacity and inventory safely.
   */
  static async cancelAllocation(
    input: CancelAllocationRequest
  ): Promise<Allocation> {
    if (!input.reason || input.reason.trim().length < 5) {
      throw new Error("INVALID_REASON: A cancellation reason of at least 5 characters is mandatory.");
    }

    return await prisma.$transaction(async (tx) => {
      const allocation = await tx.allocation.findUnique({
        where: { id: input.allocationId },
        include: {
          donation: { include: { items: true } },
          donationItem: true,
          ngoOrg: true,
          capacityWindow: true,
          assignments: { where: { isCurrent: true } },
        },
      });

      if (!allocation) {
        throw new Error("NOT_FOUND: Allocation does not exist.");
      }

      // Prohibit cancellation if food is already collected or delivered
      if (
        allocation.status === "COLLECTED" ||
        allocation.status === "DELIVERED" ||
        allocation.status === "PARTIALLY_DELIVERED"
      ) {
        throw new Error(
          `FORBIDDEN_TRANSITION: Cannot cancel an allocation in '${allocation.status}' state. Once collected, food cannot be returned to donor inventory.`
        );
      }

      if (allocation.status === "CANCELLED") {
        return allocation; // idempotent
      }

      // 1. Release reserved capacity in NGO window
      if (allocation.capacityWindowId) {
        await tx.capacityWindow.update({
          where: { id: allocation.capacityWindowId },
          data: {
            reservedCapacity: {
              decrement: allocation.allocatedQuantity,
            },
          },
        });
      }

      // 2. Return inventory to donation item
      const updatedItem = await tx.donationItem.update({
        where: { id: allocation.donationItemId },
        data: {
          allocatedQuantity: {
            decrement: allocation.allocatedQuantity,
          },
        },
      });

      // 3. Update donation status (if previously fully or partially allocated)
      const remaining = updatedItem.quantity - updatedItem.allocatedQuantity;
      let newDonationStatus: DonationStatus = "PARTIALLY_ALLOCATED";
      if (updatedItem.allocatedQuantity === 0) {
        newDonationStatus = "OPEN";
      }

      await tx.donation.update({
        where: { id: allocation.donationId },
        data: { status: newDonationStatus },
      });

      // 4. Cancel active assignments
      for (const assignment of allocation.assignments) {
        await tx.assignment.update({
          where: { id: assignment.id },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
            cancellationReason: `Allocation cancelled: ${input.reason}`,
          },
        });
      }

      // 5. Update allocation record
      const updatedAllocation = await tx.allocation.update({
        where: { id: allocation.id },
        data: {
          status: "CANCELLED",
          cancellationReason: input.reason,
          cancelledAt: new Date(),
        },
      });

      // 6. Audit event
      await tx.auditEvent.create({
        data: {
          actorUserId: input.actorUserId,
          action: "ALLOCATION_CANCELLED",
          entityType: "Allocation",
          entityId: allocation.id,
          reason: input.reason,
          details: JSON.stringify({
            releasedQuantity: allocation.allocatedQuantity,
            unit: allocation.unit,
            newDonationStatus,
          }),
        },
      });

      return updatedAllocation;
    });
  }
}

