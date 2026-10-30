import { prisma } from "@/lib/prisma";
import { QuantityUnitType } from "@/lib/types/domain";
import type { DonationMatchingContext } from "@/lib/matching/engine";

export interface MatchingCapacityWindow {
  unit: QuantityUnitType;
  maxCapacity: number;
  reservedCapacity: number;
}

export interface MatchingOrganization {
  id: string;
  name: string;
  isVerified: boolean;
  isSuspended: boolean;
  suspensionReason: string | null;
  acceptedCategories: string;
  operatingHoursStart: string;
  operatingHoursEnd: string;
  collectionRadiusKm: number;
  latitude: number;
  longitude: number;
  hasApprovedVerification: boolean;
  capacityWindows: MatchingCapacityWindow[];
}

export interface MatchingRepository {
  findCandidates(donation: DonationMatchingContext): Promise<MatchingOrganization[]>;
}

export class PrismaMatchingRepository implements MatchingRepository {
  async findCandidates(donation: DonationMatchingContext): Promise<MatchingOrganization[]> {
    const organisations = await prisma.organisation.findMany({
      where: { type: "NGO" },
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

    return organisations.map((organisation) => ({
      id: organisation.id,
      name: organisation.name,
      isVerified: organisation.isVerified,
      isSuspended: organisation.isSuspended,
      suspensionReason: organisation.suspensionReason,
      acceptedCategories: organisation.acceptedCategories,
      operatingHoursStart: organisation.operatingHoursStart,
      operatingHoursEnd: organisation.operatingHoursEnd,
      collectionRadiusKm: organisation.collectionRadiusKm,
      latitude: organisation.latitude,
      longitude: organisation.longitude,
      hasApprovedVerification: organisation.verifications.length > 0,
      capacityWindows: organisation.capacityWindows.map((window) => ({
        unit: window.unit,
        maxCapacity: window.maxCapacity,
        reservedCapacity: window.reservedCapacity,
      })),
    }));
  }
}

export class MockMatchingRepository implements MatchingRepository {
  constructor(private readonly organisations: MatchingOrganization[]) {}

  async findCandidates(): Promise<MatchingOrganization[]> {
    return this.organisations;
  }
}
