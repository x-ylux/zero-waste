export type UserRole = "DONOR" | "NGO" | "VOLUNTEER" | "ADMIN";

export type FoodCategoryType =
  | "COOKED_MEALS"
  | "PACKAGED_FOOD"
  | "RAW_PRODUCE"
  | "BAKERY"
  | "BEVERAGES"
  | "DAIRY"
  | "OTHER";

export type QuantityUnitType = "SERVINGS" | "KG" | "PACKETS" | "BOXES";

export type StorageInfoType = "AMBIENT" | "REFRIGERATED" | "HOT_HOLD" | "FROZEN";

export type PackagingInfoType =
  | "SEALED_CONTAINERS"
  | "FOIL_WRAPPED"
  | "BULK_VESSELS"
  | "PACKETED"
  | "BOXED"
  | "OTHER";

export type DonationStatusType =
  | "DRAFT"
  | "OPEN"
  | "PARTIALLY_ALLOCATED"
  | "FULLY_ALLOCATED"
  | "CLOSED"
  | "CANCELLED"
  | "EXPIRED";

export type AllocationStatusType =
  | "ACCEPTED"
  | "AWAITING_VOLUNTEER"
  | "ASSIGNED"
  | "COLLECTED"
  | "DELIVERED"
  | "PARTIALLY_DELIVERED"
  | "REJECTED"
  | "CANCELLED"
  | "FAILED";

export type AssignmentStatusType =
  | "OFFERED"
  | "ACCEPTED"
  | "DECLINED"
  | "TIMED_OUT"
  | "CANCELLED"
  | "COLLECTED"
  | "COMPLETED"
  | "FAILED";

export type OfferStatusType = "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";

export type HandoverStageType = "COLLECTION" | "DELIVERY";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isSuspended: boolean;
  organisationId?: string | null;
  organisationName?: string | null;
  organisationType?: "DONOR" | "NGO" | null;
  organisationRole?: string | null;
  volunteerProfileId?: string | null;
}

export interface MatchingResultCandidate {
  ngoId: string;
  ngoName: string;
  distanceKm: number;
  travelTimeMinutes: number;
  availableCapacity: number;
  capacityUnit: QuantityUnitType;
  eligible: boolean;
  score: number;
  reasons: string[];
  explanation: string;
}

export interface MatchingEvaluation {
  donationId: string;
  itemQuantity: number;
  itemUnit: QuantityUnitType;
  evaluatedNgoCount: number;
  eligibleCandidates: MatchingResultCandidate[];
  ineligibleCandidates: MatchingResultCandidate[];
  summary: string;
}

export interface ImpactMetrics {
  totalListedQuantityByUnit: Record<string, number>;
  totalAllocatedQuantityByUnit: Record<string, number>;
  totalCollectedQuantityByUnit: Record<string, number>;
  totalDeliveredAcceptedByUnit: Record<string, number>;
  totalDeliveredRejectedByUnit: Record<string, number>;
  totalUncollectedQuantityByUnit: Record<string, number>;
  completedDonationsCount: number;
  failedAssignmentsCount: number;
  assignmentsRecoveredThroughBackupCount: number;
  medianCollectionTimeMinutes: number | null;
  pickupCompletionRatePercent: number | null;
  pickupCompletionRateDenominator: number;
  pickupCompletionRateNumerator: number;
  co2AvoidedKg: number | null;
  co2CalculationNotes: string;
}
