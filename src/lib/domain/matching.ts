import { haversineKm } from "@/lib/domain/geo";
import type {
  DietaryTag,
  Donation,
  HandlingRequirement,
  MatchCandidate,
  MatchScoreBreakdown,
  NeedsRequest,
  NgoProfile,
  StorageType,
} from "@/lib/domain/types";
import { hoursOverlap, hoursSince } from "@/lib/domain/windows";

const STORAGE_RANK: Record<StorageType, number> = {
  ambient: 1,
  hot_hold: 2,
  refrigerated: 3,
  frozen: 4,
};

export function storageCompatible(required: StorageType, capabilities: StorageType[]): boolean {
  if (required === "hot_hold") return capabilities.includes("hot_hold");
  const need = STORAGE_RANK[required];
  return capabilities.some((cap) => STORAGE_RANK[cap] >= need && cap !== "hot_hold") || capabilities.includes(required);
}

export function handlingCompatible(
  required: HandlingRequirement[],
  capabilities: HandlingRequirement[]
): boolean {
  return required.every((item) => capabilities.includes(item));
}

export function dietaryCompatible(donationTags: DietaryTag[], ngoRequirements: DietaryTag[]): boolean {
  const tags = new Set(donationTags);
  for (const req of ngoRequirements) {
    if (req === "vegan" && !tags.has("vegan")) return false;
    if (req === "vegetarian" && !(tags.has("vegetarian") || tags.has("vegan") || tags.has("jain"))) return false;
    if (req === "jain" && !tags.has("jain")) return false;
    if (req === "halal" && !(tags.has("halal") || tags.has("vegetarian") || tags.has("vegan") || tags.has("jain"))) {
      return false;
    }
    if (req === "contains_meat" && !tags.has("contains_meat")) return false;
  }
  if (tags.has("contains_meat") && (ngoRequirements.includes("vegetarian") || ngoRequirements.includes("vegan") || ngoRequirements.includes("jain"))) {
    return false;
  }
  return true;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function rankEligible(breakdown: Omit<MatchScoreBreakdown, "total">): MatchScoreBreakdown {
  const total =
    40 * breakdown.distance +
    25 * breakdown.unmetDemand +
    20 * breakdown.recency +
    15 * breakdown.categoryRelevance;
  return { ...breakdown, total };
}

export function humanReason(candidate: {
  eligible: boolean;
  hardFailures: string[];
  unmetQuantity: number;
  distanceKm: number;
  storageOk: boolean;
  categoryOk: boolean;
}): string {
  if (!candidate.eligible) {
    return `Not eligible: ${candidate.hardFailures.join(" ")}`;
  }
  const parts: string[] = [];
  if (candidate.storageOk) parts.push("compatible storage");
  if (candidate.unmetQuantity > 0) parts.push("unmet demand");
  if (candidate.distanceKm <= 8) parts.push("nearby location");
  else parts.push("reachable location");
  if (candidate.categoryOk) parts.push("matching category");
  return `Recommended: ${parts.join(", ")}.`;
}

export function evaluateNgoMatch(
  donation: Donation,
  ngo: NgoProfile,
  needs: NeedsRequest | undefined,
  now: Date
): MatchCandidate {
  const requiredCategories = needs?.requiredCategories ?? ngo.acceptedCategories;
  const dietary = needs?.dietaryRequirements ?? ngo.dietaryRequirements;
  const storage = needs?.storageCapabilities ?? ngo.storageCapabilities;
  const handling = needs?.handlingCapabilities ?? ngo.handlingCapabilities;
  const receivingStart = needs?.receivingHoursStart ?? ngo.receivingHoursStart;
  const receivingEnd = needs?.receivingHoursEnd ?? ngo.receivingHoursEnd;
  const maxQty = needs?.maxAcceptableQuantity ?? ngo.maxAcceptableQuantity;
  const requested = needs?.requestedQuantity ?? ngo.maxAcceptableQuantity;
  const destination = needs?.deliveryAddress ?? ngo.location;

  const hardFailures: string[] = [];

  if (donation.status !== "available") {
    hardFailures.push("Donation is not active and available.");
  }
  const categoryOk = requiredCategories.includes(donation.category);
  if (!categoryOk) {
    hardFailures.push("Recipient does not accept this food category.");
  }
  if (donation.quantity > maxQty) {
    hardFailures.push("Quantity exceeds the recipient maximum.");
  }
  if (!dietaryCompatible(donation.dietaryTags, dietary)) {
    hardFailures.push("Dietary restrictions are not compatible.");
  }
  const storageOk = storageCompatible(donation.storage, storage);
  if (!storageOk) {
    hardFailures.push("Storage capability cannot meet handling needs.");
  }
  if (!handlingCompatible(donation.handlingRequirements, handling)) {
    hardFailures.push("Handling requirements cannot be met.");
  }
  if (!hoursOverlap(donation.pickupWindowStart, donation.pickupWindowEnd, receivingStart, receivingEnd)) {
    hardFailures.push("Receiving hours do not overlap the pickup window.");
  }

  const distanceKm = haversineKm(donation.pickupLocation, destination);
  const hours = hoursSince(ngo.lastCompletedDonationAt, now);
  const unmet = Math.max(0, requested);

  const eligible = hardFailures.length === 0;
  const distanceScore = clamp01(1 - distanceKm / 20);
  const unmetScore = clamp01(unmet / Math.max(requested, 1));
  const recencyScore = hours === null ? 1 : clamp01(hours / 168);
  const categoryScore = categoryOk ? 1 : 0;

  const score = eligible
    ? rankEligible({
        distance: distanceScore,
        unmetDemand: unmetScore,
        recency: recencyScore,
        categoryRelevance: categoryScore,
      })
    : null;

  return {
    ngoId: ngo.id,
    ngoName: ngo.name,
    eligible,
    hardFailures,
    score,
    distanceKm,
    unmetQuantity: unmet,
    hoursSinceLastCompleted: hours,
    reason: humanReason({
      eligible,
      hardFailures,
      unmetQuantity: unmet,
      distanceKm,
      storageOk,
      categoryOk,
    }),
  };
}

export function matchDonationToNgos(
  donation: Donation,
  ngos: NgoProfile[],
  needs: NeedsRequest[],
  now: Date = new Date()
): MatchCandidate[] {
  const results = ngos.map((ngo) =>
    evaluateNgoMatch(
      donation,
      ngo,
      needs.find((item) => item.ngoId === ngo.id),
      now
    )
  );
  return results.sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    return (b.score?.total ?? 0) - (a.score?.total ?? 0);
  });
}
