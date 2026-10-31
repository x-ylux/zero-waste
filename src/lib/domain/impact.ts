import { IMPACT_CONFIG } from "@/lib/config/impact";
import type { Donation, QuantityUnit } from "@/lib/domain/types";

export interface ImpactTotals {
  listedByUnit: Record<QuantityUnit, number>;
  collectedByUnit: Record<QuantityUnit, number>;
  acceptedByUnit: Record<QuantityUnit, number>;
  animalAcceptedByUnit: Record<QuantityUnit, number>;
  completedDeliveries: number;
  animalShelterDeliveries: number;
  estimatedMealEquivalents: number;
  estimatedAvoidedCo2eKg: number;
  label: string;
  assumptions: readonly string[];
  sources: string;
}

function emptyUnits(): Record<QuantityUnit, number> {
  return { servings: 0, kg: 0, packets: 0, boxes: 0 };
}

export function addUnit(target: Record<QuantityUnit, number>, unit: QuantityUnit, amount: number): void {
  target[unit] += amount;
}

export function mealEquivalents(acceptedByUnit: Record<QuantityUnit, number>): number {
  let meals = 0;
  (Object.keys(acceptedByUnit) as QuantityUnit[]).forEach((unit) => {
    meals += acceptedByUnit[unit] * IMPACT_CONFIG.mealEquivalents[unit];
  });
  return meals;
}

export function calculateImpact(donations: Donation[]): ImpactTotals {
  const listedByUnit = emptyUnits();
  const collectedByUnit = emptyUnits();
  const acceptedByUnit = emptyUnits();
  const animalAcceptedByUnit = emptyUnits();
  let completedDeliveries = 0;
  let animalShelterDeliveries = 0;

  for (const donation of donations) {
    addUnit(listedByUnit, donation.unit, donation.quantity);
    if (donation.status === "collected" || donation.status === "delivered") {
      addUnit(collectedByUnit, donation.unit, donation.quantity);
    }
    if (donation.status === "delivered" && typeof donation.acceptedQuantity === "number") {
      completedDeliveries += 1;
      if (donation.animalShelterOnly) {
        addUnit(animalAcceptedByUnit, donation.unit, donation.acceptedQuantity);
        animalShelterDeliveries += 1;
      } else {
        addUnit(acceptedByUnit, donation.unit, donation.acceptedQuantity);
      }
    }
  }

  const estimatedMealEquivalents = mealEquivalents(acceptedByUnit);
  const estimatedAvoidedCo2eKg = estimatedMealEquivalents * IMPACT_CONFIG.kgCo2ePerMealEquivalent;

  return {
    listedByUnit,
    collectedByUnit,
    acceptedByUnit,
    animalAcceptedByUnit,
    completedDeliveries,
    animalShelterDeliveries,
    estimatedMealEquivalents,
    estimatedAvoidedCo2eKg,
    label: IMPACT_CONFIG.label,
    assumptions: IMPACT_CONFIG.assumptions,
    sources: IMPACT_CONFIG.sources,
  };
}

export function failureSuggestions(counts: Record<string, number>): string[] {
  const suggestions: string[] = [];
  if ((counts.no_volunteer_available ?? 0) > 0) {
    suggestions.push("Recruit additional standby volunteers near dense donor clusters before peak meal times.");
  }
  if ((counts.pickup_window_missed ?? 0) > 0) {
    suggestions.push("Shorten listing-to-dispatch time and page standby volunteers 30 minutes before window close.");
  }
  if ((counts.handling_mismatch ?? 0) > 0) {
    suggestions.push("Prioritize NGOs whose cold-chain or hot-hold capacity matches the listing.");
  }
  if ((counts.packaging_unavailable ?? 0) > 0) {
    suggestions.push("Keep reusable crates at high-volume donor sites so food can leave on time.");
  }
  if ((counts.recipient_unavailable ?? 0) > 0 || (counts.recipient_rejection ?? 0) > 0) {
    suggestions.push("Confirm receiving hours and remaining capacity before reservation.");
  }
  if ((counts.donor_cancellation ?? 0) > 0) {
    suggestions.push("Ask donors to list only after surplus is confirmed plated or packed.");
  }
  if (suggestions.length === 0) {
    suggestions.push("No concentrated failure pattern yet. Keep matching windows tight and standby coverage on.");
  }
  return suggestions;
}
