import { describe, expect, it } from "vitest";
import {
  DonationMatchingContext,
  isTimeWithinOperatingHours,
  matchDonationAgainstNGOs,
} from "@/lib/matching/engine";
import {
  MatchingOrganization,
  MockMatchingRepository,
} from "@/lib/matching/repository";
import { calculateHaversineDistanceKm } from "@/lib/maps/adapter";

const now = new Date();
const donation: DonationMatchingContext = {
  id: "donation-test",
  donorOrgId: "donor-test",
  title: "Fresh meal portions",
  foodCategory: "COOKED_MEALS",
  quantity: 50,
  unit: "SERVINGS",
  latitude: 12.9345,
  longitude: 77.6265,
  pickupWindowStart: new Date(now.getTime() + 5 * 60_000),
  pickupWindowEnd: new Date(now.getTime() + 90 * 60_000),
};

function ngo(overrides: Partial<MatchingOrganization> = {}): MatchingOrganization {
  return {
    id: "ngo-nearby",
    name: "Nearby Community Kitchen",
    isVerified: true,
    isSuspended: false,
    suspensionReason: null,
    acceptedCategories: JSON.stringify(["COOKED_MEALS"]),
    operatingHoursStart: "00:00",
    operatingHoursEnd: "23:59",
    collectionRadiusKm: 15,
    latitude: 12.9392,
    longitude: 77.6258,
    hasApprovedVerification: false,
    capacityWindows: [{ unit: "SERVINGS", maxCapacity: 80, reservedCapacity: 10 }],
    ...overrides,
  };
}

describe("Matching and eligibility", () => {
  it("calculates accurate Haversine distance in kilometers", () => {
    const distance = calculateHaversineDistanceKm(
      { latitude: 12.9345, longitude: 77.6265 },
      { latitude: 12.9719, longitude: 77.6412 }
    );
    expect(distance).toBeGreaterThan(3.5);
    expect(distance).toBeLessThan(5.5);
  });

  it("evaluates operating hours in Asia/Kolkata, including overnight hours", () => {
    expect(isTimeWithinOperatingHours(new Date("2026-10-30T14:00:00Z"), "08:00", "22:00")).toBe(true);
    expect(isTimeWithinOperatingHours(new Date("2026-10-30T14:00:00Z"), "08:00", "18:00")).toBe(false);
    expect(isTimeWithinOperatingHours(new Date("2026-10-30T20:00:00Z"), "22:00", "06:00")).toBe(true);
  });

  it("ranks eligible organizations and explains category, capacity, verification, and distance exclusions", async () => {
    const repository = new MockMatchingRepository([
      ngo(),
      ngo({
        id: "ngo-no-capacity",
        name: "No Capacity",
        capacityWindows: [],
      }),
      ngo({
        id: "ngo-wrong-food",
        name: "Produce Pantry",
        acceptedCategories: JSON.stringify(["RAW_PRODUCE"]),
      }),
      ngo({
        id: "ngo-out-of-range",
        name: "Distant Shelter",
        latitude: 13.15,
        longitude: 77.85,
        collectionRadiusKm: 2,
      }),
      ngo({
        id: "ngo-unverified",
        name: "Unverified Shelter",
        isVerified: false,
        hasApprovedVerification: false,
      }),
    ]);

    const result = await matchDonationAgainstNGOs(donation, repository);

    expect(result.eligibleCandidates.map((candidate) => candidate.ngoId)).toEqual(["ngo-nearby"]);
    expect(result.eligibleCandidates[0].availableCapacity).toBe(70);
    expect(result.eligibleCandidates[0].score).toBeGreaterThan(0);
    expect(result.ineligibleCandidates).toHaveLength(4);
    expect(result.ineligibleCandidates.find((candidate) => candidate.ngoId === "ngo-no-capacity")?.reasons.join(" "))
      .toContain("Missing capacity is never treated as unlimited");
    expect(result.ineligibleCandidates.find((candidate) => candidate.ngoId === "ngo-wrong-food")?.reasons.join(" "))
      .toContain("does not accept category");
    expect(result.ineligibleCandidates.find((candidate) => candidate.ngoId === "ngo-out-of-range")?.reasons.join(" "))
      .toContain("exceeds NGO's permitted collection radius");
    expect(result.ineligibleCandidates.find((candidate) => candidate.ngoId === "ngo-unverified")?.reasons.join(" "))
      .toContain("verification is pending");
  });

  it("rejects expired pickup windows instead of presenting stale candidates as eligible", async () => {
    const expiredDonation = {
      ...donation,
      pickupWindowStart: new Date(now.getTime() - 2 * 60 * 60_000),
      pickupWindowEnd: new Date(now.getTime() - 60_000),
    };
    const result = await matchDonationAgainstNGOs(
      expiredDonation,
      new MockMatchingRepository([ngo()])
    );

    expect(result.eligibleCandidates).toHaveLength(0);
    expect(result.ineligibleCandidates[0].reasons.join(" ")).toContain("deadline has passed");
  });
});
