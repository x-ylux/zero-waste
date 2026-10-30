import { prisma } from "@/lib/prisma";
import { ImpactMetrics } from "@/lib/types/domain";

export async function calculateImpactMetrics(donorOrgId?: string): Promise<ImpactMetrics> {
  // Query all donation items with their actual recorded quantities
  const items = await prisma.donationItem.findMany({
    where: donorOrgId
      ? { donation: { donorOrgId } }
      : undefined,
    include: {
      donation: true,
      allocations: {
        include: {
          handoverEvents: true,
          assignments: true,
        },
      },
    },
  });

  const totalListedQuantityByUnit: Record<string, number> = {};
  const totalAllocatedQuantityByUnit: Record<string, number> = {};
  const totalCollectedQuantityByUnit: Record<string, number> = {};
  const totalDeliveredAcceptedByUnit: Record<string, number> = {};
  const totalDeliveredRejectedByUnit: Record<string, number> = {};
  const totalUncollectedQuantityByUnit: Record<string, number> = {};

  for (const item of items) {
    const unit = item.unit;
    totalListedQuantityByUnit[unit] = (totalListedQuantityByUnit[unit] || 0) + item.quantity;
    totalAllocatedQuantityByUnit[unit] = (totalAllocatedQuantityByUnit[unit] || 0) + item.allocatedQuantity;
    totalCollectedQuantityByUnit[unit] = (totalCollectedQuantityByUnit[unit] || 0) + item.collectedQuantity;
    totalDeliveredAcceptedByUnit[unit] = (totalDeliveredAcceptedByUnit[unit] || 0) + item.deliveredQuantity;

    // Sum rejected quantity across allocations
    for (const alloc of item.allocations) {
      if (alloc.rejectedQuantity && alloc.rejectedQuantity > 0) {
        totalDeliveredRejectedByUnit[unit] =
          (totalDeliveredRejectedByUnit[unit] || 0) + alloc.rejectedQuantity;
      }
    }

    // Uncollected is quantity listed minus collected quantity
    const uncollected = Math.max(0, item.quantity - item.collectedQuantity);
    totalUncollectedQuantityByUnit[unit] =
      (totalUncollectedQuantityByUnit[unit] || 0) + uncollected;
  }

  // Completed donations count
  const completedDonationsCount = await prisma.donation.count({
    where: {
      ...(donorOrgId ? { donorOrgId } : {}),
      status: "CLOSED",
    },
  });

  // Failed assignments count (DECLINED, TIMED_OUT, CANCELLED, FAILED)
  const failedAssignmentsCount = await prisma.assignment.count({
    where: {
      status: { in: ["TIMED_OUT", "CANCELLED", "DECLINED", "FAILED"] },
      ...(donorOrgId ? { allocation: { donation: { donorOrgId } } } : {}),
    },
  });

  // Assignments recovered through backup:
  // Count allocations that have more than 1 assignment where the current one succeeded or is active
  const allocationsWithHistory = await prisma.allocation.findMany({
    where: donorOrgId ? { donation: { donorOrgId } } : undefined,
    include: {
      assignments: true,
    },
  });

  let assignmentsRecoveredThroughBackupCount = 0;
  for (const alloc of allocationsWithHistory) {
    if (alloc.assignments.length > 1) {
      const hasFailedBefore = alloc.assignments.some(
        (a) => a.status === "TIMED_OUT" || a.status === "CANCELLED" || a.status === "DECLINED"
      );
      const hasCurrentActiveOrCompleted = alloc.assignments.some(
        (a) => a.isCurrent && ["ACCEPTED", "COLLECTED", "COMPLETED"].includes(a.status)
      );
      if (hasFailedBefore && hasCurrentActiveOrCompleted) {
        assignmentsRecoveredThroughBackupCount++;
      }
    }
  }

  // Calculate median collection time:
  // time between donation creation / allocation acceptance and collection handover event
  const collectionEvents = await prisma.handoverEvent.findMany({
    where: {
      stage: "COLLECTION",
      ...(donorOrgId ? { allocation: { donation: { donorOrgId } } } : {}),
    },
    include: {
      allocation: true,
    },
  });

  const collectionDurationsMinutes: number[] = [];
  for (const ev of collectionEvents) {
    const start = new Date(ev.allocation.createdAt).getTime();
    const end = new Date(ev.timestamp).getTime();
    const durationMins = Math.max(1, Math.round((end - start) / (1000 * 60)));
    collectionDurationsMinutes.push(durationMins);
  }

  let medianCollectionTimeMinutes: number | null = null;
  if (collectionDurationsMinutes.length > 0) {
    collectionDurationsMinutes.sort((a, b) => a - b);
    const mid = Math.floor(collectionDurationsMinutes.length / 2);
    medianCollectionTimeMinutes =
      collectionDurationsMinutes.length % 2 !== 0
        ? collectionDurationsMinutes[mid]
        : Math.round(
            (collectionDurationsMinutes[mid - 1] + collectionDurationsMinutes[mid]) / 2
          );
  }

  // Pickup completion rate with explicit denominator:
  // Denominator: Total allocations that reached scheduled/assigned collection
  // Numerator: Allocations where status is COLLECTED, DELIVERED, or PARTIALLY_DELIVERED
  const relevantAllocations = await prisma.allocation.findMany({
    where: {
      ...(donorOrgId ? { donation: { donorOrgId } } : {}),
      status: {
        notIn: ["CANCELLED"],
      },
    },
  });

  const pickupCompletionRateDenominator = relevantAllocations.length;
  const completedAllocations = relevantAllocations.filter((a) =>
    ["COLLECTED", "DELIVERED", "PARTIALLY_DELIVERED"].includes(a.status)
  );
  const pickupCompletionRateNumerator = completedAllocations.length;

  const pickupCompletionRatePercent =
    pickupCompletionRateDenominator > 0
      ? Math.round(
          (pickupCompletionRateNumerator / pickupCompletionRateDenominator) * 1000
        ) / 10
      : null;

  // Emissions calculation: default to null ("Not calculated")
  const co2Enabled = process.env.CO2_FACTOR_ENABLED === "true";
  let co2AvoidedKg: number | null = null;
  let co2CalculationNotes =
    "Emissions: Not calculated (CO2 calculations require verified LCA emission factors and waste diversion assumptions).";

  if (co2Enabled) {
    const factorPerKg = parseFloat(process.env.CO2_FACTOR_PER_KG || "2.5");
    const source = process.env.CO2_FACTOR_SOURCE || "UN FAO Food Wastage Footprint Benchmark";
    const totalDeliveredKg = totalDeliveredAcceptedByUnit["KG"] || 0;
    co2AvoidedKg = Math.round(totalDeliveredKg * factorPerKg * 10) / 10;
    co2CalculationNotes = `Estimated ${co2AvoidedKg} kg CO2e avoided, based on ${totalDeliveredKg} kg food delivered successfully at ${factorPerKg} kg CO2e/kg (Source: ${source}). Note: Does not apply to portion-based meals without certified weight records.`;
  }

  return {
    totalListedQuantityByUnit,
    totalAllocatedQuantityByUnit,
    totalCollectedQuantityByUnit,
    totalDeliveredAcceptedByUnit,
    totalDeliveredRejectedByUnit,
    totalUncollectedQuantityByUnit,
    completedDonationsCount,
    failedAssignmentsCount,
    assignmentsRecoveredThroughBackupCount,
    medianCollectionTimeMinutes,
    pickupCompletionRatePercent,
    pickupCompletionRateDenominator,
    pickupCompletionRateNumerator,
    co2AvoidedKg,
    co2CalculationNotes,
  };
}
