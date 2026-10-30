import { prisma } from "@/lib/prisma";
import { mapAdapter } from "@/lib/maps/adapter";
import {
  MatchingEvaluation,
  MatchingResultCandidate,
  QuantityUnitType,
} from "@/lib/types/domain";

export interface DonationMatchingContext {
  id: string;
  donorOrgId: string;
  title: string;
  foodCategory: string;
  quantity: number;
  unit: QuantityUnitType;
  latitude: number;
  longitude: number;
  pickupWindowStart: Date;
  pickupWindowEnd: Date;
}

export function isTimeWithinOperatingHours(
  time: Date,
  hoursStart: string, // "08:00"
  hoursEnd: string    // "22:00"
): boolean {
  // Convert time to Asia/Kolkata hours and minutes
  const timeStr = time.toLocaleTimeString("en-US", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
  return timeStr >= hoursStart && timeStr <= hoursEnd;
}

export async function matchDonationAgainstNGOs(
  donation: DonationMatchingContext
): Promise<MatchingEvaluation> {
  // 1. Fetch all candidate NGOs with active status
  const ngos = await prisma.organisation.findMany({
    where: {
      type: "NGO",
    },
    include: {
      capacityWindows: {
        where: {
          startTime: { lte: donation.pickupWindowEnd },
          endTime: { gte: donation.pickupWindowStart },
          unit: donation.unit,
        },
      },
      verifications: {
        where: { verificationStatus: "APPROVED" },
        take: 1,
      },
    },
  });

  const eligibleCandidates: MatchingResultCandidate[] = [];
  const ineligibleCandidates: MatchingResultCandidate[] = [];

  for (const ngo of ngos) {
    const reasons: string[] = [];
    let isEligible = true;

    // Hard Check 1: NGO is approved and active
    if (ngo.isSuspended) {
      isEligible = false;
      reasons.push(`NGO is currently suspended (${ngo.suspensionReason || "administrative hold"}).`);
    }

    if (!ngo.isVerified && ngo.verifications.length === 0) {
      isEligible = false;
      reasons.push("NGO verification is pending approval.");
    }

    // Hard Check 2: NGO accepts declared food category
    let acceptedCategories: string[] = [];
    try {
      acceptedCategories = JSON.parse(ngo.acceptedCategories);
    } catch {
      acceptedCategories = [];
    }

    if (!acceptedCategories.includes(donation.foodCategory)) {
      isEligible = false;
      reasons.push(
        `NGO does not accept category '${donation.foodCategory}'. (Accepts: ${
          acceptedCategories.join(", ") || "None specified"
        })`
      );
    }

    // Hard Check 3: NGO operating hours compatibility
    const startInRange = isTimeWithinOperatingHours(
      donation.pickupWindowStart,
      ngo.operatingHoursStart,
      ngo.operatingHoursEnd
    );
    const endInRange = isTimeWithinOperatingHours(
      donation.pickupWindowEnd,
      ngo.operatingHoursStart,
      ngo.operatingHoursEnd
    );

    if (!startInRange && !endInRange) {
      isEligible = false;
      reasons.push(
        `Operating hours (${ngo.operatingHoursStart} - ${ngo.operatingHoursEnd} IST) do not cover pickup window.`
      );
    }

    // Hard Check 4: Location within permitted collection radius
    const distanceKm = mapAdapter.calculateDistance(
      { latitude: donation.latitude, longitude: donation.longitude },
      { latitude: ngo.latitude, longitude: ngo.longitude }
    );

    if (distanceKm > ngo.collectionRadiusKm) {
      isEligible = false;
      reasons.push(
        `Distance (${distanceKm} km) exceeds NGO's permitted collection radius (${ngo.collectionRadiusKm} km).`
      );
    }

    // Hard Check 5: Capacity window check
    // "Do not treat missing capacity information as unlimited capacity."
    let totalAvailableCapacity = 0;
    if (ngo.capacityWindows.length === 0) {
      isEligible = false;
      reasons.push(
        `No declared capacity window found for unit '${donation.unit}' during this collection window. (Missing capacity is never treated as unlimited).`
      );
    } else {
      // Calculate remaining available capacity
      totalAvailableCapacity = ngo.capacityWindows.reduce((acc, cw) => {
        const available = Math.max(0, cw.maxCapacity - cw.reservedCapacity);
        return acc + available;
      }, 0);

      if (totalAvailableCapacity <= 0) {
        isEligible = false;
        reasons.push(
          `Declared capacity for ${donation.unit} is fully reserved in this window.`
        );
      }
    }

    // Hard Check 6: Feasibility before deadline
    const routeEstimate = await mapAdapter.getRouteEstimate(
      { latitude: donation.latitude, longitude: donation.longitude },
      { latitude: ngo.latitude, longitude: ngo.longitude }
    );

    const travelTimeMs = routeEstimate.estimatedMinutes * 60 * 1000;
    const now = new Date();
    if (new Date(now.getTime() + travelTimeMs) > donation.pickupWindowEnd) {
      isEligible = false;
      reasons.push(
        `Estimated travel time (${routeEstimate.estimatedMinutes} mins) exceeds the donor's collection deadline.`
      );
    }

    // Deterministic ranking score:
    // Factors:
    // - Distance proximity (closer is better, max 50 points)
    // - Capacity fit: can take full quantity or significant chunk (max 30 points)
    // - Travel efficiency (max 20 points)
    let score = 0;
    if (isEligible) {
      const distanceScore = Math.max(0, 50 - distanceKm * 2);
      const capacityRatio = Math.min(1, totalAvailableCapacity / donation.quantity);
      const capacityScore = capacityRatio * 30;
      const travelScore = Math.max(0, 20 - routeEstimate.estimatedMinutes * 0.5);
      score = Math.round((distanceScore + capacityScore + travelScore) * 10) / 10;
    }

    const explanation = isEligible
      ? `${ngo.name} can accept up to ${totalAvailableCapacity} ${donation.unit}, operates between ${ngo.operatingHoursStart}-${ngo.operatingHoursEnd} IST, and is within ${distanceKm} km.`
      : `${ngo.name} is ineligible: ${reasons.join(" ")}`;

    const candidate: MatchingResultCandidate = {
      ngoId: ngo.id,
      ngoName: ngo.name,
      distanceKm,
      travelTimeMinutes: routeEstimate.estimatedMinutes,
      availableCapacity: totalAvailableCapacity,
      capacityUnit: donation.unit,
      eligible: isEligible,
      score,
      reasons,
      explanation,
    };

    if (isEligible) {
      eligibleCandidates.push(candidate);
    } else {
      ineligibleCandidates.push(candidate);
    }
  }

  // Rank eligible candidates strictly by score descending
  eligibleCandidates.sort((a, b) => b.score - a.score);

  return {
    donationId: donation.id,
    itemQuantity: donation.quantity,
    itemUnit: donation.unit,
    evaluatedNgoCount: ngos.length,
    eligibleCandidates,
    ineligibleCandidates,
    summary:
      eligibleCandidates.length > 0
        ? `Found ${eligibleCandidates.length} eligible NGO(s) ranked by travel proximity, capacity fit, and operating hours.`
        : "No eligible NGOs found matching all capacity, radius, operating hours, and category constraints.",
  };
}

