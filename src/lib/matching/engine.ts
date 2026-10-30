import { MatchingEvaluation, MatchingResultCandidate, QuantityUnitType } from "@/lib/types/domain";
import { mapAdapter } from "@/lib/maps/adapter";
import { MatchingRepository, PrismaMatchingRepository } from "@/lib/matching/repository";

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
  hoursStart: string,
  hoursEnd: string
): boolean {
  const timeStr = time.toLocaleTimeString("en-US", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

  return hoursStart <= hoursEnd
    ? timeStr >= hoursStart && timeStr <= hoursEnd
    : timeStr >= hoursStart || timeStr <= hoursEnd;
}

export async function matchDonationAgainstNGOs(
  donation: DonationMatchingContext,
  repository: MatchingRepository = new PrismaMatchingRepository()
): Promise<MatchingEvaluation> {
  const ngos = await repository.findCandidates(donation);
  const eligibleCandidates: MatchingResultCandidate[] = [];
  const ineligibleCandidates: MatchingResultCandidate[] = [];
  const now = new Date();

  for (const ngo of ngos) {
    const reasons: string[] = [];
    let eligible = true;
    const acceptedCategories = parseCategories(ngo.acceptedCategories);

    if (donation.pickupWindowEnd.getTime() <= now.getTime()) {
      eligible = false;
      reasons.push("The donor's collection deadline has passed.");
    }

    if (ngo.isSuspended) {
      eligible = false;
      reasons.push(`NGO is currently suspended (${ngo.suspensionReason || "administrative hold"}).`);
    }

    if (!ngo.isVerified && !ngo.hasApprovedVerification) {
      eligible = false;
      reasons.push("NGO verification is pending approval.");
    }

    if (!acceptedCategories.includes(donation.foodCategory)) {
      eligible = false;
      reasons.push(
        `NGO does not accept category '${donation.foodCategory}'. (Accepts: ${
          acceptedCategories.join(", ") || "None specified"
        })`
      );
    }

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
    if (!startInRange || !endInRange) {
      eligible = false;
      reasons.push(
        `Operating hours (${ngo.operatingHoursStart} - ${ngo.operatingHoursEnd} IST) do not cover pickup window.`
      );
    }

    const distanceKm = mapAdapter.calculateDistance(
      { latitude: donation.latitude, longitude: donation.longitude },
      { latitude: ngo.latitude, longitude: ngo.longitude }
    );
    if (distanceKm > ngo.collectionRadiusKm) {
      eligible = false;
      reasons.push(
        `Distance (${distanceKm} km) exceeds NGO's permitted collection radius (${ngo.collectionRadiusKm} km).`
      );
    }

    const capacityWindows = ngo.capacityWindows.filter(
      (window) => window.unit === donation.unit
    );
    const availableCapacity = capacityWindows.reduce(
      (total, window) => total + Math.max(0, window.maxCapacity - window.reservedCapacity),
      0
    );
    if (capacityWindows.length === 0) {
      eligible = false;
      reasons.push(
        `No declared capacity window found for unit '${donation.unit}' during this collection window. (Missing capacity is never treated as unlimited).`
      );
    } else if (availableCapacity <= 0) {
      eligible = false;
      reasons.push(`Declared capacity for ${donation.unit} is fully reserved in this window.`);
    }

    const routeEstimate = await mapAdapter.getRouteEstimate(
      { latitude: donation.latitude, longitude: donation.longitude },
      { latitude: ngo.latitude, longitude: ngo.longitude }
    );
    const feasiblePickupStart = Math.max(now.getTime(), donation.pickupWindowStart.getTime());
    if (feasiblePickupStart + routeEstimate.estimatedMinutes * 60_000 > donation.pickupWindowEnd.getTime()) {
      eligible = false;
      reasons.push(
        `Estimated travel time (${routeEstimate.estimatedMinutes} mins) exceeds the donor's collection deadline.`
      );
    }

    const score = eligible
      ? Math.round(
          (
            Math.max(0, 50 - distanceKm * 2) +
            Math.min(1, availableCapacity / donation.quantity) * 30 +
            Math.max(0, 20 - routeEstimate.estimatedMinutes * 0.5)
          ) * 10
        ) / 10
      : 0;
    const explanation = eligible
      ? `${ngo.name} can accept up to ${availableCapacity} ${donation.unit}, operates between ${ngo.operatingHoursStart}-${ngo.operatingHoursEnd} IST, and is within ${distanceKm} km.`
      : `${ngo.name} is ineligible: ${reasons.join(" ")}`;

    const candidate: MatchingResultCandidate = {
      ngoId: ngo.id,
      ngoName: ngo.name,
      distanceKm,
      travelTimeMinutes: routeEstimate.estimatedMinutes,
      availableCapacity,
      capacityUnit: donation.unit,
      eligible,
      score,
      reasons,
      explanation,
    };
    (eligible ? eligibleCandidates : ineligibleCandidates).push(candidate);
  }

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

function parseCategories(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((category) => typeof category === "string")
      ? parsed
      : [];
  } catch {
    return [];
  }
}
